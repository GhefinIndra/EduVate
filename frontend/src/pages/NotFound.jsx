import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';
import Button from '../components/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        {/* 404 Illustration */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="relative inline-block">
            <div className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-primary-500 to-secondary-600">
              404
            </div>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-4 -right-4"
            >
              <Search className="w-12 h-12 text-primary-400 opacity-50" />
            </motion.div>
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Page Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button
            onClick={() => navigate(-1)}
            variant="secondary"
            icon={ArrowLeft}
          >
            Go Back
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            icon={Home}
          >
            Back to Dashboard
          </Button>
        </motion.div>

        {/* Suggestion Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            You might be looking for:
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/topics')}
              className="px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
            >
              Topics
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
            >
              Analytics
            </button>
            <button
              onClick={() => navigate('/leaderboard')}
              className="px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
            >
              Leaderboard
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
