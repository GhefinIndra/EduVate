import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { chatAPI } from '../api/chat';
import { topicsAPI } from '../api/topics';
import { documentsAPI } from '../api/documents';
import ChatMessage from '../components/ChatMessage';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  Loader,
  MessageSquare,
  FileText,
  Bot,
  Menu,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function TopicChat() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null); 

  const [topic, setTopic] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, sessionId: null }); 

  // Fetch topic info & sessions on mount
  useEffect(() => {
    fetchInitialData();
  }, [topicId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus input after loading stops
  useEffect(() => {
    if (!loading && selectedSession) {
      inputRef.current?.focus();
    }
  }, [loading, selectedSession]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchInitialData = async () => {
    try {
      const [topicRes, docsRes, sessionsRes] = await Promise.all([
        topicsAPI.getById(topicId),
        documentsAPI.list(topicId),
        chatAPI.getSessionsBySubject(topicId),
      ]);

      setTopic(topicRes.data);
      setDocuments(docsRes.data.documents || []);
      setSessions(sessionsRes.data);
    } catch (error) {
      toast.error('Failed to load chat data');
      navigate(`/topics/${topicId}`);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchMessages = async (sessionId, append = false) => {
    try {
      const offset = append ? messages.length : 0;
      const response = await chatAPI.getMessages(sessionId, 50, offset);
      const newMessages = response.data.messages;
      
      if (append) {
        setMessages([...newMessages, ...messages]);
      } else {
        setMessages(newMessages);
      }
      
      setTotalMessages(response.data.total);
      setHasMoreMessages(offset + newMessages.length < response.data.total);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const handleLoadMore = async () => {
    if (!selectedSession || loadingMore || !hasMoreMessages) return;
    
    setLoadingMore(true);
    try {
      await fetchMessages(selectedSession.session_id || selectedSession.id, true);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCreateSession = async () => {
    if (documents.length === 0) {
      toast.error('Please upload documents first');
      return;
    }

    try {
      const response = await chatAPI.createSessionForSubject(topicId);
      const newSession = response.data;
      setSessions([newSession, ...sessions]);
      setSelectedSession(newSession);
      setMessages([]);
      toast.success('New chat created!');
    } catch (error) {
      toast.error('Failed to create chat session');
    }
  };

  const handleSelectSession = (session) => {
    setSelectedSession(session);
    fetchMessages(session.session_id || session.id);
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    setConfirmDialog({ isOpen: true, sessionId });
  };

  const confirmDelete = async () => {
    const sessionIdToDelete = confirmDialog.sessionId;
    setConfirmDialog({ isOpen: false, sessionId: null });
    
    // Optimistic update - remove from UI immediately
    const previousSessions = [...sessions];
    const previousSelectedSession = selectedSession;
    const previousMessages = [...messages];
    
    setSessions(sessions.filter(s => (s.session_id || s.id) !== sessionIdToDelete));

    if (selectedSession && (selectedSession.session_id || selectedSession.id) === sessionIdToDelete) {
      setSelectedSession(null);
      setMessages([]);
    }

    const toastId = toast.loading('Deleting chat...');
    
    try {
      await chatAPI.deleteSession(sessionIdToDelete);
      toast.success('Chat deleted!', { id: toastId });
    } catch (error) {
      // Rollback on error
      setSessions(previousSessions);
      setSelectedSession(previousSelectedSession);
      setMessages(previousMessages);
      toast.error('Failed to delete chat', { id: toastId });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputMessage.trim() || !selectedSession) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    // Optimistic UI: add user message immediately
    const tempUserMsg = {
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages([...messages, tempUserMsg]);

    try {
      const response = await chatAPI.sendMessage(
        selectedSession.session_id || selectedSession.id,
        userMessage
      );

      // Replace temp message with real messages from server
      const updatedMessages = await chatAPI.getMessages(
        selectedSession.session_id || selectedSession.id
      );
      setMessages(updatedMessages.data.messages);

      // Update session title if it changed
      const updatedSessions = await chatAPI.getSessionsBySubject(topicId);
      setSessions(updatedSessions.data);
    } catch (error) {
      toast.error('Failed to send message');
      // Remove optimistic message on error
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {/* 🔥 NEW: Mobile menu toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <Menu size={20} />
              </button>
              
              <button
                onClick={() => navigate(`/topics/${topicId}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg">
                  <MessageSquare className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                    {topic?.name}
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <FileText size={12} />
                    {documents.length} document{documents.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 🔥 NEW: Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:relative z-30
          w-80 bg-white dark:bg-gray-800 
          border-r border-gray-200 dark:border-gray-700 
          flex flex-col h-full
          transition-transform duration-300 ease-in-out
        `}>
          {/* 🔥 NEW: Mobile close button */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-white">Chat Sessions</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Button
              onClick={handleCreateSession}
              disabled={documents.length === 0}
              variant="primary"
              icon={Plus}
              className="w-full"
            >
              New Chat
            </Button>
          </div>

          {/* Documents Info */}
          {documents.length > 0 && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                <Bot size={14} />
                Chatting with:
              </p>
              <div className="space-y-2">
                {documents.slice(0, 3).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-xs text-blue-800 dark:text-blue-200 bg-white/50 dark:bg-white/10 px-2 py-1.5 rounded-lg">
                    <FileText size={12} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="truncate font-medium">{doc.title}</span>
                  </div>
                ))}
                {documents.length > 3 && (
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium px-2">+ {documents.length - 3} more documents</p>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="text-gray-300 dark:text-gray-500" size={32} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No chats yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create one to start!</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sessions.map((session, index) => {
                  const sessionId = session.session_id || session.id;
                  const isActive = selectedSession && (selectedSession.session_id || selectedSession.id) === sessionId;

                  return (
                    <motion.div
                      key={sessionId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSelectSession(session)}
                      className={`p-3 cursor-pointer rounded-lg transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/30 dark:to-secondary-900/30 border-2 border-primary-500 dark:border-primary-400 shadow-sm'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${
                            isActive ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {session.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(session.updated_at || session.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(sessionId, e)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition flex-shrink-0"
                          title="Delete chat"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          {!selectedSession ? (
            <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-md"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/30 dark:to-secondary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="text-primary-600 dark:text-primary-400" size={48} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Start a Conversation</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-1">Select a chat or create a new one</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Chat with all documents in this topic using AI
                </p>
              </motion.div>
            </div>
          ) : (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
                {/* Load More Button */}
                {hasMoreMessages && (
                  <div className="text-center mb-4">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <span className="flex items-center gap-2">
                          <Loader className="animate-spin" size={16} />
                          Loading...
                        </span>
                      ) : (
                        `Load ${totalMessages - messages.length} older messages`
                      )}
                    </button>
                  </div>
                )}
                
                {messages.length === 0 ? (
                  <div className="text-center mt-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/30 dark:to-secondary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bot className="text-primary-600 dark:text-primary-400" size={40} />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">No messages yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <ChatMessage key={message.id || index} message={message} />
                  ))
                )}

                {/* Loading Indicator */}
                {loading && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 px-5 py-3 rounded-2xl rounded-bl-none shadow-sm">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2 lg:gap-3">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about these documents..."
                    className="flex-1 resize-none border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition"
                    rows={1}
                    style={{ maxHeight: '120px' }}
                    disabled={loading}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={loading || !inputMessage.trim()}
                    variant="primary"
                    icon={Send}
                    className="px-4 lg:px-6 flex-shrink-0"
                  >
                  </Button>
                </form>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                  <span className="font-medium">Tip:</span> Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, sessionId: null })}
        onConfirm={confirmDelete}
        title="Delete Chat"
        message="Are you sure you want to delete this chat session? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
