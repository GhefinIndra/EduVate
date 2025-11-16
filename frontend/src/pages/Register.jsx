import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Sparkles, ShieldCheck, Lock, Mail, User } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import AuthLayout from '../components/AuthLayout';
import { authAPI } from '../api/auth';
import { authHeroStats, authHeroHighlights } from '../data/authContent';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const passwordValue = watch('password', '');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authAPI.register({
        email: data.email,
        name: data.name,
        password: data.password,
      });

      toast.success('Account created successfully! Please sign in.');
      navigate('/login');
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
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
        <span>Build your learning command center</span>
      </div>

      {/* Animated Heading */}
      <h1 className="text-[2.75rem] font-bold leading-tight mb-4 animate-fade-in-up">
        Everything you need to learn, quiz yourself, and track your progress.
      </h1>

      {/* Animated Description */}
      <p className="text-primary-100 text-[1.1rem] leading-relaxed animate-fade-in-up animation-delay-200">
        Eduvate keeps your documents, conversations, and achievements synchronized for a consistent learning experience.
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
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-50 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 text-sm font-medium mb-4">
          <Sparkles size={16} />
          <span>Create your account</span>
        </div>
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Join Eduvate today</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
          Upload notes, generate quizzes, and track mastery with one account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Full Name
          </label>
          <div className="relative">
            <User
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            />
            <input
              id="name"
              type="text"
              autoComplete="name"
              {...register('name', {
                required: 'Name is required',
                minLength: {
                  value: 3,
                  message: 'Name must be at least 3 characters',
                },
              })}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-700/50 px-4 py-3 pl-12 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-secondary-500 dark:focus:border-secondary-400 focus:ring-2 focus:ring-secondary-100 dark:focus:ring-secondary-900 transition"
              placeholder="Taylor Brooks"
            />
          </div>
          {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
        </div>

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
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-700/50 px-4 py-3 pl-12 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-secondary-500 dark:focus:border-secondary-400 focus:ring-2 focus:ring-secondary-100 dark:focus:ring-secondary-900 transition"
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
              autoComplete="new-password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
              })}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-700/50 px-4 py-3 pl-12 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-secondary-500 dark:focus:border-secondary-400 focus:ring-2 focus:ring-secondary-100 dark:focus:ring-secondary-900 transition"
              placeholder="Create a strong password"
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            />
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === passwordValue || 'Passwords do not match',
              })}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-700/50 px-4 py-3 pl-12 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-secondary-500 dark:focus:border-secondary-400 focus:ring-2 focus:ring-secondary-100 dark:focus:ring-secondary-900 transition"
              placeholder="Repeat password"
            />
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
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
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
        By creating an account, you agree to our terms of service and privacy commitment to keep
        your study materials private.
      </p>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>Already have an account?</span>
        <Link to="/login" className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
          Sign in
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <ShieldCheck size={16} />
        <span>Your personal data is encrypted and never shared with other learners.</span>
      </div>
    </Card>
  );

  return <AuthLayout mode="register" hero={heroSection} form={formSection} />;
}
