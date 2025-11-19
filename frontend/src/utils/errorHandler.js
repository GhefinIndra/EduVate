import toast from 'react-hot-toast';

/**
 * Enhanced error handler with specific messages for common HTTP status codes
 * @param {Error} error - The error object from axios
 * @param {string} defaultMessage - Default message if no specific error found
 * @returns {string} - The error message to display
 */
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  // Network error (no response from server)
  if (!error.response) {
    const message = 'Network error. Please check your internet connection.';
    toast.error(message);
    return message;
  }

  const { status, data } = error.response;
  let message = defaultMessage;

  // Handle specific status codes
  switch (status) {
    case 400:
      message = data?.detail || 'Invalid request. Please check your input.';
      break;

    case 401:
      message = 'Session expired. Please login again.';
      // Auto-redirect handled by axios interceptor
      break;

    case 403:
      message = 'You don\'t have permission to perform this action.';
      break;

    case 404:
      message = data?.detail || 'Resource not found.';
      break;

    case 413:
      message = 'File too large. Maximum size is 20MB.';
      break;

    case 415:
      message = 'Invalid file type. Please upload PDF files only.';
      break;

    case 422:
      // Validation error
      if (data?.detail && Array.isArray(data.detail)) {
        message = data.detail.map(err => err.msg).join(', ');
      } else {
        message = data?.detail || 'Validation error. Please check your input.';
      }
      break;

    case 429:
      message = 'Too many requests. Please wait a moment and try again.';
      break;

    case 500:
      message = data?.detail || 'Server error. Our team has been notified.';
      break;

    case 502:
    case 503:
    case 504:
      message = 'Service temporarily unavailable. Please try again later.';
      break;

    default:
      message = data?.detail || defaultMessage;
  }

  toast.error(message);
  console.error('API Error:', {
    status,
    message,
    data,
    url: error.config?.url
  });

  return message;
};

/**
 * Handle specific document upload errors
 */
export const handleUploadError = (error) => {
  if (error.response?.status === 413) {
    return handleApiError(error, 'File is too large. Please upload files under 20MB.');
  }
  if (error.response?.status === 415) {
    return handleApiError(error, 'Invalid file type. Only PDF files are supported.');
  }
  return handleApiError(error, 'Failed to upload document. Please try again.');
};

/**
 * Handle chat/RAG errors
 */
export const handleChatError = (error) => {
  if (error.response?.status === 429) {
    return handleApiError(error, 'Too many messages. Please wait a moment before sending another.');
  }
  if (error.response?.status === 400) {
    return handleApiError(error, 'Invalid message. Please try rephrasing your question.');
  }
  return handleApiError(error, 'Failed to send message. Please try again.');
};

/**
 * Handle quiz errors
 */
export const handleQuizError = (error) => {
  if (error.response?.status === 400) {
    return handleApiError(error, 'Unable to generate quiz. Please make sure you have uploaded documents.');
  }
  return handleApiError(error, 'Failed to process quiz. Please try again.');
};

/**
 * Handle authentication errors
 */
export const handleAuthError = (error) => {
  if (error.response?.status === 401) {
    return handleApiError(error, 'Invalid email or password.');
  }
  if (error.response?.status === 409) {
    return handleApiError(error, 'Email already registered. Please login instead.');
  }
  return handleApiError(error, 'Authentication failed. Please try again.');
};
