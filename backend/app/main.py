from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes import auth, documents, chat, quiz, gamification, topics
from app.config import settings
from app.utils.gcs_storage import sync_chromadb_from_gcs
import logging
import os

# Setup logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()  # Log to stdout (visible in Cloud Run logs)
    ]
)

logger = logging.getLogger(__name__)

# Create FastAPI app instance
app = FastAPI(
    title="Eduvate API",
    description="Elevate Your Learning with AI - RAG + Quiz + Gamification",
    version="1.0.0",
    docs_url="/api-docs",
    redoc_url="/api-redoc"
)

logger.info("Eduvate API starting up...")

# Startup event: Download ChromaDB from GCS
@app.on_event("startup")
async def startup_event():
    """Download ChromaDB data from GCS on container startup"""
    logger.info("Running startup tasks...")

    # Ensure ChromaDB directory exists
    os.makedirs(settings.CHROMA_PATH, exist_ok=True)

    # Try to sync ChromaDB from GCS
    try:
        sync_chromadb_from_gcs(settings.CHROMA_PATH)
        logger.info("ChromaDB sync from GCS completed")
    except Exception as e:
        logger.warning(f"Failed to sync ChromaDB from GCS (will start fresh): {str(e)}")

    logger.info("Startup tasks completed")

# CORS Configuration
# Allow frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5174",  # Vite dev server (alternate port)
        "http://localhost:5175",  # Vite dev server (alternate port)
        "https://eduvate-learning.web.app",  # Firebase Hosting (production)
        "https://eduvate-learning.firebaseapp.com",  # Firebase Hosting (alternate)
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, PUT, DELETE, etc)
    allow_headers=["*"],  # Allow all headers
)

# Mount uploads folder for serving PDF files - MUST be before routers
uploads_dir = settings.UPLOAD_DIR
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
    logger.info(f"Created uploads directory: {uploads_dir}")

app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
logger.info(f"Mounted /uploads endpoint to serve files from {uploads_dir}")

# Include routers - AFTER static files
app.include_router(auth.router)
app.include_router(topics.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(quiz.router)
app.include_router(gamification.router)

# Root endpoint
@app.get("/")
def root():
    """
    Health check endpoint
    """
    return {
        "message": "Eduvate API is running - Elevate Your Learning with AI",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/health")
def health_check():
    """
    Health check for monitoring
    """
    return {
        "status": "ok",
        "database": "connected",  # TODO: actual DB health check
        "vector_db": "connected"   # TODO: actual ChromaDB health check
    }