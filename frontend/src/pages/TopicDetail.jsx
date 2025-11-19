import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { topicsAPI } from '../api/topics';
import { documentsAPI } from '../api/documents';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import PDFViewer from '../components/PDFViewer';
import ConfirmDialog from '../components/ConfirmDialog';
import { DocumentCardSkeleton } from '../components/Skeleton';
import {
  ArrowLeft, Upload, FileText, MessageSquare, ClipboardList, Trash2, Sparkles, Brain, Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import { handleApiError, handleUploadError } from '../utils/errorHandler';

export default function TopicDetail() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, docId: null, title: '' });

  useEffect(() => {
    fetchData();
  }, [topicId]);

  // 🔥 Auto-refresh for processing documents
  useEffect(() => {
    const hasProcessingDocs = documents.some(doc => doc.status === 'processing');
    
    if (hasProcessingDocs) {
      const interval = setInterval(() => {
        fetchData();
      }, 5000); // Refresh every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [documents]);

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
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    // Validate all files first
    const validFiles = [];
    const maxSize = 20 * 1024 * 1024;

    for (const file of acceptedFiles) {
      if (file.type !== 'application/pdf') {
        toast.error(`${file.name} is not a PDF file`);
        continue;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds 20MB limit`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Initialize progress tracking
    setUploadProgress(validFiles.map(file => ({
      name: file.name,
      status: 'uploading',
      message: 'Uploading...'
    })));
    setUploading(true);

    try {
      const response = await documentsAPI.uploadBatch(validFiles, topicId);
      
      // Defensive check for response structure
      if (!response || !response.data || !response.data.results) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid server response');
      }

      const results = response.data.results;

      // Update progress with results
      setUploadProgress(results.map(result => ({
        name: result.filename,
        status: result.success ? 'success' : 'error',
        message: result.message,
        error: result.error
      })));

      // Show summary toast
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      if (failedCount === 0) {
        toast.success(`Successfully uploaded ${successCount} document${successCount > 1 ? 's' : ''}!`);
      } else if (successCount === 0) {
        toast.error(`Failed to upload all documents`);
      } else {
        toast(`Uploaded ${successCount} document${successCount > 1 ? 's' : ''}, ${failedCount} failed`, {
          icon: '⚠️'
        });
      }

      // Clear progress and refresh data
      setTimeout(() => {
        setUploadProgress([]);
        setUploading(false);
        fetchData(); // Refresh after progress cleared
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress([]);
      setUploading(false);
      handleUploadError(error);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  const handleDeleteDocument = async (docId, title) => {
    setConfirmDialog({ isOpen: true, docId, title });
  };

  const confirmDelete = async () => {
    const docIdToDelete = confirmDialog.docId;
    setConfirmDialog({ isOpen: false, docId: null, title: '' });
    
    // Optimistic update - remove from UI immediately
    const previousDocuments = [...documents];
    setDocuments(documents.filter(d => d.id !== docIdToDelete));
    
    const toastId = toast.loading('Deleting document...');
    
    try {
      await documentsAPI.delete(docIdToDelete);
      toast.success('Document deleted!', { id: toastId });
    } catch (error) {
      // Rollback on error
      setDocuments(previousDocuments);
      toast.error('Failed to delete document', { id: toastId });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 max-w-7xl mx-auto">
          {/* Back Button Skeleton */}
          <div className="mb-8">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse"></div>
            <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse"></div>
            <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>

          {/* Action Buttons Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
          </div>

          {/* Documents Section Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse"></div>
            <div className="space-y-4">
              <DocumentCardSkeleton />
              <DocumentCardSkeleton />
              <DocumentCardSkeleton />
            </div>
          </div>
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
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 mb-4 transition"
          >
            <ArrowLeft size={20} />
            <span>Back to Topics</span>
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{topic?.name}</h1>
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
                  <h3 className="font-bold text-gray-900 dark:text-white">Chat</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ask questions</p>
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
                  <h3 className="font-bold text-gray-900 dark:text-white">Generate Quiz</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Test your knowledge</p>
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
                  <h3 className="font-bold text-gray-900 dark:text-white">View Quizzes</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">See your history</p>
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
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <input {...getInputProps()} />
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              isDragActive
                ? 'bg-gradient-to-br from-primary-100 to-secondary-100'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <Upload className={isDragActive ? 'text-primary-600' : 'text-gray-400'} size={32} />
            </div>
            {uploading && uploadProgress.length > 0 ? (
              <div className="space-y-3 max-w-md mx-auto">
                <p className="text-gray-900 dark:text-white font-semibold mb-3">
                  Uploading {uploadProgress.filter(p => p.status !== 'success' && p.status !== 'error').length} / {uploadProgress.length} files
                </p>
                {uploadProgress.map((progress, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {progress.status === 'uploading' && (
                          <Loader className="animate-spin text-blue-600" size={18} />
                        )}
                        {progress.status === 'success' && (
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        {progress.status === 'error' && (
                          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate mb-1">{progress.name}</p>
                        {progress.status === 'error' ? (
                          <p className="text-xs text-red-600">{progress.error || progress.message}</p>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{progress.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {uploadProgress.some(p => p.status === 'error') && (
                  <button
                    onClick={() => {
                      const failedFiles = uploadProgress
                        .filter(p => p.status === 'error')
                        .map((p, i) => new File([new Blob()], p.name, { type: 'application/pdf' }));
                      if (failedFiles.length > 0) {
                        toast('Retry feature coming soon!', { icon: '🔄' });
                      }
                    }}
                    className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    Retry Failed ({uploadProgress.filter(p => p.status === 'error').length})
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="text-gray-900 dark:text-white font-semibold mb-2 text-lg">
                  {isDragActive ? 'Drop PDFs here' : 'Upload Documents'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Drag & drop PDF files or click to browse (multiple files supported)
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Maximum file size: 20MB per file</p>
              </>
            )}
          </div>
        </Card>

        {/* Documents */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Documents
            </h2>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
              {documents.length}
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-gray-300" size={40} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No documents yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Upload PDFs to get started!</p>
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
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{doc.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{doc.pages} pages</p>
                        
                        {doc.status === 'processing' && doc.processing_progress !== undefined && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-blue-600 font-medium">
                                {doc.processing_step || 'Processing...'}
                              </span>
                              <span className="text-xs text-blue-600 font-bold">
                                {doc.processing_progress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${doc.processing_progress}%` }}
                              />
                            </div>
                          </div>
                        )}
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

                      {/* Preview Button */}
                      {doc.status === 'ready' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPdf({
                              url: `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/docs/${doc.id}/file`,
                              title: doc.title
                            });
                          }}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition flex-shrink-0"
                          title="Preview PDF"
                        >
                          <Eye size={18} />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc.id, doc.title);
                        }}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition flex-shrink-0"
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

      {/* PDF Viewer Modal */}
      {selectedPdf && (
        <PDFViewer
          pdfUrl={selectedPdf.url}
          title={selectedPdf.title}
          onClose={() => setSelectedPdf(null)}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, docId: null, title: '' })}
        onConfirm={confirmDelete}
        title="Delete Document"
        message={`Delete "${confirmDialog.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </Layout>
  );
}
