import { useState, useEffect } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { documentsAPI } from '../api/documents';
import PDFViewer from './PDFViewer';

export default function Citation({ citation }) {
  const [document, setDocument] = useState(null);
  const [showPDF, setShowPDF] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);

  // Fetch document details to get title
  useEffect(() => {
    if (citation.doc_id) {
      fetchDocument();
    }
  }, [citation.doc_id]);

  const fetchDocument = async () => {
    setLoadingDoc(true);
    try {
      const response = await documentsAPI.getById(citation.doc_id);
      setDocument(response.data);
    } catch (error) {
      console.error('Failed to fetch document:', error);
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleClick = () => {
    if (document && document.status === 'ready') {
      setShowPDF(true);
    }
  };

  const pdfUrl = document ? `${import.meta.env.VITE_API_URL}/docs/${document.id}/file` : '';

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!document || document.status !== 'ready'}
        className={`group flex w-full items-start gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50 px-4 py-3 shadow-sm transition-all text-left ${
          document && document.status === 'ready'
            ? 'hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-md hover:scale-[1.02] cursor-pointer'
            : 'opacity-60 cursor-not-allowed'
        }`}
      >
        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/40 text-primary-700 dark:text-primary-400 shadow-sm group-hover:scale-110 transition-transform">
          <FileText size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-bold text-primary-600 dark:text-primary-400 tracking-wide uppercase">
              Page {citation.page}
            </p>
            {document && document.status === 'ready' && (
              <ExternalLink
                size={12}
                className="text-primary-500 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            )}
          </div>
          {loadingDoc ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">Loading document...</p>
          ) : document ? (
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 truncate">
              {document.title}
            </p>
          ) : null}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">
            "{citation.snippet}"
          </p>
        </div>
      </button>

      {showPDF && document && (
        <PDFViewer
          pdfUrl={pdfUrl}
          title={document.title}
          initialPage={citation.page}
          onClose={() => setShowPDF(false)}
        />
      )}
    </>
  );
}
