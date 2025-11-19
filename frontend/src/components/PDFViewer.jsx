import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Button from './Button';

// Import react-pdf styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker - use local worker from node_modules
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function PDFViewer({ pdfUrl, title, onClose, initialPage = 1 }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(null);

  // Fetch PDF and convert to blob URL
  useEffect(() => {
    const fetchPDF = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(pdfUrl, {
          responseType: 'blob',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const blob = response.data;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err) {
        console.error('Failed to fetch PDF:', err);
        setError('Failed to load PDF file');
        setLoading(false);
      }
    };

    if (pdfUrl) {
      fetchPDF();
    }

    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [pdfUrl]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function changePage(offset) {
    setPageNumber(prevPageNumber => Math.min(Math.max(1, prevPageNumber + offset), numPages));
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  function zoomIn() {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  }

  function zoomOut() {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  }

  function goToPage(page) {
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {title}
              </h2>
              {numPages && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Page {pageNumber} of {numPages}
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 ml-4">
              {/* Page Navigation */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={previousPage}
                  disabled={pageNumber <= 1}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>

                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={pageNumber}
                  onChange={(e) => goToPage(parseInt(e.target.value))}
                  className="w-16 px-2 py-1 text-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-sm"
                />

                <button
                  onClick={nextPage}
                  disabled={pageNumber >= numPages}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="Zoom out"
                >
                  <ZoomOut size={18} />
                </button>

                <span className="px-2 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-center">
                  {Math.round(scale * 100)}%
                </span>

                <button
                  onClick={zoomIn}
                  disabled={scale >= 3.0}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="Zoom in"
                >
                  <ZoomIn size={18} />
                </button>
              </div>

              {/* Download */}
              <a
                href={blobUrl || pdfUrl}
                download={title}
                className="p-2 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                title="Download PDF"
              >
                <Download size={18} />
              </a>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-2 rounded bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 transition"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* PDF Content */}
          <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-4">
            <div className="flex justify-center">
              {error && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-red-600 dark:text-red-400 mb-2 font-semibold">
                    {error}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Please try again or contact support if the issue persists.
                  </p>
                </div>
              )}

              {loading && !error && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-600 dark:text-gray-400">
                    Loading PDF...
                  </div>
                </div>
              )}

              {blobUrl && !error && (
                <Document
                  file={blobUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(error) => {
                    console.error('Error rendering PDF:', error);
                    setError('Failed to render PDF');
                    setLoading(false);
                  }}
                  loading={
                    <div className="flex items-center justify-center py-12">
                      <div className="text-gray-600 dark:text-gray-400">
                        Rendering document...
                      </div>
                    </div>
                  }
                  className="shadow-lg"
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="border border-gray-300 dark:border-gray-600"
                  />
                </Document>
              )}
            </div>
          </div>

          {/* Footer - Keyboard Shortcuts */}
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Use arrow keys to navigate • ESC to close
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
