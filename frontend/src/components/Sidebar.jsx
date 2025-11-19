import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BarChart3,
  Folder,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { topicsAPI } from '../api/topics';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  useEffect(() => {
    if (topicsOpen && topics.length === 0) {
      fetchTopics();
    }
  }, [topicsOpen]);

  const fetchTopics = async () => {
    setLoadingTopics(true);
    try {
      const response = await topicsAPI.list();
      setTopics(response.data?.topics || []);
    } catch (error) {
      console.error('Failed to load topics', error);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => setIsOpen(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow"
      >
        <Menu size={22} />
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400">
                Eduvate
              </p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Workspace
              </h1>
            </div>
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}

            <div className="mt-4">
              <button
                onClick={() => setTopicsOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <span className="flex items-center gap-3 font-medium">
                  <Folder size={18} />
                  Topics
                </span>
                <motion.div animate={{ rotate: topicsOpen ? 180 : 0 }}>
                  <ChevronDown size={16} />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {topicsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 pl-4 border-l border-gray-200 dark:border-gray-700 space-y-1">
                      {loadingTopics ? (
                        <p className="px-3 py-2 text-xs text-gray-500">Loading topics...</p>
                      ) : topics.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-gray-500">No topics yet</p>
                      ) : (
                        topics.slice(0, 5).map((topic) => (
                          <NavLink
                            key={topic.id}
                            to={`/topics/${topic.id}`}
                            onClick={handleNavClick}
                            className={({ isActive }) =>
                              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                                isActive
                                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-medium'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              }`
                            }
                          >
                            <ChevronRight size={14} />
                            <span className="truncate">{topic.name}</span>
                          </NavLink>
                        ))
                      )}

                      {topics.length > 5 && (
                        <NavLink
                          to="/topics"
                          onClick={handleNavClick}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
                        >
                          <span>{`View all ${topics.length} topics →`}</span>
                        </NavLink>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-white flex items-center justify-center font-bold">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:ml-64" />
    </>
  );
}
