# Eduvate Backend - AI Learning Companion

Backend API untuk Eduvate (SEVENT 9.0 Software Development Competition)
**Tagline:** "Elevate Your Learning with AI"

## Tech Stack

- **Framework**: FastAPI
- **Database**: MySQL
- **Vector DB**: ChromaDB
- **LLM**: Google Gemini API
- **Auth**: JWT

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Setup Environment Variables

Copy `.env.example` ke `.env` dan isi credentials

### 3. Run Server

```bash
uvicorn app.main:app --reload
```

Server akan jalan di: http://localhost:8000

API Docs: http://localhost:8000/docs

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Environment config
│   ├── database.py          # MySQL connection
│   ├── auth.py              # JWT logic
│   ├── models/              # Pydantic models
│   ├── routes/              # API endpoints
│   └── utils/               # Helper functions
├── uploads/                 # PDF storage
├── chroma_db/               # Vector database
├── requirements.txt
└── .env
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

### Gamification
- `GET /me/progress` - Get user XP, level, badges
- `GET /leaderboard` - Get leaderboard (optional)

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

**Option 2: Manual deployment**

```bash
gcloud run deploy asked-backend \
  --source . \
  --platform managed \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --set-env-vars "DB_HOST=xxx,DB_PORT=3306,DB_USER=xxx,DB_PASSWORD=xxx,DB_NAME=asked,JWT_SECRET_KEY=xxx,GEMINI_API_KEY=xxx"
```

### Environment Variables yang Diperlukan

- `DB_HOST` - MySQL host (yang sudah kamu deploy)
- `DB_PORT` - MySQL port (default: 3306)
- `DB_USER` - MySQL username
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name (asked)
- `JWT_SECRET_KEY` - Secret key untuk JWT
- `GEMINI_API_KEY` - Google Gemini API key

### After Deployment

Cloud Run akan kasih URL seperti: `https://asked-backend-xxx-as.a.run.app`

Gunakan URL ini untuk environment variable `VITE_API_URL` di frontend.

### Monitoring

- Logs: `gcloud run logs read asked-backend --region asia-southeast2`
- Dashboard: https://console.cloud.google.com/run

### Cost Estimation

**Free Tier:**
- 2 million requests/month
- 360,000 GB-seconds memory
- 180,000 vCPU-seconds

Untuk aplikasi demo/lomba, kemungkinan besar 100% GRATIS.

## Development

Tim: [Nama Tim Anda]
Event: SEVENT 9.0 - Software Engineering Event
Tema: AI for New Opportunities
