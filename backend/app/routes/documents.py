from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, Form
from mysql.connector import Error as MySQLError
import uuid
import os
import shutil
from typing import List, Optional

from app.models.document import DocumentUploadResponse, DocumentInfo, DocumentListResponse
from app.database import get_db
from app.auth import get_current_user
from app.config import settings
from app.utils.pdf_parser import extract_text_from_pdf, get_pdf_metadata
from app.utils.chunker import chunk_pages
from app.utils.vector_store import add_document_chunks, delete_document_chunks
from app.utils.badge_checker import update_streak, check_and_unlock_badges

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

    cursor = db.cursor(dictionary=True)

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
    
    cursor = db.cursor(dictionary=True)
    doc_id = str(uuid.uuid4())
    file_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}.pdf")
    
    try:
        # 2. Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 3. Extract text & metadata
        try:
            metadata = get_pdf_metadata(file_path)
            pages_data = extract_text_from_pdf(file_path)
            total_pages = metadata['total_pages']
        except Exception as e:
            # Delete file if extraction fails
            os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process PDF: {str(e)}"
            )
        
        # 4. Insert to database (status: processing)
        insert_query = """
            INSERT INTO documents (id, owner_id, subject_id, title, filename, pages, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'processing')
        """
        cursor.execute(insert_query, (
            doc_id,
            user_id,
            subject_id,
            file.filename,
            file_path,
            total_pages
        ))
        db.commit()
        
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

        return DocumentUploadResponse(
            doc_id=doc_id,
            title=file.filename,
            pages=total_pages,
            status="ready",
            message=f"Document uploaded successfully. {total_chunks} chunks indexed.",
            subject_id=subject_id
        )
        
    except MySQLError as e:
        db.rollback()
        # Cleanup
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        # Cleanup
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
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
    cursor = db.cursor(dictionary=True)

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

@router.get("/{doc_id}", response_model=DocumentInfo)
def get_document(
    doc_id: str,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get detail dokumen
    """
    cursor = db.cursor(dictionary=True)

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
    Delete dokumen (DB + file + ChromaDB)
    """
    cursor = db.cursor(dictionary=True)
    
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
        
        # Delete file
        if os.path.exists(doc['filename']):
            os.remove(doc['filename'])
        
        # Delete from database (CASCADE akan hapus chat_sessions, quizzes, dll)
        cursor.execute("DELETE FROM documents WHERE id = %s", (doc_id,))
        db.commit()
        
        return {
            "message": "Document deleted successfully",
            "doc_id": doc_id,
            "chunks_deleted": deleted_chunks
        }
        
    except MySQLError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()