import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { documentsAPI } from '../api/documents';
import { FileText, Upload, Trash2, MessageSquare, ClipboardList, Loader } from 'lucide-react';

export default function Documents() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await documentsAPI.list();
      console.log('Documents response:', response.data); // DEBUG
      setDocuments(response.data.documents || []); // Safety: default to empty array
    } catch (error) {
      console.error('Fetch documents error:', error); // DEBUG
      toast.error('Failed to load documents');
      setDocuments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const onDrop = async (acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    // Validate all files
    const invalidFiles = acceptedFiles.filter(file => file.type !== 'application/pdf');
    if (invalidFiles.length > 0) {
      toast.error('Only PDF files are allowed');
      return;
    }

    const oversizedFiles = acceptedFiles.filter(file => file.size > 20 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('All files must be less than 20MB');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const file of acceptedFiles) {
        try {
          await documentsAPI.upload(file);
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }

      // Show summary toast
      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully uploaded ${successCount} document${successCount > 1 ? 's' : ''}!`);
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`Uploaded ${successCount} document${successCount > 1 ? 's' : ''}, ${failCount} failed`);
      } else {
        toast.error('Failed to upload documents');
      }

      fetchDocuments();
    } catch (error) {
      toast.error('Upload process failed');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,  // Enable multiple file upload
  });

  const handleDelete = async (docId, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;

    try {
      await documentsAPI.delete(docId);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">Documents</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 mb-8 text-center cursor-pointer transition ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto text-gray-400 mb-4" size={48} />
          {uploading ? (
            <p className="text-gray-600">Uploading documents...</p>
          ) : (
            <>
              <p className="text-gray-700 font-medium mb-2">
                {isDragActive ? 'Drop PDF files here' : 'Drag & drop PDF files here'}
              </p>
              <p className="text-sm text-gray-500">or click to select files (max 20MB each, multiple files supported)</p>
            </>
          )}
        </div>

        {/* Documents Grid */}
        {documents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="mx-auto text-gray-300 mb-4" size={64} />
            <p className="text-gray-600">No documents yet. Upload your first PDF!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                <div className="flex items-start justify-between mb-4">
                  <FileText className="text-blue-600 flex-shrink-0" size={32} />
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      doc.status === 'ready'
                        ? 'bg-green-100 text-green-700'
                        : doc.status === 'processing'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>

                <h3 className="font-medium text-gray-900 mb-2 line-clamp-2" title={doc.title}>
                  {doc.title}
                </h3>

                <p className="text-sm text-gray-600 mb-4">{doc.pages} pages</p>

                {/* Action Buttons */}
                {doc.status === 'ready' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/chat/${doc.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                    >
                      <MessageSquare size={16} />
                      Chat
                    </button>
                    <button
                      onClick={() => navigate(`/quiz/generate?docId=${doc.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
                    >
                      <ClipboardList size={16} />
                      Quiz
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}