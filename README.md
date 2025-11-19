# EduVate - AI-Powered Learning Companion

**Tagline:** "Elevate Your Learning with AI"

AI-powered platform designed to enhance student learning through intelligent document analysis, interactive Q&A, personalized quizzes, and comprehensive learning analytics.

Built for SEVENT 9.0 Software Development Competition.

---

## ✨ Key Features

### 📚 Document Management
- Upload and organize learning materials (PDF support with OCR)
- Topic-based organization for better content structure
- Multi-document support per topic
- Google Cloud Storage integration for scalable file storage
- Automatic text extraction and chunking for RAG

### 💬 AI Chat (RAG-Powered)
- Conversational AI assistant powered by Google Gemini
- Context-aware responses with source citations and page numbers
- Multi-document retrieval across topics
- Chat history and session management
- Streaming responses for better UX
- Vector-based semantic search with ChromaDB

### 📝 AI Quiz Generation
- Automatic quiz generation from uploaded documents
- Multiple choice questions (MCQ) with 4 options
- Essay questions with AI-powered grading
- Detailed explanations and rubric-based feedback
- Instant grading with performance analytics
- **NEW: Export quiz results to PDF and CSV**
- Quiz history tracking per topic

### 🎮 Gamification & Analytics
- **XP and Leveling System** with exponential progression
- **Badges and Achievements** (Quiz Master, Week Warrior, Perfect Score, etc.)
- **Learning Streaks** with daily activity tracking
- **Topic Mastery** with understanding percentage per topic
- **AI-Generated Insights** about learning progress
- **NEW: Activity Heatmap** - GitHub-style 90-day calendar
- **NEW: Skill Radar Chart** - Topic understanding visualization
- **NEW: Advanced Analytics** - XP history, quiz performance trends
- **Performance Caching** with Redis for 60-80% faster dashboard loads

### 🚀 Performance & UX
- **Redis Caching** (Upstash) for optimized API responses
- **Optimistic UI Updates** for instant user feedback
- **Database Indexing** for 3-10x faster queries
- **Skeleton Loading States** for smooth loading experience
- **Dark Mode Support** with persistent theme
- **Responsive Design** for mobile and desktop

---

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL (Supabase)
- **Vector DB:** ChromaDB (for RAG/semantic search)
- **Cache:** Redis (Upstash serverless)
- **AI/LLM:** Google Gemini 1.5 Flash
- **Auth:** JWT (JSON Web Tokens)
- **Storage:** Google Cloud Storage
- **RAG Pipeline:** LangChain + ChromaDB + Gemini
- **PDF Processing:** PyPDF2 + sentence-transformers

### Frontend
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **UI Components:** Custom component library
- **Animations:** Framer Motion
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **State Management:** React Context API
- **Charts:** Recharts
- **Heatmap:** react-calendar-heatmap
- **Export:** jsPDF, jsPDF-AutoTable, PapaParse
- **Notifications:** React Hot Toast

### Deployment
- **Backend:** Google Cloud Run (Docker containers)
- **Frontend:** Firebase Hosting
- **Database:** Supabase (PostgreSQL managed service)
- **Cache:** Upstash Redis (serverless, Singapore region)
- **Storage:** Google Cloud Storage
- **Region:** Asia Southeast 2 (Jakarta)

---

## 📁 Project Structure

```
eduvate/
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── main.py             # FastAPI app entry + CORS
│   │   ├── auth.py             # JWT authentication
│   │   ├── config.py           # Environment configuration
│   │   ├── database.py         # PostgreSQL connection pool
│   │   ├── models/             # Pydantic request/response models
│   │   │   ├── user.py
│   │   │   ├── topic.py
│   │   │   ├── document.py
│   │   │   ├── chat.py
│   │   │   ├── quiz.py
│   │   │   └── gamification.py
│   │   ├── routes/             # API endpoint routers
│   │   │   ├── auth.py         # Login/Register
│   │   │   ├── topics.py       # Topic CRUD
│   │   │   ├── documents.py    # Document upload/management
│   │   │   ├── chat.py         # RAG chat sessions
│   │   │   ├── quiz.py         # Quiz generation/submission
│   │   │   └── gamification.py # Stats, progress, analytics
│   │   └── utils/              # Helper utilities
│   │       ├── pdf_parser.py   # PDF text extraction
│   │       ├── chunker.py      # Text chunking for RAG
│   │       ├── vector_store.py # ChromaDB operations
│   │       ├── gemini_client.py # Gemini API client
│   │       ├── quiz_generator.py # Quiz generation logic
│   │       ├── grader.py       # Quiz grading (MCQ + Essay)
│   │       ├── badge_checker.py # Badge unlock logic
│   │       ├── insight_generator.py # AI insights
│   │       ├── gcs_storage.py  # Google Cloud Storage
│   │       └── cache.py        # Redis cache utilities
│   ├── chroma_db/              # ChromaDB vector storage (gitignored)
│   ├── uploads/                # Temporary file uploads (gitignored)
│   ├── Dockerfile              # Docker image definition
│   ├── deploy-cloudrun.sh      # Cloud Run deployment script
│   ├── requirements.txt        # Python dependencies
│   └── .env                    # Environment variables (gitignored)
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── pages/              # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Topics.jsx
│   │   │   ├── TopicDetail.jsx
│   │   │   ├── TopicChat.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── QuizGenerate.jsx
│   │   │   ├── QuizTake.jsx
│   │   │   ├── QuizResult.jsx  # With PDF/CSV export
│   │   │   ├── QuizList.jsx    # With export all
│   │   │   └── Analytics.jsx   # Heatmap + Radar chart
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── ChatMessage.jsx
│   │   │   ├── Skeleton.jsx    # Loading states
│   │   │   ├── ThemeToggle.jsx
│   │   │   └── ...
│   │   ├── api/                # API client modules
│   │   │   ├── client.js       # Axios instance
│   │   │   ├── auth.js
│   │   │   ├── topics.js
│   │   │   ├── documents.js
│   │   │   ├── chat.js
│   │   │   ├── quiz.js
│   │   │   └── gamification.js
│   │   ├── contexts/           # React contexts
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── utils/              # Utility functions
│   │   │   ├── errorHandler.js
│   │   │   └── exportUtils.js  # PDF/CSV export
│   │   ├── data/               # Static data
│   │   ├── App.jsx             # Main app component
│   │   └── main.jsx            # React entry point
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── firebase.json           # Firebase Hosting config
│
├── database/
│   └── eduvate_db.sql          # PostgreSQL schema dump
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (or Supabase account)
- Google Gemini API Key
- Google Cloud Project (for GCS)
- Upstash Redis account (optional, for caching)
- Docker (for deployment)

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Create virtual environment:**
```bash
python -m venv venv

# Linux/Mac
source venv/bin/activate

# Windows
venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Create `.env` file:**
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

5. **Setup database:**
```bash
# Create database in PostgreSQL or use Supabase
# Import schema from database/eduvate_db.sql
psql -U postgres -d eduvate_db -f database/eduvate_db.sql
```

6. **Start development server:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs on: `http://localhost:8000`  
API Docs (Swagger): `http://localhost:8000/docs`  
Alternative Docs (ReDoc): `http://localhost:8000/redoc`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create `.env` file:**
```env
VITE_API_URL=http://localhost:8000
```

4. **Start development server:**
```bash
npm run dev
```

Frontend runs on: `http://localhost:5173`

5. **Build for production:**
```bash
npm run build
```

---

## 🔌 API Endpoints Reference

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user profile

### Topics
- `POST /topics` - Create new topic
- `GET /topics` - List all user topics
- `GET /topics/{id}` - Get topic details with documents
- `PUT /topics/{id}` - Update topic
- `DELETE /topics/{id}` - Delete topic

### Documents  
- `POST /docs/upload` - Upload PDF document to topic
- `GET /docs` - List user documents (optional topic filter)
- `GET /docs/{id}` - Get document details
- `DELETE /docs/{id}` - Delete document and vector embeddings

### Chat (RAG)
- `POST /chat/sessions` - Create chat session for topic
- `GET /chat/sessions` - List user chat sessions
- `GET /chat/sessions/{id}` - Get session with messages
- `POST /chat/sessions/{id}/messages` - Send message (streaming)
- `DELETE /chat/sessions/{id}` - Delete chat session

### Quiz
- `POST /quiz/generate` - Generate quiz from topic documents
- `GET /quiz` - List user quizzes (optional topic filter)
- `GET /quiz/{id}` - Get quiz with questions (for taking)
- `GET /quiz/{id}/submissions` - Get all attempts for a quiz
- `GET /quiz/submission/{submission_id}` - Get submission detail with answers
- `POST /quiz/{id}/submit` - Submit quiz answers and get grading
- `GET /quiz/history/me` - Get quiz submission history
- `DELETE /quiz/{id}` - Delete quiz

### Gamification & Analytics
- `GET /me/dashboard` - Combined endpoint (stats + progress + topics)
- `GET /me/progress` - XP, level, badges, streaks
- `GET /me/stats` - Overview statistics
- `GET /me/topic-understanding` - Understanding per topic with AI insights
- `GET /me/analytics/xp-history` - XP gain over time (chart data)
- `GET /me/analytics/quiz-performance` - Quiz scores trend analysis
- `GET /me/analytics/activity-summary` - Activity breakdown and recent activities
- `GET /me/analytics/daily-activity` - Daily activity for heatmap (90 days)

---

## 🎯 Technical Deep Dive

### RAG (Retrieval-Augmented Generation)

EduVate uses a sophisticated RAG pipeline to provide accurate, context-aware answers:

**1. Document Processing:**
- PDF text extraction with PyPDF2
- Text chunking using RecursiveCharacterTextSplitter (500 chars, 50 overlap)
- Sentence embeddings with `all-MiniLM-L6-v2` model
- Metadata preservation (page numbers, document IDs)

**2. Vector Storage:**
- ChromaDB for persistent vector database
- Separate collections per topic for efficient retrieval
- Cosine similarity search for semantic matching

**3. Query Flow:**
```
User Question
    ↓
Semantic Search (ChromaDB - top 5 chunks)
    ↓
Context + Question → Gemini 1.5 Flash
    ↓
Answer with Citations & Page Numbers
```

### Performance Optimizations

**Redis Caching Strategy:**
- Dashboard data cached for 5 minutes
- User stats cached for 5 minutes
- Cache invalidation on data mutations (quiz submission)
- Result: 60-80% faster dashboard loads

**Database Optimization:**
- 10 strategic indexes on high-traffic queries
- Foreign key indexes for JOIN performance
- Composite indexes on frequently filtered columns
- Sort column indexes (created_at, submitted_at)
- Result: 3-10x faster query performance

**Optimistic UI Pattern:**
```javascript
// Immediate update → API call → Rollback on error
const deleteItem = async (id) => {
  const backup = items;
  setItems(items.filter(i => i.id !== id)); // Instant feedback
  try {
    await api.delete(id);
  } catch {
    setItems(backup); // Rollback on error
  }
};
```

### Quiz Generation & Grading

**MCQ Generation:**
- Gemini extracts key concepts from document chunks
- Generates 4 plausible options with distractors
- Linked to specific page references

**Essay Generation:**
- Open-ended questions targeting comprehension
- Rubric keywords for automated scoring
- AI feedback on answer quality

**Grading Logic:**
- MCQ: Exact string match (A, B, C, D)
- Essay: Keyword presence + Gemini evaluation
- Points distribution based on question type

### Gamification Mathematics

**XP Calculation:**
```
Base XP per quiz: 20
+ (Correct MCQ × 5)
+ (High-scoring Essay × 10)
```

**Level Progression (Exponential):**
```
Level 1: 0 - 99 XP (need 100)
Level 2: 100 - 299 XP (need 200 total)
Level 3: 300 - 599 XP (need 300 total)
Level N: XP needed = N × 100
```

**Badges Unlock Conditions:**
- `first_steps`: Upload 1+ document
- `quiz_novice`: Complete 1+ quiz
- `quiz_master`: Complete 10+ quizzes
- `perfect_score`: Score 100% on any quiz
- `week_warrior`: 7-day consecutive streak
- `scholar`: Reach level 5

---

## 📊 Export Functionality

### PDF Export Features
- Professional report layout with EduVate branding
- Color-coded score indicators (green >80%, blue 60-80%, red <60%)
- Detailed question-by-question breakdown
- MCQ: Visual highlighting of correct/incorrect answers
- Essay: User answer + AI feedback in colored boxes
- Page numbers and generation timestamp
- Multi-page support with automatic pagination

### CSV Export Features
- Analytics-ready format for data analysis
- Complete question metadata
- Per-question performance breakdown
- Summary statistics
- Compatible with Excel, Google Sheets, Tableau
- Quiz history export with all attempts

---

## 🚢 Deployment

### Backend (Google Cloud Run)

1. **Build Docker image:**
```bash
docker build -t asia-southeast2-docker.pkg.dev/PROJECT_ID/eduvate/backend:latest .
```

2. **Push to Artifact Registry:**
```bash
docker push asia-southeast2-docker.pkg.dev/PROJECT_ID/eduvate/backend:latest
```

3. **Deploy to Cloud Run:**
```bash
gcloud run deploy eduvate-backend \
  --image asia-southeast2-docker.pkg.dev/PROJECT_ID/eduvate/backend:latest \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --memory 2Gi \
  --set-env-vars DATABASE_URL=...,GEMINI_API_KEY=..., (all env vars)
```

Or use the deployment script:
```bash
bash deploy-cloudrun.sh
```

### Frontend (Firebase Hosting)

1. **Build production bundle:**
```bash
cd frontend
npm run build
```

2. **Deploy to Firebase:**
```bash
firebase deploy --only hosting
```

---

## 🔒 Security Considerations

- JWT-based authentication with token expiration
- Password hashing with bcrypt
- CORS configuration for allowed origins
- SQL injection prevention with parameterized queries
- File upload validation (size, type)
- Environment variables for sensitive data
- `.gitignore` for credentials and secrets

**⚠️ IMPORTANT:** Never commit `.env`, `gcs-key.json`, or any credentials to version control!

---

## 📝 License

Proprietary - SEVENT 9.0 Competition Project

---

## 👥 Team

Project developed for SEVENT 9.0 Software Engineering Event  
Theme: **AI for New Opportunities**

---

## 🙏 Acknowledgments

- Google Gemini API for AI capabilities
- LangChain for RAG pipeline framework
- ChromaDB for vector storage
- Supabase for managed PostgreSQL
- Upstash for serverless Redis
- SEVENT 9.0 for the opportunity

---

## 📞 Support

For technical issues or questions about the competition submission, please contact the development team.

**Built with ❤️ for SEVENT 9.0**
