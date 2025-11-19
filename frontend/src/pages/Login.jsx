import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Sparkles, ShieldCheck, Lock, Mail, AlertCircle } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../api/auth';
import { authHeroStats, authHeroHighlights } from '../data/authContent';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: 'onChange', // Validate on every change
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setLoginError(null); // Clear previous errors
    
    try {
      const response = await authAPI.login(data);
      const { access_token, user_id, name, email } = response.data;

      login(access_token, { user_id, name, email });
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      // Get detailed error message
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        // Server responded with error
        const detail = error.response.data?.detail;
        
        if (error.response.status === 401) {
          errorMessage = 'Invalid email or password';
        } else if (error.response.status === 422) {
          errorMessage = 'Please check your email and password';
        } else if (detail) {
          errorMessage = detail;
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setLoginError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const heroSection = (
    <div className="w-full p-12 flex flex-col justify-center text-white">
      {/* Animated Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium mb-6 w-fit animate-fade-in-down shadow-lg">
        <Sparkles size={16} className="animate-pulse" />
        <span>Eduvate - Elevate Your Learning with AI</span>
      </div>

      {/* Animated Heading */}
      <h1 className="text-[2.75rem] font-bold leading-tight mb-4 animate-fade-in-up">
        Learn smarter with AI guidance that understands your learning style.
      </h1>

      {/* Animated Description */}
      <p className="text-primary-100 text-[1.1rem] leading-relaxed animate-fade-in-up animation-delay-200">
        Get personalized recommendations, adaptive quizzes, and instant insights from your documents.
      </p>

      {/* Animated Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mt-10">
        {authHeroStats.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/20 hover:scale-105 hover:border-white/30 transition-all duration-300 cursor-pointer group animate-fade-in-up shadow-lg hover:shadow-2xl"
            style={{ animationDelay: `${400 + index * 100}ms` }}
          >
            <p className="text-3xl font-bold mb-1 group-hover:scale-110 transition-transform">{stat.value}</p>
            <p className="text-sm text-white/70 group-hover:text-white/90 transition-colors">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Animated Highlights */}
      <div className="mt-10 space-y-4">
        {authHeroHighlights.map((item, index) => (
          <div
            key={item.title}
            className="flex items-start gap-4 group cursor-pointer animate-fade-in-left hover:translate-x-2 transition-transform duration-300"
            style={{ animationDelay: `${700 + index * 150}ms` }}
          >
            <div className="p-3 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm border border-white/10 group-hover:bg-white/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
              <item.icon size={20} className="group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white mb-1 group-hover:translate-x-1 transition-transform">{item.title}</p>
              <p className="text-sm text-primary-100 group-hover:text-white/90 transition-colors">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const formSection = (
    <Card className="p-8 sm:p-10 shadow-soft border border-gray-100 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-4">
          <Sparkles size={16} />
          <span>Welcome back</span>
        </div>
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Sign in to Eduvate</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1.5">Continue your personalized learning journey.</p>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {loginError && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">Login Failed</h4>
              <p className="text-sm text-red-700 dark:text-red-300">{loginError}</p>
            </div>
            <button
              onClick={() => setLoginError(null)}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
            e.preventDefault();
            handleSubmit(onSubmit)();
          }
        }}
        className="space-y-4"
        noValidate
      >
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            />
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              className={`w-full rounded-2xl border ${
                errors.email ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'
              } bg-white/70 dark:bg-gray-700/50 px-4 py-3 pl-12 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900 transition`}
              placeholder="student@example.com"
              onChange={() => setLoginError(null)} // Clear error on input change
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle size={14} />
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            />
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
              className={`w-full rounded-2xl border ${
                errors.password ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'
              } bg-white/70 dark:bg-gray-700/50 px-4 py-3 pl-12 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900 transition`}
              placeholder="********"
              onChange={() => setLoginError(null)} // Clear error on input change
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle size={14} />
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-4"
          loading={loading}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>New to Eduvate?</span>
        <Link to="/register" className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
          Create an account
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <ShieldCheck size={16} />
        <span>Credentials are encrypted and synced securely across devices.</span>
      </div>
    </Card>
  );

  return <AuthLayout mode="login" hero={heroSection} form={formSection} />;
}
