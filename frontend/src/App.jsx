import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

// Pages (will be created next)
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Topics from './pages/Topics';
import TopicDetail from './pages/TopicDetail';
import TopicChat from './pages/TopicChat';
import QuizGenerate from './pages/QuizGenerate';
import QuizTake from './pages/QuizTake';
import QuizResult from './pages/QuizResult';
import QuizList from './pages/QuizList';
import QuizDetail from './pages/QuizDetail';
import SubmissionReview from './pages/SubmissionReview';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      
      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/topics"
        element={
          <ProtectedRoute>
            <Topics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/topics/:topicId"
        element={
          <ProtectedRoute>
            <TopicDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/topics/:topicId/chat"
        element={
          <ProtectedRoute>
            <TopicChat />
          </ProtectedRoute>
        }
      />

      <Route
        path="/topics/:topicId/quiz"
        element={
          <ProtectedRoute>
            <QuizGenerate />
          </ProtectedRoute>
        }
      />

      <Route
        path="/topics/:topicId/quizzes"
        element={
          <ProtectedRoute>
            <QuizList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz/:quizId/detail"
        element={
          <ProtectedRoute>
            <QuizDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz/:quizId"
        element={
          <ProtectedRoute>
            <QuizTake />
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz/:quizId/result"
        element={
          <ProtectedRoute>
            <QuizResult />
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz/submission/:submissionId/review"
        element={
          <ProtectedRoute>
            <SubmissionReview />
          </ProtectedRoute>
        }
      />

        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;