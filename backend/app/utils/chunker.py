from typing import List, Dict

def chunk_text(
    text: str, 
    chunk_size: int = 1000, 
    overlap: int = 200,
    page_number: int = 1
) -> List[Dict]:
    """
    Split text jadi chunks dengan overlap
    
    Args:
        text: Text yang mau di-chunk
        chunk_size: Ukuran tiap chunk (characters)
        overlap: Overlap antar chunk (characters)
        page_number: Nomor halaman (untuk metadata)
    
    Returns:
        List of dict:
        [
            {
                "chunk_id": "p1_c0",
                "text": "chunk text...",
                "page": 1,
                "char_start": 0,
                "char_end": 1000
            },
            ...
        ]
    """
    chunks = []
    text_length = len(text)
    start = 0
    chunk_index = 0
    
    while start < text_length:
        # Calculate end position
        end = start + chunk_size
        
        # Get chunk text
        chunk_text = text[start:end]
        
        # Skip empty chunks
        if chunk_text.strip():
            chunks.append({
                "chunk_id": f"p{page_number}_c{chunk_index}",
                "text": chunk_text.strip(),
                "page": page_number,
                "char_start": start,
                "char_end": min(end, text_length),
                "char_count": len(chunk_text.strip())
            })
            chunk_index += 1
        
        # Move start position (with overlap)
        start += chunk_size - overlap
    
    return chunks

def chunk_pages(
    pages_data: List[Dict],
    chunk_size: int = 1000,
    overlap: int = 200
) -> List[Dict]:
    """
    Chunk multiple pages dari PDF
    
    Args:
        pages_data: Output dari pdf_parser.extract_text_from_pdf()
        chunk_size: Ukuran tiap chunk
        overlap: Overlap antar chunk
    
    Returns:
        List semua chunks dari semua pages
    """
    all_chunks = []
    
    for page_data in pages_data:
        page_number = page_data["page"]
        text = page_data["text"]
        
        # Chunk text dari page ini
        page_chunks = chunk_text(
            text=text,
            chunk_size=chunk_size,
            overlap=overlap,
            page_number=page_number
        )
        
        all_chunks.extend(page_chunks)
    
    return all_chunks