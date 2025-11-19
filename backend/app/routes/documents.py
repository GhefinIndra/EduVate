from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, Form
from fastapi.responses import FileResponse
from psycopg2 import Error as PostgreSQLError
import uuid
import os
import shutil
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

from app.models.document import DocumentUploadResponse, DocumentInfo, DocumentListResponse, BatchUploadResponse, BatchUploadResult
from app.database import get_db, get_dict_cursor
from app.auth import get_current_user
from app.config import settings
from app.utils.pdf_parser import extract_text_from_pdf, get_pdf_metadata
from app.utils.chunker import chunk_pages
from app.utils.vector_store import add_document_chunks, delete_document_chunks
from app.utils.badge_checker import update_streak, check_and_unlock_badges
from app.utils.gcs_storage import upload_file_to_gcs, get_file_from_gcs, delete_file_from_gcs, sync_chromadb_to_gcs

router = APIRouter(prefix="/docs", tags=["Documents"])

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    subject_id: str = Form(...),
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Upload PDF document ke topik tertentu

    Steps:
    1. Validate PDF file & topik
    2. Save file
    3. Extract text & metadata
    4. Chunk text
    5. Add to ChromaDB
    6. Save to database
    """

    cursor = get_dict_cursor(db)

    # Validate topic exists & owned by user
    try:
        cursor.execute(
            "SELECT id FROM topics WHERE id = %s AND user_id = %s",
            (subject_id, user_id)
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topic not found"
            )
    finally:
        pass
    
    # 1. Validate file
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()  # Get position (= size)
    file.file.seek(0)  # Reset to start
    
    max_size_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB"
        )
    
    cursor = get_dict_cursor(db)
    doc_id = str(uuid.uuid4())

    # Save to local temp first for processing
    temp_file_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}.pdf")

    try:
        # 2. Save file temporarily for processing
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 3. Extract text & metadata
        try:
            metadata = get_pdf_metadata(temp_file_path)
            pages_data = extract_text_from_pdf(temp_file_path)
            total_pages = metadata['total_pages']
        except Exception as e:
            # Delete file if extraction fails
            os.remove(temp_file_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process PDF: {str(e)}"
            )

        # Upload to GCS
        try:
            gcs_blob_name = f"documents/{doc_id}.pdf"
            upload_file_to_gcs(temp_file_path, gcs_blob_name)
        except Exception as e:
            # Delete temp file if GCS upload fails
            os.remove(temp_file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload to cloud storage: {str(e)}"
            )
        
        # 4. Insert to database (status: processing)
        # Store GCS blob name in filename field
        insert_query = """
            INSERT INTO documents (id, owner_id, subject_id, title, filename, pages, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'processing')
        """
        cursor.execute(insert_query, (
            doc_id,
            user_id,
            subject_id,
            file.filename,
            gcs_blob_name,  # Store GCS blob name instead of local path
            total_pages
        ))
        db.commit()

        # Delete temp file after successful upload to GCS
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        
        # 5. Chunk text
        chunks = chunk_pages(pages_data, chunk_size=1000, overlap=200)

        # 6. Add to ChromaDB (with subject_id for multi-doc retrieval)
        total_chunks = add_document_chunks(doc_id, chunks, subject_id=subject_id)
        
        # 7. Update status to ready
        cursor.execute(
            "UPDATE documents SET status = 'ready' WHERE id = %s",
            (doc_id,)
        )
        db.commit()

        # Update streak & check badges
        update_streak(user_id, db)
        check_and_unlock_badges(user_id, db)

        # Backup ChromaDB to GCS after adding new document
        try:
            sync_chromadb_to_gcs(settings.CHROMA_PATH)
        except Exception as e:
            logger.error(f"Failed to backup ChromaDB to GCS: {str(e)}")

        return DocumentUploadResponse(
            doc_id=doc_id,
            title=file.filename,
            pages=total_pages,
            status="ready",
            message=f"Document uploaded successfully. {total_chunks} chunks indexed.",
            subject_id=subject_id
        )
        
    except PostgreSQLError as e:
        db.rollback()
        # Cleanup temp file and GCS
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        try:
            delete_file_from_gcs(gcs_blob_name)
        except:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        # Cleanup temp file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )
    finally:
        cursor.close()

@router.post("/upload-batch", response_model=BatchUploadResponse)
async def upload_multiple_documents(
    files: List[UploadFile] = File(...),
    subject_id: str = Form(...),
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Upload multiple PDF documents ke topik tertentu (sequential processing)

    Returns hasil untuk setiap file (success/failed) dengan detail error jika ada
    """

    cursor = get_dict_cursor(db)

    # Validate topic exists & owned by user
    try:
        cursor.execute(
            "SELECT id FROM topics WHERE id = %s AND user_id = %s",
            (subject_id, user_id)
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topic not found"
            )
    finally:
        cursor.close()

    results = []
    successful_count = 0
    failed_count = 0

    # Process each file sequentially
    for file in files:
        result = await _process_single_file(file, subject_id, user_id, db)
        results.append(result)

        if result.success:
            successful_count += 1
        else:
            failed_count += 1

    # Update streak & check badges (once after all uploads)
    if successful_count > 0:
        update_streak(user_id, db)
        check_and_unlock_badges(user_id, db)

    return BatchUploadResponse(
        results=results,
        total_files=len(files),
        successful=successful_count,
        failed=failed_count
    )

def _update_doc_progress(db, doc_id: str, progress: int, step: str):
    """
    Update document processing progress in database
    """
    cursor = db.cursor()
    try:
        cursor.execute(
            "UPDATE documents SET processing_progress = %s, processing_step = %s WHERE id = %s",
            (progress, step, doc_id)
        )
        db.commit()
    except Exception as e:
        logger.error(f"Failed to update progress for {doc_id}: {str(e)}")
    finally:
        cursor.close()

async def _process_single_file(
    file: UploadFile,
    subject_id: str,
    user_id: str,
    db
) -> BatchUploadResult:
    """
    Helper function to process a single file upload
    Returns BatchUploadResult with success/error info
    Tracks processing progress in real-time
    """

    # Validate file extension
    if not file.filename.endswith('.pdf'):
        return BatchUploadResult(
            filename=file.filename,
            success=False,
            error="Only PDF files are allowed",
            message=f"Failed: {file.filename} is not a PDF file"
        )

    # Check file size
    try:
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        max_size_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        if file_size > max_size_bytes:
            return BatchUploadResult(
                filename=file.filename,
                success=False,
                error=f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB",
                message=f"Failed: {file.filename} exceeds size limit"
            )
    except Exception as e:
        return BatchUploadResult(
            filename=file.filename,
            success=False,
            error=f"File validation error: {str(e)}",
            message=f"Failed: Could not validate {file.filename}"
        )

    cursor = get_dict_cursor(db)
    doc_id = str(uuid.uuid4())
    temp_file_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}.pdf")
    gcs_blob_name = f"documents/{doc_id}.pdf"

    try:
        # Insert document record first (processing status)
        cursor.execute(
            """INSERT INTO documents (id, owner_id, subject_id, title, filename, pages, status, processing_progress, processing_step)
               VALUES (%s, %s, %s, %s, %s, 0, 'processing', 0, 'Uploading file...')""",
            (doc_id, user_id, subject_id, file.filename, gcs_blob_name)
        )
        db.commit()
        
        # Progress: 10% - Saving file
        _update_doc_progress(db, doc_id, 10, "Saving file...")
        
        # Save file temporarily
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Progress: 25% - Parsing PDF
        _update_doc_progress(db, doc_id, 25, "Parsing PDF...")
        
        # Extract text & metadata
        try:
            metadata = get_pdf_metadata(temp_file_path)
            pages_data = extract_text_from_pdf(temp_file_path)
            total_pages = metadata['total_pages']
        except Exception as e:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            cursor.execute("UPDATE documents SET status = 'failed', processing_step = %s WHERE id = %s", 
                          (f"PDF parsing failed: {str(e)}", doc_id))
            db.commit()
            return BatchUploadResult(
                filename=file.filename,
                success=False,
                error=f"PDF processing error: {str(e)}",
                message=f"Failed: Could not process {file.filename}"
            )

        # Update pages count
        cursor.execute("UPDATE documents SET pages = %s WHERE id = %s", (total_pages, doc_id))
        db.commit()

        # Progress: 40% - Uploading to cloud
        _update_doc_progress(db, doc_id, 40, "Uploading to cloud storage...")
        
        # Upload to GCS
        try:
            upload_file_to_gcs(temp_file_path, gcs_blob_name)
        except Exception as e:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            cursor.execute("UPDATE documents SET status = 'failed', processing_step = %s WHERE id = %s", 
                          (f"Cloud upload failed: {str(e)}", doc_id))
            db.commit()
            return BatchUploadResult(
                filename=file.filename,
                success=False,
                error=f"Cloud storage error: {str(e)}",
                message=f"Failed: Could not upload {file.filename} to storage"
            )

        # Delete temp file after GCS upload
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

        # Progress: 60% - Chunking text
        _update_doc_progress(db, doc_id, 60, f"Chunking {total_pages} pages...")
        
        # Chunk text
        chunks = chunk_pages(pages_data, chunk_size=1000, overlap=200)

        # Progress: 75% - Creating embeddings
        _update_doc_progress(db, doc_id, 75, f"Creating embeddings ({len(chunks)} chunks)...")
        
        # Add to ChromaDB
        total_chunks = add_document_chunks(doc_id, chunks, subject_id=subject_id)

        # Progress: 95% - Finalizing
        _update_doc_progress(db, doc_id, 95, "Finalizing...")
        
        # Update status to ready
        cursor.execute(
            "UPDATE documents SET status = 'ready', processing_progress = 100, processing_step = 'Completed' WHERE id = %s",
            (doc_id,)
        )
        db.commit()

        # Backup ChromaDB to GCS (silently fail if error)
        try:
            sync_chromadb_to_gcs(settings.CHROMA_PATH)
        except Exception as e:
            logger.error(f"Failed to backup ChromaDB to GCS: {str(e)}")

        return BatchUploadResult(
            filename=file.filename,
            success=True,
            doc_id=doc_id,
            pages=total_pages,
            status="ready",
            message=f"Successfully uploaded {file.filename} ({total_chunks} chunks indexed)"
        )

    except PostgreSQLError as e:
        db.rollback()
        # Cleanup
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        try:
            delete_file_from_gcs(gcs_blob_name)
        except:
            pass
        return BatchUploadResult(
            filename=file.filename,
            success=False,
            error=f"Database error: {str(e)}",
            message=f"Failed: Database error for {file.filename}"
        )
    except Exception as e:
        db.rollback()
        # Cleanup
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        return BatchUploadResult(
            filename=file.filename,
            success=False,
            error=f"Unexpected error: {str(e)}",
            message=f"Failed: Unexpected error for {file.filename}"
        )
    finally:
        cursor.close()

@router.get("", response_model=DocumentListResponse)
def list_documents(
    subject_id: Optional[str] = None,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get dokumen user (optional filter by subject_id)
    """
    cursor = get_dict_cursor(db)

    try:
        if subject_id:
            # Filter by subject
            cursor.execute(
                """
                SELECT id, owner_id, subject_id, title, filename, pages, status, created_at
                FROM documents
                WHERE owner_id = %s AND subject_id = %s
                ORDER BY created_at DESC
                """,
                (user_id, subject_id)
            )
        else:
            # All documents
            cursor.execute(
                """
                SELECT id, owner_id, subject_id, title, filename, pages, status, created_at
                FROM documents
                WHERE owner_id = %s
                ORDER BY created_at DESC
                """,
                (user_id,)
            )

        docs = cursor.fetchall()

        documents = [DocumentInfo(**doc) for doc in docs]

        return DocumentListResponse(
            documents=documents,
            total=len(documents)
        )

    finally:
        cursor.close()

@router.get("/{doc_id}/file")
def get_document_file(
    doc_id: str,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get PDF file from GCS (with authentication)
    """
    from fastapi.responses import Response
    cursor = get_dict_cursor(db)

    try:
        # Verify user owns this document
        cursor.execute(
            "SELECT id, filename, title FROM documents WHERE id = %s AND owner_id = %s",
            (doc_id, user_id)
        )
        doc = cursor.fetchone()

        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        # Get GCS blob name from database
        gcs_blob_name = doc['filename']

        # Download file from GCS
        try:
            file_content = get_file_from_gcs(gcs_blob_name)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"PDF file not found in storage: {str(e)}"
            )

        # Serve file as response
        return Response(
            content=file_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{doc["title"]}.pdf"'
            }
        )

    finally:
        cursor.close()

@router.get("/{doc_id}", response_model=DocumentInfo)
def get_document(
    doc_id: str,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get detail dokumen
    """
    cursor = get_dict_cursor(db)

    try:
        cursor.execute(
            """
            SELECT id, owner_id, subject_id, title, filename, pages, status, created_at
            FROM documents
            WHERE id = %s AND owner_id = %s
            """,
            (doc_id, user_id)
        )
        doc = cursor.fetchone()

        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        return DocumentInfo(**doc)

    finally:
        cursor.close()

@router.delete("/{doc_id}")
def delete_document(
    doc_id: str,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Delete dokumen (DB + GCS file + ChromaDB)
    """
    cursor = get_dict_cursor(db)

    try:
        # Get document info
        cursor.execute(
            "SELECT filename FROM documents WHERE id = %s AND owner_id = %s",
            (doc_id, user_id)
        )
        doc = cursor.fetchone()

        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        # Delete from ChromaDB
        deleted_chunks = delete_document_chunks(doc_id)

        # Delete file from GCS
        gcs_blob_name = doc['filename']
        try:
            delete_file_from_gcs(gcs_blob_name)
        except Exception as e:
            # Log error but continue deletion
            print(f"Failed to delete from GCS: {str(e)}")

        # Delete from database (CASCADE akan hapus chat_sessions, quizzes, dll)
        cursor.execute("DELETE FROM documents WHERE id = %s", (doc_id,))
        db.commit()

        # Backup ChromaDB to GCS after deleting document
        try:
            sync_chromadb_to_gcs(settings.CHROMA_PATH)
        except Exception as e:
            logger.error(f"Failed to backup ChromaDB to GCS: {str(e)}")

        return {
            "message": "Document deleted successfully",
            "doc_id": doc_id,
            "chunks_deleted": deleted_chunks
        }

    except PostgreSQLError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()
