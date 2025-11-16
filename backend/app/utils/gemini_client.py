from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
from typing import Dict, List, Optional, Tuple
import re
from app.config import settings
from app.utils.vector_store import get_vectorstore

# Initialize LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=settings.GEMINI_API_KEY,
    temperature=0.7,
    convert_system_message_to_human=True
)

# Custom prompt template untuk RAG
RAG_PROMPT_TEMPLATE = """Kamu adalah Eduvate, tutor AI yang membantu mahasiswa memahami materi kuliah.

Cara menjawab:
- Mulai dengan sapaan singkat plus ringkasan 1 kalimat.
- Tambahkan bagian **Inti Jawaban** yang berisi poin-poin penting dan cantumkan halaman sumber (misal: "(halaman 5)").
- Jika relevan, tambahkan bagian **Detail Pendukung** untuk contoh atau penjelasan lanjutan.
- Jika informasi tidak ditemukan pada konteks, jelaskan dengan kalimat sopan bahwa informasi tersebut belum ada di materi.
- Akhiri dengan kalimat singkat berisi ajakan atau saran tindak lanjut.
- Gunakan bahasa Indonesia yang natural dan mudah dipahami.

KONTEKS:
{context}

PERTANYAAN TERBARU:
{question}

JAWABAN:"""

prompt = PromptTemplate(
    template=RAG_PROMPT_TEMPLATE,
    input_variables=["context", "question"]
)

def generate_answer_from_context(
    query: str,
    doc_id: str = None,
    subject_id: str = None,
    chat_history: Optional[List[Tuple[str, str]]] = None
) -> Dict:
    """
    Generate answer menggunakan LangChain RetrievalQA (Multi-doc support)

    Args:
        query: Pertanyaan user
        doc_id: Document ID untuk filter retrieval (deprecated)
        subject_id: Subject ID untuk multi-doc retrieval
        chat_history: Optional chat history untuk context
            Format: List of (user_message, ai_message) tuples

    Returns:
        {
            "answer": "jawaban AI...",
            "citations": [{"page": 1, "snippet": "...", "doc_id": "xxx"}]
        }
    """

    try:
        # Get vectorstore
        vectorstore = get_vectorstore()

        # Create retriever dengan filter (prioritize subject_id for multi-doc)
        filter_dict = {}
        if subject_id:
            filter_dict = {"subject_id": subject_id}
        elif doc_id:
            filter_dict = {"doc_id": doc_id}

        retriever = vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={
                "k": 10,  # Increase untuk multi-doc (ambil dari berbagai dokumen)
                "filter": filter_dict if filter_dict else None
            }
        )
        
        source_docs = []

        if chat_history:
            qa_chain = ConversationalRetrievalChain.from_llm(
                llm=llm,
                retriever=retriever,
                return_source_documents=True,
                combine_docs_chain_kwargs={"prompt": prompt},
                verbose=False
            )
            result = qa_chain.invoke({
                "question": query,
                "chat_history": chat_history[-4:]  # cukup pasangan terakhir agar efisien
            })
            answer_text = result.get("answer") or result.get("result") or ""
            source_docs = result.get("source_documents", [])
        else:
            qa_chain = RetrievalQA.from_chain_type(
                llm=llm,
                chain_type="stuff",  # combine all docs into one prompt
                retriever=retriever,
                return_source_documents=True,
                chain_type_kwargs={"prompt": prompt}
            )
            result = qa_chain.invoke({"query": query})
            answer_text = result.get("result", "")
            source_docs = result.get("source_documents", [])
        
        # Extract citations from source documents
        citations = []
        seen_pages = set()
        
        for doc in source_docs:
            page = doc.metadata.get('page', 0)
            doc_id_meta = doc.metadata.get('doc_id', '')
            
            # Avoid duplicate pages
            if page not in seen_pages:
                citations.append({
                    "page": page,
                    "snippet": doc.page_content[:200] + "...",  # First 200 chars
                    "doc_id": doc_id_meta
                })
                seen_pages.add(page)
        
        # Sort citations by page
        citations.sort(key=lambda x: x['page'])
        
        return {
            "answer": answer_text,
            "citations": citations
        }
        
    except Exception as e:
        raise Exception(f"LangChain RAG error: {str(e)}")

def generate_answer_with_chat_history(
    query: str,
    doc_id: str,
    chat_history: List[tuple]
) -> Dict:
    """
    Generate answer dengan conversational memory (alternative approach)
    
    Args:
        query: Pertanyaan user
        doc_id: Document ID
        chat_history: List of (human_msg, ai_msg) tuples
    
    Returns:
        {
            "answer": "jawaban AI...",
            "citations": [...]
        }
    """
    
    try:
        vectorstore = get_vectorstore()
        
        retriever = vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={
                "k": 5,
                "filter": {"doc_id": doc_id}
            }
        )
        
        # Conversational chain dengan memory
        qa_chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=retriever,
            return_source_documents=True,
            verbose=False
        )
        
        # Invoke dengan chat history
        result = qa_chain.invoke({
            "question": query,
            "chat_history": chat_history
        })
        
        # Extract citations
        citations = []
        seen_pages = set()
        
        for doc in result["source_documents"]:
            page = doc.metadata.get('page', 0)
            if page not in seen_pages:
                citations.append({
                    "page": page,
                    "snippet": doc.page_content[:200] + "...",
                    "doc_id": doc.metadata.get('doc_id', '')
                })
                seen_pages.add(page)
        
        citations.sort(key=lambda x: x['page'])
        
        return {
            "answer": result["answer"],
            "citations": citations
        }
        
    except Exception as e:
        raise Exception(f"Conversational RAG error: {str(e)}")

def generate_session_title(first_message: str) -> str:
    """
    Generate judul session dari pesan pertama
    
    Args:
        first_message: Pesan pertama user
    
    Returns:
        Session title (max 50 chars)
    """
    from langchain.chains import LLMChain
    
    title_prompt = PromptTemplate(
        template="""
Buat judul percakapan yang ringkas dan menarik (maksimal 5 kata) untuk pertanyaan berikut.
- Hanya tulis judulnya saja (tanpa kata "Judul" atau tanda kutip).
- Gunakan Bahasa Indonesia natural dan kapitalisasi rapi.

Pertanyaan pengguna:
"{message}"

Judul:
""".strip(),
        input_variables=["message"]
    )
    
    try:
        chain = LLMChain(llm=llm, prompt=title_prompt)
        result = chain.invoke({"message": first_message})
        
        title = result["text"].strip()

        # Remove unwanted prefixes seperti "Judul:" atau "Title:"
        title = re.sub(r'^(judul|title)\s*[:\-]\s*', '', title, flags=re.IGNORECASE)
        # Remove quotes
        title = title.replace('"', '').replace("'", "").strip()
        # Normalize whitespace
        title = re.sub(r'\s+', ' ', title)

        if not title:
            raise ValueError("Empty title generated")

        # Capitalize first letter if needed
        title = title[0].upper() + title[1:]
        
        # Limit to 50 chars
        if len(title) > 50:
            title = title[:47] + "..."
        
        return title
        
    except:
        # Fallback
        return first_message[:47] + "..." if len(first_message) > 50 else first_message
