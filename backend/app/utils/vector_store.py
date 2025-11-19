from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from typing import List, Dict
from app.config import settings as app_settings
import chromadb
import logging

logger = logging.getLogger(__name__)

# Initialize embeddings (Local HuggingFace - no API quota)
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={'device': 'cpu'},
    encode_kwargs={'normalize_embeddings': True}
)

# Initialize ChromaDB client with settings to avoid collection errors
chroma_client = chromadb.PersistentClient(
    path=app_settings.CHROMA_PATH,
    settings=chromadb.Settings(
        anonymized_telemetry=False,
        allow_reset=True
    )
)

# Initialize Chroma vectorstore
vectorstore = Chroma(
    client=chroma_client,
    embedding_function=embeddings,
    collection_name="documents"
)

def _recreate_vectorstore():
    """
    Recreate vectorstore if collection becomes corrupted or missing
    This happens when ChromaDB data is lost (ephemeral storage in Cloud Run)
    """
    global vectorstore
    try:
        # Delete old collection if exists
        try:
            chroma_client.delete_collection("documents")
        except:
            pass
        
        # Create new vectorstore
        vectorstore = Chroma(
            client=chroma_client,
            embedding_function=embeddings,
            collection_name="documents"
        )
        logger.info("Vectorstore recreated successfully")
    except Exception as e:
        logger.error(f"Failed to recreate vectorstore: {str(e)}")
        raise

def add_document_chunks(doc_id: str, chunks: List[Dict], subject_id: str = None):
    """
    Add chunks dari dokumen ke ChromaDB menggunakan LangChain
    Safe addition with error handling + auto-recovery

    Args:
        doc_id: Document ID (UUID)
        chunks: List of chunks dari chunker.chunk_pages()
        subject_id: Subject/Topic ID (optional untuk backward compatibility)

    Returns:
        Number of chunks added (0 if error)

    Example:
        chunks = [
            {
                "chunk_id": "p1_c0",
                "text": "...",
                "page": 1,
                "char_count": 500
            },
            ...
        ]
    """
    try:
        # Prepare data
        texts = []
        metadatas = []
        ids = []

        for chunk in chunks:
            texts.append(chunk['text'])
            metadata = {
                "doc_id": doc_id,
                "page": chunk['page'],
                "chunk_id": chunk['chunk_id'],
                "char_count": chunk.get('char_count', 0)
            }
            # Add subject_id to metadata untuk multi-doc retrieval
            if subject_id:
                metadata["subject_id"] = subject_id

            metadatas.append(metadata)
            ids.append(f"{doc_id}_{chunk['chunk_id']}")

        # Add to vectorstore with retry on collection error
        try:
            vectorstore.add_texts(
                texts=texts,
                metadatas=metadatas,
                ids=ids
            )
        except Exception as collection_error:
            # If collection error, try to recreate vectorstore
            error_msg = str(collection_error).lower()
            if "does not exist" in error_msg or "collection" in error_msg:
                logger.warning(f"Collection error detected, recreating: {collection_error}")
                _recreate_vectorstore()
                # Retry add after recreation
                vectorstore.add_texts(
                    texts=texts,
                    metadatas=metadatas,
                    ids=ids
                )
            else:
                raise

        return len(texts)
    
    except Exception as e:
        logger.error(f"Failed to add chunks for doc {doc_id}: {str(e)}")
        raise  # Re-raise because this is critical for document processing

def search_similar_chunks(
    query: str,
    doc_id: str = None,
    subject_id: str = None,
    top_k: int = 5
) -> List[Dict]:
    """
    Search chunks yang mirip dengan query menggunakan LangChain
    Safe search with error handling

    Args:
        query: Pertanyaan user
        doc_id: Filter by document ID (deprecated - untuk backward compatibility)
        subject_id: Filter by subject ID (multi-doc retrieval)
        top_k: Jumlah chunks yang di-return

    Returns:
        List of chunks dengan similarity score:
        [
            {
                "text": "chunk text...",
                "page": 1,
                "doc_id": "xxx",
                "subject_id": "yyy",
                "chunk_id": "p1_c0",
                "distance": 0.23
            },
            ...
        ]
    """
    try:
        # Build filter (prioritize subject_id over doc_id)
        filter_dict = None
        if subject_id:
            filter_dict = {"subject_id": subject_id}
        elif doc_id:
            filter_dict = {"doc_id": doc_id}

        # Search using LangChain with retry on collection error
        try:
            if filter_dict:
                docs = vectorstore.similarity_search(
                    query,
                    k=top_k,
                    filter=filter_dict
                )
            else:
                docs = vectorstore.similarity_search(query, k=top_k)
        except Exception as collection_error:
            error_msg = str(collection_error).lower()
            if "does not exist" in error_msg or "collection" in error_msg:
                logger.warning(f"Collection error in search, recreating: {collection_error}")
                _recreate_vectorstore()
                # Return empty after recreation (no data yet)
                return []
            else:
                raise

        # Format results
        chunks = []
        for doc in docs:
            chunks.append({
                "text": doc.page_content,
                "page": doc.metadata.get('page', 0),
                "doc_id": doc.metadata.get('doc_id', ''),
                "subject_id": doc.metadata.get('subject_id', ''),
                "chunk_id": doc.metadata.get('chunk_id', ''),
                "distance": 0.0  # LangChain similarity_search ga return distance by default
            })

        return chunks
    
    except Exception as e:
        # Log error but return empty results
        logger.warning(f"Failed to search chunks: {str(e)}")
        return []

def delete_document_chunks(doc_id: str):
    """
    Delete semua chunks dari dokumen tertentu
    Safe deletion with error handling
    
    Args:
        doc_id: Document ID yang mau dihapus
    
    Returns:
        Number of chunks deleted (0 if error or not found)
    """
    try:
        # Get all documents for this doc_id with retry on collection error
        try:
            collection = vectorstore._collection
            
            # Get IDs with filter
            results = collection.get(where={"doc_id": doc_id})
            
            if results and results.get('ids'):
                # Delete using vectorstore
                vectorstore.delete(ids=results['ids'])
                return len(results['ids'])
            
            return 0
        except Exception as collection_error:
            error_msg = str(collection_error).lower()
            if "does not exist" in error_msg or "collection" in error_msg:
                logger.warning(f"Collection error in delete, recreating: {collection_error}")
                _recreate_vectorstore()
                return 0  # Nothing to delete if collection was recreated
            else:
                raise
    
    except Exception as e:
        # Log error but don't crash
        logger.warning(f"Failed to delete chunks for doc {doc_id}: {str(e)}")
        return 0

def get_collection_stats() -> Dict:
    """
    Get statistik collection (untuk monitoring)
    Safe stats retrieval with error handling
    
    Returns:
        Dict dengan stats (empty dict if error)
    """
    try:
        collection = vectorstore._collection
        count = collection.count()
        
        return {
            "total_chunks": count,
            "collection_name": "documents"
        }
    
    except Exception as e:
        logger.warning(f"Failed to get collection stats: {str(e)}")
        return {
            "total_chunks": 0,
            "collection_name": "documents",
            "error": str(e)
        }

def get_vectorstore():
    """
    Get vectorstore instance untuk dipakai di LangChain chains
    
    Returns:
        Chroma vectorstore instance
    """
    return vectorstore