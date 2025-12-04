import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp, HelpCircle, Book, MessageSquare, FileText, Trophy } from 'lucide-react';

const faqCategories = [
  {
    title: 'Getting Started',
    icon: Book,
    questions: [
      {
        q: 'How do I create my first topic?',
        a: 'Navigate to the Dashboard and click "Create New Topic". Enter a name and description for your topic, then upload your study materials (PDF files) to get started.'
      },
      {
        q: 'What file formats are supported?',
        a: 'Currently, Eduvate supports PDF files for document uploads. Make sure your PDFs contain readable text for best results with the AI chat feature.'
      },
      {
        q: 'How do I organize my study materials?',
        a: 'Create separate topics for different subjects or courses. You can upload multiple documents to each topic, and they will all be available for AI chat and quiz generation.'
      }
    ]
  },
  {
    title: 'AI Chat',
    icon: MessageSquare,
    questions: [
      {
        q: 'How does the AI chat work?',
        a: 'The AI chat uses your uploaded documents to answer questions. It searches through your materials and provides responses with page references, so you can verify the information.'
      },
      {
        q: 'Can I chat with multiple documents at once?',
        a: 'Yes. When you start a chat session in a topic, the AI has access to all documents within that topic, allowing you to ask questions across multiple materials.'
      },
      {
        q: 'How accurate are the AI responses?',
        a: 'The AI generates responses based on your uploaded documents. Responses include page citations so you can always verify the information in the original material.'
      }
    ]
  },
  {
    title: 'Quizzes',
    icon: FileText,
    questions: [
      {
        q: 'How are quizzes generated?',
        a: 'Quizzes are automatically generated from your uploaded documents using AI. You can choose the number of multiple choice and essay questions when creating a quiz.'
      },
      {
        q: 'How is my quiz graded?',
        a: 'Multiple choice questions are graded instantly. Essay questions are evaluated by AI based on key concepts and rubrics, with detailed feedback provided for each answer.'
      },
      {
        q: 'Can I retake quizzes?',
        a: 'Yes, you can retake quizzes multiple times. Your XP will be updated if you achieve a higher score. This helps you learn and improve your understanding.'
      },
      {
        q: 'What happens to my XP when I retake a quiz?',
        a: 'If you score higher than your previous best, you will earn the difference in XP. If you score lower, your XP remains unchanged.'
      }
    ]
  },
  {
    title: 'Gamification & Progress',
    icon: Trophy,
    questions: [
      {
        q: 'How do I earn XP?',
        a: 'You earn XP by completing quizzes. Higher scores earn more XP: 50-69% earns 20 XP, 70-89% earns 35 XP, 90-99% earns 50 XP, and 100% earns 60 XP.'
      },
      {
        q: 'What are badges and how do I unlock them?',
        a: 'Badges are achievements earned by reaching milestones like maintaining study streaks, achieving perfect scores, or completing multiple quizzes. Check your progress page to see available badges.'
      },
      {
        q: 'How does the leaderboard work?',
        a: 'The leaderboard ranks users based on total XP earned. Compete with other learners and track your position. Your rank updates automatically as you earn more XP.'
      },
      {
        q: 'What is a study streak?',
        a: 'A study streak tracks consecutive days of activity on Eduvate. Maintain your streak by completing quizzes or chatting with your documents daily.'
      }
    ]
  }
];

export default function HelpModal({ isOpen, onClose }) {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  if (!isOpen) return null;

  const toggleCategory = (index) => {
    setExpandedCategory(expandedCategory === index ? null : index);
    setExpandedQuestion(null);
  };

  const toggleQuestion = (categoryIndex, questionIndex) => {
    const key = `${categoryIndex}-${questionIndex}`;
    setExpandedQuestion(expandedQuestion === key ? null : key);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
                <HelpCircle className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Help Center
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Frequently asked questions and guides
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {faqCategories.map((category, categoryIndex) => {
                const Icon = category.icon;
                const isExpanded = expandedCategory === categoryIndex;

                return (
                  <div
                    key={categoryIndex}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(categoryIndex)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {category.title}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {category.questions.length} questions
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {/* Questions */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 space-y-3">
                            {category.questions.map((item, questionIndex) => {
                              const key = `${categoryIndex}-${questionIndex}`;
                              const isQuestionExpanded = expandedQuestion === key;

                              return (
                                <div
                                  key={questionIndex}
                                  className="border-l-2 border-primary-200 dark:border-primary-800 pl-4"
                                >
                                  <button
                                    onClick={() => toggleQuestion(categoryIndex, questionIndex)}
                                    className="w-full text-left"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <h4 className="font-medium text-gray-900 dark:text-white">
                                        {item.q}
                                      </h4>
                                      {isQuestionExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                                      )}
                                    </div>
                                  </button>

                                  <AnimatePresence>
                                    {isQuestionExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                          {item.a}
                                        </p>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Footer Note */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Need more help?</strong> For technical issues or feature requests,
                please contact our support team or visit the documentation.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
