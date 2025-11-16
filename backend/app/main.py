from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, documents, chat, quiz, gamification, topics
from app.config import settings

# Create FastAPI app instance
app = FastAPI(
    title="Eduvate API",
    description="Elevate Your Learning with AI - RAG + Quiz + Gamification",
    version="1.0.0",
    docs_url="/api-docs",
    redoc_url="/api-redoc"
)

# CORS Configuration
# Allow frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5174",  # Vite dev server (alternate port)
        "http://localhost:5175",  # Vite dev server (alternate port)
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, PUT, DELETE, etc)
    allow_headers=["*"],  # Allow all headers
)

# Include routers
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