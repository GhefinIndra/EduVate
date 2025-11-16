import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Sparkles, ShieldCheck, Lock, Mail } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../api/auth';
import { authHeroStats, authHeroHighlights } from '../data/authContent';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await authAPI.login(data);
      const { access_token, user_id, name, email } = response.data;

      login(access_token, { user_id, name, email });
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-700/50 px-4 py-3 pl-12 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900 transition"
              placeholder="student@example.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
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
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-700/50 px-4 py-3 pl-12 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900 transition"
              placeholder="********"
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
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
