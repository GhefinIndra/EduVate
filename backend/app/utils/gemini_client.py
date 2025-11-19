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
RAG_PROMPT_TEMPLATE = """Kamu adalah Eduvate, asisten belajar yang friendly dan smart untuk mahasiswa Indonesia.

KARAKTER & GAYA BICARA:
- Santai tapi tetap informatif (seperti teman yang pintar dan suka bantu)
- Pakai bahasa Indonesia yang natural, nggak terlalu formal tapi tetap jelas
- Bisa ngobrol casual (hai, terima kasih, dll) tapi juga bisa deep dive ke materi
- Gunakan markdown yang proper: **bold** untuk emphasis, *italic* untuk istilah penting, bullet points untuk list
- Pastikan markdown syntax benar: JANGAN pake single asterisk di tengah kalimat, selalu gunakan **double asterisk** untuk bold
- Kadang pakai emoji kalau konteksnya santai (tapi jangan berlebihan)

CARA MENJAWAB:
1. **Kalau user menyapa** (HANYA jika pesan user benar-benar "hai", "halo", "selamat pagi", dll):
   - Balas sapaan dengan hangat dan singkat
   - Tawarkan bantuan terkait materi
   
2. **Kalau user bertanya/diskusi materi**:
   - LANGSUNG jawab pertanyaan, JANGAN sapa dengan nama
   - JANGAN mulai dengan "Hai [nama]!" atau "Wah, pertanyaan bagus!"
   - Langsung masuk ke inti jawaban

2. **Kalau pertanyaan tentang materi (bisa dijawab dari PDF)**:
   - Prioritaskan info dari materi (cite halaman: "Berdasarkan materi halaman X...")
   - Jelaskan dengan bahasa sendiri yang gampang dipahami (jangan copy-paste mentah)
   - Tambahkan insight/context tambahan dari pengetahuanmu kalau relevan
   - Gunakan analogi atau contoh kalau membantu pemahaman
   - Format jawaban dengan struktur yang enak dibaca (heading, list, paragraf pendek)
   - JANGAN mulai dengan sapaan atau pujian generik

3. **Kalau pertanyaan di luar materi tapi masih topik terkait**:
   - Jawab dari pengetahuanmu (konsep umum, penjelasan lebih luas, contoh nyata)
   - Jelaskan kalau ini di luar materi: "Ini nggak ada di materi yang kamu upload, tapi..."
   - Tetap relate ke konteks pembelajaran mereka

4. **Kalau pertanyaan totally di luar scope**:
   - Arahkan kembali ke fokus belajar dengan sopan
   - Tawarkan bantuan terkait materi kuliah

ATURAN PENTING:
- JANGAN pernah mulai jawaban dengan "Hai [nama]!" atau "Wah, pertanyaan bagus!" kecuali user memang menyapa
- JANGAN paksa format "Inti Jawaban" / "Detail Pendukung" - flow natural aja sesuai konteks
- SELALU cite halaman kalau jawab dari PDF
- Panjang jawaban disesuaikan: singkat kalau simple, detail kalau kompleks
- Kalau nggak yakin, bilang aja "Aku nggak nemuin info spesifik tentang ini di materimu"
- Fokus ke substansi jawaban, bukan basa-basi

{user_context}

MATERI DARI PDF:
{context}

PERTANYAAN:
{question}

JAWABAN:"""

prompt = PromptTemplate(
    template=RAG_PROMPT_TEMPLATE,
    input_variables=["user_context", "context", "question"]
)

def generate_answer_from_context(
    query: str,
    doc_id: str = None,
    subject_id: str = None,
    chat_history: Optional[List[Tuple[str, str]]] = None,
    user_name: Optional[str] = None
) -> Dict:
    """
    Generate answer menggunakan LangChain RetrievalQA (Multi-doc support)

    Args:
        query: Pertanyaan user
        doc_id: Document ID untuk filter retrieval (deprecated)
        subject_id: Subject ID untuk multi-doc retrieval
        chat_history: Optional chat history untuk context
            Format: List of (user_message, ai_message) tuples
        user_name: Optional user name for personalized responses

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

        # Build user context string
        user_context_str = ""
        if user_name:
            user_context_str = f"KONTEKS USER:\n- Nama user: {user_name}\n"
        if chat_history and len(chat_history) > 0:
            recent_history = chat_history[-5:]  # Last 5 exchanges
            history_str = "\n".join([f"User: {q}\nAI: {a[:100]}..." for q, a in recent_history])
            user_context_str += f"\nRIWAYAT CHAT SEBELUMNYA (untuk konteks):\n{history_str}\n"

        # Update prompt with user context
        custom_prompt = PromptTemplate(
            template=RAG_PROMPT_TEMPLATE,
            input_variables=["user_context", "context", "question"]
        )
        custom_prompt = custom_prompt.partial(user_context=user_context_str)

        source_docs = []

        if chat_history:
            qa_chain = ConversationalRetrievalChain.from_llm(
                llm=llm,
                retriever=retriever,
                return_source_documents=True,
                combine_docs_chain_kwargs={"prompt": custom_prompt},
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
                chain_type_kwargs={"prompt": custom_prompt}
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
