# Eduvate Backend - AI Learning Companion

Backend API untuk Eduvate (SEVENT 9.0 Software Development Competition)
**Tagline:** "Elevate Your Learning with AI"

## Tech Stack

- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL (Supabase)
- **Cache**: Redis (Upstash serverless)
- **Vector DB**: ChromaDB (for RAG)
- **LLM**: Google Gemini 1.5 Flash
- **Auth**: JWT (JSON Web Tokens)
- **Storage**: Google Cloud Storage
- **RAG Pipeline**: LangChain + ChromaDB

## Setup

### 1. Install Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Setup Environment Variables

Create `.env` file di root backend directory:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# JWT Authentication
SECRET_KEY=your-super-secret-jwt-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ChromaDB
CHROMA_PATH=./chroma_db

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=20

# Google Cloud Storage
GCS_BUCKET_NAME=your-gcs-bucket-name

# Redis Cache (Optional - Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
CACHE_ENABLED=true
```

### 3. Run Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server akan jalan di: http://localhost:8000  
API Docs (Swagger): http://localhost:8000/docs  
Alternative Docs (ReDoc): http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point + CORS
│   ├── config.py            # Environment configuration
│   ├── database.py          # PostgreSQL connection pool
│   ├── auth.py              # JWT authentication logic
│   ├── models/              # Pydantic request/response models
│   │   ├── user.py
│   │   ├── topic.py
│   │   ├── document.py
│   │   ├── chat.py
│   │   ├── quiz.py
│   │   └── gamification.py
│   ├── routes/              # API endpoint routers
│   │   ├── auth.py          # Login/Register
│   │   ├── topics.py        # Topic CRUD
│   │   ├── documents.py     # Document upload/management
│   │   ├── chat.py          # RAG chat sessions
│   │   ├── quiz.py          # Quiz generation/submission
│   │   └── gamification.py  # Stats, progress, analytics
│   └── utils/               # Helper utilities
│       ├── pdf_parser.py    # PDF text extraction
│       ├── chunker.py       # Text chunking for RAG
│       ├── vector_store.py  # ChromaDB operations
│       ├── gemini_client.py # Gemini API client
│       ├── quiz_generator.py # Quiz generation logic
│       ├── grader.py        # Quiz grading (MCQ + Essay)
│       ├── badge_checker.py # Badge unlock logic
│       ├── insight_generator.py # AI insights
│       ├── gcs_storage.py   # Google Cloud Storage
│       └── cache.py         # Redis cache utilities
├── chroma_db/               # ChromaDB vector storage (gitignored)
├── uploads/                 # Temporary file uploads (gitignored)
├── Dockerfile               # Docker image definition
├── deploy-cloudrun.sh       # Cloud Run deployment script
├── requirements.txt         # Python dependencies
└── .env                     # Environment variables (gitignored)
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register user baru
- `POST /auth/login` - Login & get JWT token

### Documents
- `POST /docs/upload` - Upload PDF
- `GET /docs/{doc_id}` - Get document info
- `GET /docs` - List user documents

### Chat (RAG)
- `POST /chat/sessions` - Create new chat session
- `GET /chat/sessions` - List chat sessions
- `POST /chat/sessions/{session_id}/messages` - Send message
- `GET /chat/sessions/{session_id}/messages` - Get chat history

### Quiz
- `POST /quiz/generate` - Generate quiz from document
- `GET /quiz/{quiz_id}` - Get quiz questions
- `POST /quiz/{quiz_id}/submit` - Submit answers
- `GET /quiz/history` - Get quiz history

### Gamification & Analytics
- `GET /me/dashboard` - Combined endpoint (stats + progress + topics)
- `GET /me/progress` - XP, level, badges, streaks
- `GET /me/stats` - Overview statistics
- `GET /me/topic-understanding` - Understanding per topic with AI insights
- `GET /me/analytics/xp-history` - XP gain over time (chart data)
- `GET /me/analytics/quiz-performance` - Quiz scores trend analysis
- `GET /me/analytics/activity-summary` - Activity breakdown
- `GET /me/analytics/daily-activity` - Daily activity for heatmap (90 days)

## Deployment to Google Cloud Run

### Prerequisites

1. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
2. Login to GCP:
   ```bash
   gcloud auth login
   ```
3. Create GCP project atau gunakan yang sudah ada
4. Set project:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```
5. Enable Cloud Run API:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

### Deploy Backend

**Option 1: Using deployment script (Recommended)**

1. Edit `deploy-cloudrun.sh` dan ganti:
   - `PROJECT_ID` dengan GCP Project ID kamu
   - Environment variables (DB_HOST, DB_USER, DB_PASSWORD, etc.)

2. Run deployment:
   ```bash
   # Windows (Git Bash)
   bash deploy-cloudrun.sh

   # Linux/Mac
   chmod +x deploy-cloudrun.sh
   ./deploy-cloudrun.sh
   ```

**Option 2: Manual Docker deployment**

```bash
# 1. Build Docker image
docker build -t asia-southeast2-docker.pkg.dev/PROJECT_ID/eduvate/backend:latest .

# 2. Push to Artifact Registry
docker push asia-southeast2-docker.pkg.dev/PROJECT_ID/eduvate/backend:latest

# 3. Deploy to Cloud Run
gcloud run deploy eduvate-backend \
  --image asia-southeast2-docker.pkg.dev/PROJECT_ID/eduvate/backend:latest \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --memory 2Gi \
  --set-env-vars "DATABASE_URL=postgresql://...,GEMINI_API_KEY=...,SECRET_KEY=..., (all other env vars)"
```

### Environment Variables yang Diperlukan

- `DATABASE_URL` - PostgreSQL connection string (Supabase)
- `GEMINI_API_KEY` - Google Gemini API key
- `SECRET_KEY` - JWT secret key
- `ALGORITHM` - JWT algorithm (HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration (30)
- `CHROMA_PATH` - ChromaDB path (./chroma_db)
- `UPLOAD_DIR` - Upload directory (./uploads)
- `MAX_FILE_SIZE_MB` - Max file size (20)
- `GCS_BUCKET_NAME` - Google Cloud Storage bucket name
- `UPSTASH_REDIS_REST_URL` - Upstash Redis URL (optional)
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token (optional)
- `CACHE_ENABLED` - Enable caching (true/false)

### After Deployment

Cloud Run akan kasih URL seperti: `https://eduvate-backend-xxx-as.a.run.app`

Gunakan URL ini untuk environment variable `VITE_API_URL` di frontend.

### Monitoring

- Logs: `gcloud run logs read eduvate-backend --region asia-southeast2`
- Dashboard: https://console.cloud.google.com/run

## Key Features

### 🚀 Performance
- **Redis Caching** (Upstash) for 60-80% faster dashboard loads
- **Database Indexing** for 3-10x faster queries
- **Connection Pooling** for PostgreSQL
- **Optimized RAG Pipeline** with ChromaDB vector search

### 🤖 AI Capabilities
- **RAG (Retrieval-Augmented Generation)** for context-aware chat
- **AI Quiz Generation** from uploaded documents
- **AI Essay Grading** with rubric-based feedback
- **AI Insights** about learning progress per topic

### 🎮 Gamification
- **XP & Leveling System** with exponential progression
- **Badges & Achievements** (Quiz Master, Week Warrior, Perfect Score, etc.)
- **Learning Streaks** with daily activity tracking
- **Topic Mastery** with understanding percentage

### 📊 Analytics
- **Activity Heatmap** (90-day GitHub-style calendar)
- **Performance Trends** (XP history, quiz scores over time)
- **Topic Understanding** with AI-generated insights

### Cost Estimation

**Free Tier:**
- 2 million requests/month
- 360,000 GB-seconds memory
- 180,000 vCPU-seconds

Untuk aplikasi demo/lomba, kemungkinan besar 100% GRATIS.

## Development

**Team MatchaYuzuu**
- Ghefin Indra
- Najwa Aulia Aziza

Event: SEVENT 9.0 - Software Engineering Event  
Tema: AI for New Opportunities
