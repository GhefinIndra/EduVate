import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { topicsAPI } from '../api/topics';
import { documentsAPI } from '../api/documents';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  ArrowLeft, Upload, FileText, MessageSquare, ClipboardList, Loader, Trash2, Sparkles, Brain
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function TopicDetail() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [topicId]);

  const fetchData = async () => {
    try {
      const [topicRes, docsRes] = await Promise.all([
        topicsAPI.getById(topicId),
        documentsAPI.list(topicId),
      ]);

      setTopic(topicRes.data);
      setDocuments(docsRes.data.documents || []);
    } catch (error) {
      toast.error('Failed to load topic');
      navigate('/topics');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }

    setUploading(true);
    try {
      await documentsAPI.upload(file, topicId);
      toast.success('Document uploaded successfully!');
      fetchData();
    } catch (error) {
      const message = error.response?.data?.detail || 'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const handleDeleteDocument = async (docId, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;

    try {
      await documentsAPI.delete(docId);
      toast.success('Document deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete document');
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
          <button
            onClick={() => navigate('/topics')}
            className="flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-4 transition"
          >
            <ArrowLeft size={20} />
            <span>Back to Topics</span>
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{topic?.name}</h1>
              {topic?.description && (
                <p className="text-gray-600 max-w-2xl">{topic.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card
              hover={documents.length > 0}
              className={`p-6 ${documents.length === 0 ? 'opacity-50' : ''}`}
              onClick={documents.length > 0 ? () => navigate(`/topics/${topicId}/chat`) : undefined}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                  <MessageSquare className="text-blue-600" size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Chat</h3>
                  <p className="text-sm text-gray-500">Ask questions</p>
                </div>
              </div>
              {documents.length === 0 && (
                <p className="text-xs text-gray-400">Upload documents first</p>
              )}
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card
              hover={documents.length > 0}
              className={`p-6 ${documents.length === 0 ? 'opacity-50' : ''}`}
              onClick={documents.length > 0 ? () => navigate(`/topics/${topicId}/quiz`) : undefined}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
                  <Sparkles className="text-primary-600" size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Generate Quiz</h3>
                  <p className="text-sm text-gray-500">Test your knowledge</p>
                </div>
              </div>
              {documents.length === 0 && (
                <p className="text-xs text-gray-400">Upload documents first</p>
              )}
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card hover className="p-6" onClick={() => navigate(`/topics/${topicId}/quizzes`)}>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-secondary-100 to-secondary-200 rounded-xl">
                  <ClipboardList className="text-secondary-600" size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">View Quizzes</h3>
                  <p className="text-sm text-gray-500">See your history</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Upload Zone */}
        <Card className="mb-8">
          <div
            {...getRootProps()}
            className={`p-8 text-center cursor-pointer transition rounded-xl ${
              isDragActive
                ? 'bg-gradient-to-br from-primary-50 to-secondary-50'
                : 'hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              isDragActive
                ? 'bg-gradient-to-br from-primary-100 to-secondary-100'
                : 'bg-gray-100'
            }`}>
              <Upload className={isDragActive ? 'text-primary-600' : 'text-gray-400'} size={32} />
            </div>
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader className="animate-spin text-primary-600" size={20} />
                <p className="text-gray-600 font-medium">Uploading...</p>
              </div>
            ) : (
              <>
                <p className="text-gray-900 font-semibold mb-2 text-lg">
                  {isDragActive ? 'Drop PDF here' : 'Upload Documents'}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Drag & drop PDF files or click to browse
                </p>
                <p className="text-xs text-gray-400">Maximum file size: 20MB</p>
              </>
            )}
          </div>
        </Card>

        {/* Documents */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Documents
            </h2>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              {documents.length}
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-gray-300" size={40} />
              </div>
              <p className="text-gray-500 font-medium">No documents yet</p>
              <p className="text-sm text-gray-400 mt-1">Upload PDFs to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card hover className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex-shrink-0">
                        <FileText className="text-blue-600" size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                        <p className="text-sm text-gray-500">{doc.pages} pages</p>
                      </div>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium flex-shrink-0 ${
                          doc.status === 'ready'
                            ? 'bg-green-100 text-green-700'
                            : doc.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {doc.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc.id, doc.title);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                        title="Delete document"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
