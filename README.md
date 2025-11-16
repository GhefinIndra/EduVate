# Eduvate - AI-Powered Learning Companion

**Tagline:** "Elevate Your Learning with AI"

AI-powered platform designed to enhance student learning through intelligent document analysis, interactive Q&A, and personalized quizzes.

Built for SEVENT 9.0 Software Development Competition.

---

## Features

### 1. Document Management
- Upload and organize learning materials (PDF support)
- Topic-based organization for better content structure
- Multi-document support per topic

### 2. AI Chat (RAG-Powered)
- Conversational AI assistant for learning materials
- Context-aware responses with source citations
- Multi-document retrieval across topics
- Chat history and session management

### 3. AI Quiz Generation
- Automatic quiz generation from uploaded documents
- Multiple choice questions with detailed explanations
- Instant grading and feedback
- Performance tracking

### 4. Gamification
- XP and leveling system
- Badges and achievements
- Learning streaks
- Topic mastery tracking
- Document understanding metrics

---

## Tech Stack

### Backend
- **Framework:** FastAPI (Python)
- **Database:** MySQL
- **Vector DB:** ChromaDB (for RAG)
- **AI/LLM:** Google Gemini API
- **Auth:** JWT (JSON Web Tokens)
- **Additional:** LangChain for RAG pipeline

### Frontend
- **Framework:** React + Vite
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **State:** React Context API

### Deployment
- **Backend:** Google Cloud Run
- **Frontend:** Firebase Hosting
- **Database:** MySQL (Cloud Hosted)

---

## Project Structure

```
sevent-lomba/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI app entry
│   │   ├── auth.py         # JWT authentication
│   │   ├── config.py       # Environment config
│   │   ├── database.py     # MySQL connection pool
│   │   ├── models/         # Pydantic models
│   │   ├── routes/         # API endpoints
│   │   └── utils/          # Helper functions
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── api/           # API client
│   │   ├── contexts/      # React contexts
│   │   ├── data/          # Static data
│   │   └── App.jsx        # Main app component
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- MySQL 8.0+
- Google Gemini API Key

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file:
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=eduvate_db

# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# JWT
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Storage
CHROMA_PATH=./chroma_db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=20
```

5. Run database migrations (execute SQL files in database folder)

6. Start server:
```bash
uvicorn app.main:app --reload
```

Backend will run on `http://localhost:8000`

API Docs: `http://localhost:8000/api-docs`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
VITE_API_URL=http://localhost:8000
```

4. Start development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

---

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token

### Topics
- `POST /topics` - Create new topic
- `GET /topics` - List all user topics
- `GET /topics/{id}` - Get topic details
- `DELETE /topics/{id}` - Delete topic

### Documents
- `POST /docs/upload` - Upload PDF document
- `GET /docs` - List user documents
- `GET /docs/{id}` - Get document details
- `DELETE /docs/{id}` - Delete document

### Chat (RAG)
- `POST /chat/sessions` - Create chat session
- `GET /chat/sessions` - List chat sessions
- `POST /chat/sessions/{id}/messages` - Send message
- `GET /chat/sessions/{id}/messages` - Get chat history

### Quiz
- `POST /quiz/generate` - Generate quiz from document
- `GET /quiz/{id}` - Get quiz questions
- `POST /quiz/{id}/submit` - Submit quiz answers
- `GET /quiz/history` - Get quiz history

### Gamification
- `GET /me/stats` - Get user stats (XP, level, badges)
- `GET /me/progress` - Get learning progress
- `GET /me/topic-understanding` - Get topic understanding metrics

---

## Key Features Explained

### RAG (Retrieval-Augmented Generation)
Uses LangChain + ChromaDB + Gemini to provide accurate, context-aware answers:
1. Document chunks stored in ChromaDB vector database
2. User question retrieves relevant chunks via semantic search
3. Gemini generates answer based on retrieved context
4. Citations provided with page numbers

### Multi-Document Chat
- Group documents by topics
- Chat across multiple documents simultaneously
- Retrieve relevant information from all documents in a topic

### Gamification System
- **XP System:** Earn XP from chats, quizzes, document uploads
- **Levels:** Progress through levels based on total XP
- **Badges:** Unlock achievements for milestones
- **Streaks:** Daily login rewards
- **Mastery:** Track understanding per topic and document

---

## Environment Variables

### Backend (.env)
```env
DB_HOST=<mysql-host>
DB_PORT=3306
DB_USER=<mysql-user>
DB_PASSWORD=<mysql-password>
DB_NAME=eduvate_db
GEMINI_API_KEY=<your-gemini-api-key>
SECRET_KEY=<jwt-secret-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CHROMA_PATH=./chroma_db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=20
```

### Frontend (.env)
```env
VITE_API_URL=<backend-url>
```

---

## Deployment

See backend README for detailed deployment instructions to Google Cloud Run.

Frontend can be deployed to Firebase Hosting or any static hosting service.

---

## Contributing

This is a competition project for SEVENT 9.0.

---

## License

Proprietary - SEVENT 9.0 Competition Project

---

## Team

Project developed for SEVENT 9.0 Software Engineering Event
Theme: AI for New Opportunities

---

## Acknowledgments

- Google Gemini API for AI capabilities
- LangChain for RAG pipeline
- ChromaDB for vector storage
- SEVENT 9.0 for the opportunity
