# EduVate Frontend - AI Learning Companion

Frontend application untuk EduVate (SEVENT 9.0 Software Development Competition)  
**Tagline:** "Elevate Your Learning with AI"

## Tech Stack

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

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Create `.env` file di root frontend directory:

```env
VITE_API_URL=http://localhost:8000
```

For production:
```env
VITE_API_URL=https://your-backend-url.a.run.app
```

### 3. Run Development Server

```bash
npm run dev
```

Frontend runs on: `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

Build output di `dist/` folder.

## Project Structure

```
frontend/
├── src/
│   ├── pages/              # Page components
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Topics.jsx
│   │   ├── TopicDetail.jsx
│   │   ├── TopicChat.jsx
│   │   ├── QuizGenerate.jsx
│   │   ├── QuizTake.jsx
│   │   ├── QuizResult.jsx  # With PDF/CSV export
│   │   ├── QuizList.jsx    # With export all
│   │   └── Analytics.jsx   # Heatmap + Radar chart
│   ├── components/         # Reusable UI components
│   │   ├── Layout.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Card.jsx
│   │   ├── Button.jsx
│   │   ├── ChatMessage.jsx
│   │   ├── Skeleton.jsx    # Loading states
│   │   └── ...
│   ├── api/                # API client modules
│   │   ├── client.js       # Axios instance
│   │   ├── auth.js
│   │   ├── topics.js
│   │   ├── documents.js
│   │   ├── chat.js
│   │   ├── quiz.js
│   │   └── gamification.js
│   ├── contexts/           # React contexts
│   │   ├── AuthContext.jsx
│   │   └── ThemeContext.jsx
│   ├── utils/              # Utility functions
│   │   ├── errorHandler.js
│   │   └── exportUtils.js  # PDF/CSV export
│   ├── App.jsx             # Main app component
│   └── main.jsx            # React entry point
├── public/                 # Static assets
├── package.json
├── vite.config.js
├── tailwind.config.js
└── firebase.json           # Firebase Hosting config
```

## Key Features

### 🎨 UI/UX
- **Responsive Design** for mobile and desktop
- **Dark Mode Support** with persistent theme
- **Skeleton Loading States** for smooth loading experience
- **Optimistic UI Updates** for instant user feedback
- **Framer Motion Animations** for smooth transitions

### 📊 Analytics Dashboard
- **Activity Heatmap** - GitHub-style 90-day calendar showing daily activity
- **Skill Radar Chart** - Topic understanding visualization (min 3 topics)
- **Performance Trends** - XP history, quiz scores over time
- **Stats Overview** - Topics, documents, quizzes, average scores

### 📥 Export Functionality
- **Export Quiz Results to PDF** - Professional report with branding, color-coded scores
- **Export Quiz Results to CSV** - Analytics-ready format for data analysis
- **Export All Quizzes** - Bulk export quiz history to CSV

### 💬 RAG-Powered Chat
- **Context-Aware Responses** with source citations and page numbers
- **Multi-Document Retrieval** across topics
- **Streaming Responses** for better UX
- **Chat History** and session management

### 📝 Quiz Features
- **AI Quiz Generation** from uploaded documents
- **Multiple Choice Questions** (MCQ) with 4 options
- **Essay Questions** with AI-powered grading
- **Instant Grading** with performance analytics
- **Quiz History** tracking per topic

### 🎮 Gamification
- **XP and Leveling System** with progress tracking
- **Badges and Achievements** unlock system
- **Learning Streaks** with daily activity tracking
- **Topic Mastery** with understanding percentage

## Deployment

### Firebase Hosting

1. **Install Firebase CLI:**
```bash
npm install -g firebase-tools
```

2. **Login to Firebase:**
```bash
firebase login
```

3. **Initialize Firebase (if not already):**
```bash
firebase init hosting
```
- Select existing project or create new
- Set public directory: `dist`
- Configure as single-page app: Yes
- Don't overwrite `dist/index.html`

4. **Build and Deploy:**
```bash
npm run build
firebase deploy --only hosting
```

Your app will be live at: `https://your-project.web.app`

## Development

**Event:** SEVENT 9.0 - Software Engineering Event  
**Theme:** AI for New Opportunities  
**Built with:** ❤️ and React
