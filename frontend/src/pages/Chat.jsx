import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { chatAPI } from '../api/chat';
import { documentsAPI } from '../api/documents';
import ChatMessage from '../components/ChatMessage';
import Button from '../components/Button';
import Card from '../components/Card';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  Loader,
  MessageSquare,
  FileText,
  Calendar,
  Sparkles,
  Search,
} from 'lucide-react';

const cleanSessionTitle = (title) => {
  if (!title) return 'Untitled chat';
  const cleaned = title.replace(/^(judul|title)\s*[:-]\s*/i, '').trim();
  return cleaned || 'Untitled chat';
};

export default function Chat() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [docInfo, setDocInfo] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionSearch, setSessionSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, sessionId: null });

  useEffect(() => {
    fetchInitialData();
  }, [docId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchInitialData = async () => {
    try {
      const [docRes, sessionsRes] = await Promise.all([
        documentsAPI.getById(docId),
        chatAPI.getSessions(docId),
      ]);

      setDocInfo(docRes.data);
      setSessions(sessionsRes.data);
    } catch (error) {
      toast.error('Failed to load chat data');
      navigate('/documents');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const response = await chatAPI.getMessages(sessionId);
      setMessages(response.data.messages);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const handleCreateSession = async () => {
    try {
      const response = await chatAPI.createSession(docId);
      const newSession = response.data;
      setSessions((prev) => [newSession, ...prev]);
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
    
    setSessions((prev) => prev.filter((s) => (s.session_id || s.id) !== sessionIdToDelete));

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

    const tempUserMsg = {
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await chatAPI.sendMessage(
        selectedSession.session_id || selectedSession.id,
        userMessage
      );

      setMessages((prev) => [...prev, response.data.message]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send message');
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const normalizedSearch = sessionSearch.trim().toLowerCase();
  const filteredSessions = sessions.filter((session) => {
    if (!normalizedSearch) return true;
    const title = cleanSessionTitle(session.title);
    return title.toLowerCase().includes(normalizedSearch);
  });

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center px-4">
        <Card className="p-8 flex items-center gap-3">
          <Loader className="animate-spin text-primary-600" size={24} />
          <p className="text-gray-600 font-medium">Preparing your chat workspace...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate('/documents')}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-900 transition"
          >
            <ArrowLeft size={18} />
            Back to documents
          </button>
          <div className="text-xs text-gray-500">
            Tip: focus your question on a specific section for precise answers.
          </div>
        </div>

        {docInfo && (
          <Card className="bg-white/80 backdrop-blur border border-white/70 p-6 flex flex-wrap gap-6 items-center justify-between shadow-soft">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Chatting with
              </p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{docInfo.title}</h1>
              <p className="text-sm text-gray-500 mt-1">Uploaded {formatDate(docInfo.created_at)}</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="rounded-2xl bg-primary-50 px-4 py-3">
                <p className="text-xs font-semibold text-primary-600 uppercase">Pages</p>
                <div className="flex items-center gap-2 mt-1 text-lg font-semibold text-gray-900">
                  <FileText size={18} className="text-primary-500" />
                  {docInfo.pages}
                </div>
              </div>
              <div className="rounded-2xl bg-secondary-50 px-4 py-3">
                <p className="text-xs font-semibold text-secondary-600 uppercase">Sessions</p>
                <div className="flex items-center gap-2 mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  <MessageSquare size={18} className="text-secondary-600" />
                  {sessions.length}
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</p>
                <div className="flex items-center gap-2 mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  <Sparkles size={18} className="text-amber-500" />
                  {docInfo.status}
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          {/* Sessions Sidebar */}
          <Card className="p-0 h-[75vh] flex flex-col bg-white/80 backdrop-blur border border-white/70">
            <div className="p-5 border-b border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Chat Sessions</p>
                  <p className="text-xs text-gray-500">Kelola percakapanmu untuk dokumen ini</p>
                </div>
                {sessions.length > 0 && (
                  <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">
                    {sessions.length} aktif
                  </span>
                )}
              </div>
              <Button
                onClick={handleCreateSession}
                icon={Plus}
                className="w-full justify-center"
                size="md"
              >
                New Chat
              </Button>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  placeholder="Cari percakapan..."
                  className="w-full rounded-xl border border-gray-200 bg-white/80 py-2 pl-10 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  Belum ada percakapan. Buat sesi baru untuk mulai bertanya.
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  Tidak ada chat yang cocok dengan pencarianmu.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredSessions.map((session) => {
                    const sessionId = session.session_id || session.id;
                    const isActive =
                      selectedSession &&
                      (selectedSession.session_id || selectedSession.id) === sessionId;
                    const title = cleanSessionTitle(session.title);

                    return (
                      <div
                        key={sessionId}
                        onClick={() => handleSelectSession(session)}
                        className={`px-5 py-4 cursor-pointer transition flex items-start gap-3 ${
                          isActive
                            ? 'bg-primary-50/80 border-l-4 border-primary-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {title}
                            </p>
                            {isActive && (
                              <span className="text-[10px] uppercase tracking-wide bg-primary-600 text-white px-2 py-0.5 rounded-full">
                                Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(session.updated_at || session.created_at)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(sessionId, e)}
                          className="text-gray-300 hover:text-red-600 transition flex-shrink-0"
                          aria-label="Delete chat"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/70 text-xs text-gray-600">
              Tip: gunakan pencarian untuk menemukan percakapan lama atau buat sesi baru agar topik tidak bercampur.
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="h-[75vh] flex flex-col bg-white/90 border border-white/70">
            {!selectedSession ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div className="p-4 rounded-full bg-primary-50 text-primary-600 mb-4">
                  <MessageSquare size={28} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Select a chat to begin</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Choose an existing session or create a new one to discuss this document with AI.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-gray-100 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Active chat
                    </p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {cleanSessionTitle(selectedSession.title)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">
                    {messages.length} message{messages.length !== 1 && 's'}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-gradient-to-b from-white to-gray-50">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      No messages yet. Ask the first question!
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <ChatMessage key={message.id || index} message={message} />
                    ))
                  )}

                  {loading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 animate-pulse">
                      <span className="inline-flex h-2 w-2 rounded-full bg-gray-400"></span>
                      <span>EduV ate AI is thinking...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-gray-100 bg-white/80 p-4">
                  <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a question about this document..."
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 resize-none"
                      rows={1}
                      style={{ maxHeight: '150px' }}
                      disabled={loading}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                      <span>Press Enter to send | Shift + Enter for new line</span>
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        icon={Send}
                        className="px-6"
                        loading={loading}
                        disabled={loading || !inputMessage.trim()}
                      >
                        {loading ? 'Sending...' : 'Send'}
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </Card>
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
