from PyPDF2 import PdfReader
from typing import List, Dict
import os

def extract_text_from_pdf(file_path: str) -> List[Dict]:
    """
    Extract text dari PDF file
    
    Args:
        file_path: Path ke PDF file
    
    Returns:
        List of dict dengan struktur:
        [
            {
                "page": 1,
                "text": "extracted text...",
                "char_count": 1234
            },
            ...
        ]
    
    Raises:
        FileNotFoundError: Jika file tidak ada
        Exception: Jika PDF corrupt atau error lain
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found: {file_path}")
    
    try:
        reader = PdfReader(file_path)
        pages_data = []
        
        for page_num, page in enumerate(reader.pages, start=1):
            # Extract text dari page
            text = page.extract_text()
            
            # Clean text (remove extra whitespace, newlines)
            text = text.strip()
            
            # Skip empty pages
            if not text:
                continue
            
            pages_data.append({
                "page": page_num,
                "text": text,
                "char_count": len(text)
            })
        
        return pages_data
    
    except Exception as e:
        raise Exception(f"Error extracting PDF: {str(e)}")

def get_pdf_metadata(file_path: str) -> Dict:
    """
    Get metadata dari PDF (total pages, file size, dll)
    
    Args:
        file_path: Path ke PDF file
    
    Returns:
        Dict dengan metadata PDF
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found: {file_path}")
    
    try:
        reader = PdfReader(file_path)
        file_size = os.path.getsize(file_path)
        
        metadata = {
            "total_pages": len(reader.pages),
            "file_size_bytes": file_size,
            "file_size_mb": round(file_size / (1024 * 1024), 2)
        }
        
        # PDF metadata (optional, bisa None)
        if reader.metadata:
            metadata["title"] = reader.metadata.get("/Title", None)
            metadata["author"] = reader.metadata.get("/Author", None)
            metadata["subject"] = reader.metadata.get("/Subject", None)
        
        return metadata
    
    except Exception as e:
        raise Exception(f"Error reading PDF metadata: {str(e)}")
