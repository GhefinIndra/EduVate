from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from typing import List, Dict
from app.config import settings as app_settings

# Initialize embeddings (Local HuggingFace - no API quota)
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={'device': 'cpu'},
    encode_kwargs={'normalize_embeddings': True}
)

# Initialize Chroma vectorstore
vectorstore = Chroma(
    persist_directory=app_settings.CHROMA_PATH,
    embedding_function=embeddings,
    collection_name="documents"
)

def add_document_chunks(doc_id: str, chunks: List[Dict], subject_id: str = None):
    """
    Add chunks dari dokumen ke ChromaDB menggunakan LangChain

    Args:
        doc_id: Document ID (UUID)
        chunks: List of chunks dari chunker.chunk_pages()
        subject_id: Subject/Topic ID (optional untuk backward compatibility)

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

    # Add to vectorstore
    vectorstore.add_texts(
        texts=texts,
        metadatas=metadatas,
        ids=ids
    )

    return len(texts)

def search_similar_chunks(
    query: str,
    doc_id: str = None,
    subject_id: str = None,
    top_k: int = 5
) -> List[Dict]:
    """
    Search chunks yang mirip dengan query menggunakan LangChain

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
    # Build filter (prioritize subject_id over doc_id)
    filter_dict = None
    if subject_id:
        filter_dict = {"subject_id": subject_id}
    elif doc_id:
        filter_dict = {"doc_id": doc_id}

    # Search using LangChain
    if filter_dict:
        docs = vectorstore.similarity_search(
            query,
            k=top_k,
            filter=filter_dict
        )
    else:
        docs = vectorstore.similarity_search(query, k=top_k)

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

def delete_document_chunks(doc_id: str):
    """
    Delete semua chunks dari dokumen tertentu
    
    Args:
        doc_id: Document ID yang mau dihapus
    """
    # Get all documents for this doc_id
    collection = vectorstore._collection
    
    # Get IDs with filter
    results = collection.get(where={"doc_id": doc_id})
    
    if results['ids']:
        # Delete using vectorstore
        vectorstore.delete(ids=results['ids'])
        return len(results['ids'])
    
    return 0

def get_collection_stats() -> Dict:
    """
    Get statistik collection (untuk monitoring)
    
    Returns:
        Dict dengan stats
    """
    collection = vectorstore._collection
    count = collection.count()
    
    return {
        "total_chunks": count,
        "collection_name": "documents"
    }

def get_vectorstore():
    """
    Get vectorstore instance untuk dipakai di LangChain chains
    
    Returns:
        Chroma vectorstore instance
    """
    return vectorstore