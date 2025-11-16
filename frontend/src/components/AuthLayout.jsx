import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function AuthLayout({ mode = 'login', hero, form }) {
  const isLogin = mode === 'login';
  const location = useLocation();

  // Determine animation direction based on navigation
  const getDirection = () => {
    if (isLogin) {
      return { hero: 100, form: 100 }; // From right
    } else {
      return { hero: -100, form: -100 }; // From left
    }
  };

  const direction = getDirection();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col transition-colors duration-300">
      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      <div
        className={clsx(
          'flex flex-1 flex-col lg:flex-row relative overflow-hidden',
          !isLogin && 'lg:flex-row-reverse'
        )}
      >
        <motion.div
          key={`hero-${location.pathname}`}
          className="relative hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 via-primary-800 to-secondary-700 text-white overflow-hidden"
          initial={{ x: `${direction.hero}%`, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: `${-direction.hero}%`, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
          <div className="relative z-10 w-full">{hero}</div>
        </motion.div>

        <motion.div
          key={`form-${location.pathname}`}
          className="flex-1 flex items-center justify-center p-6 sm:p-10"
          initial={{ x: `${-direction.form}%`, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: `${direction.form}%`, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="w-full max-w-lg">{form}</div>
        </motion.div>
      </div>
    </div>
  );
}
