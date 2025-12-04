import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, Trophy, Star, TrendingUp } from 'lucide-react';
import Button from './Button';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

export default function QuizSubmitModal({ isOpen, onClose, onConfirm, questionCount, unansweredCount = 0 }) {
  useEffect(() => {
    if (isOpen) {
      // Trigger confetti animation
      const duration = 2 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        }));
        confetti(Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        }));
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-primary-200 dark:border-primary-800"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 z-10"
            >
              <X size={20} />
            </button>

            {/* Header with gradient */}
            <div className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 p-8 text-center overflow-hidden">
              {/* Animated background shapes */}
              <div className="absolute top-0 left-0 w-full h-full opacity-20">
                <motion.div
                  className="absolute top-4 left-4 w-16 h-16 bg-white rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <motion.div
                  className="absolute bottom-4 right-4 w-20 h-20 bg-white rounded-full"
                  animate={{
                    scale: [1.2, 1, 1.2],
                    opacity: [0.6, 0.3, 0.6]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>

              {/* Trophy icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', bounce: 0.6 }}
                className="relative inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4"
              >
                <Trophy className="text-white" size={40} />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-2">Ready to Submit?</h2>
              <p className="text-white/90 text-sm">
                {unansweredCount > 0
                  ? `${unansweredCount} question(s) unanswered. Continue anyway?`
                  : `You've completed all ${questionCount} questions!`
                }
              </p>
            </div>

            {/* Body */}
            <div className="p-8">
              <div className="space-y-4 mb-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl">
                    <Star className="text-blue-600 dark:text-blue-400 mx-auto mb-1" size={20} />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{questionCount}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Questions</p>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl">
                    <CheckCircle2 className="text-green-600 dark:text-green-400 mx-auto mb-1" size={20} />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{questionCount - unansweredCount}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Answered</p>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl">
                    <TrendingUp className="text-purple-600 dark:text-purple-400 mx-auto mb-1" size={20} />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">+XP</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Reward</p>
                  </div>
                </div>

                {/* Warning message */}
                {unansweredCount > 0 ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
                    <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                      ⚠️ {unansweredCount} question(s) are unanswered. These will be marked as incorrect.
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                      ⚠️ You won't be able to change your answers after submission
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  size="lg"
                >
                  Review Again
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={onConfirm}
                  className="flex-1"
                  size="lg"
                  icon={CheckCircle2}
                >
                  Submit Quiz
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
