import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { topicsAPI } from '../api/topics';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  FolderOpen, Plus, Edit2, Trash2, Loader, X,
  FileText, MessageSquare, ClipboardList, Sparkles, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Topics() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const response = await topicsAPI.list();
      setTopics(response.data.topics || []);
    } catch (error) {
      toast.error('Failed to load topics');
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (topic = null) => {
    if (topic) {
      setEditingTopic(topic);
      setFormData({ name: topic.name, description: topic.description || '' });
    } else {
      setEditingTopic(null);
      setFormData({ name: '', description: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTopic(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Topic name is required');
      return;
    }

    try {
      if (editingTopic) {
        await topicsAPI.update(editingTopic.id, formData);
        toast.success('Topic updated successfully!');
      } else {
        await topicsAPI.create(formData);
        toast.success('Topic created successfully!');
      }

      handleCloseModal();
      fetchTopics();
    } catch (error) {
      const message = error.response?.data?.detail || 'Operation failed';
      toast.error(message);
    }
  };

  const handleDelete = async (topic) => {
    if (!window.confirm(`Delete "${topic.name}"? This will delete all documents, chats, and quizzes in this topic.`)) {
      return;
    }

    try {
      await topicsAPI.delete(topic.id);
      toast.success('Topic deleted');
      fetchTopics();
    } catch (error) {
      toast.error('Failed to delete topic');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader className="animate-spin text-primary-600" size={32} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Topics</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Organize your learning materials by topic</p>
            </div>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => handleOpenModal()}
            >
              Create Topic
            </Button>
          </div>
        </div>

        {topics.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/30 dark:to-secondary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderOpen className="text-primary-600 dark:text-primary-400" size={48} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No topics yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first topic to start organizing your learning materials</p>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => handleOpenModal()}
            >
              Create Your First Topic
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic, index) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="p-6"
                  hover
                  onClick={() => navigate(`/topics/${topic.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900/30 dark:to-secondary-900/30 rounded-xl">
                      <FolderOpen className="text-primary-600 dark:text-primary-400" size={28} />
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenModal(topic)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(topic)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1" title={topic.name}>
                    {topic.name}
                  </h3>

                  {topic.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {topic.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
                        <FileText size={14} />
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{topic.document_count || 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">docs</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
                        <MessageSquare size={14} />
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{topic.chat_count || 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">chats</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
                        <ClipboardList size={14} />
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{topic.quiz_count || 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">quizzes</p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                    Created {new Date(topic.created_at).toLocaleDateString()}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <Card className="p-8 shadow-2xl border border-gray-200 dark:border-gray-700">
                {/* Header with gradient */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl shadow-lg">
                      <FolderOpen className="text-white" size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {editingTopic ? 'Edit Topic' : 'Create New Topic'}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {editingTopic ? 'Update your topic details' : 'Organize your learning materials'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
                  >
                    <X size={22} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Topic Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Topic Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <BookOpen
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                      />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        placeholder="e.g., Python Programming, Web Development..."
                        maxLength={255}
                        required
                        autoFocus
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Sparkles size={12} />
                      Choose a clear, descriptive name for your topic
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Description <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all duration-200 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="Add notes about what this topic covers, your learning goals, or any other helpful information..."
                      rows={4}
                      maxLength={500}
                    />
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Help yourself remember what this topic is about</span>
                      <span>{formData.description.length}/500</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseModal}
                      className="flex-1"
                      size="lg"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1"
                      size="lg"
                      icon={editingTopic ? Edit2 : Plus}
                    >
                      {editingTopic ? 'Update Topic' : 'Create Topic'}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
