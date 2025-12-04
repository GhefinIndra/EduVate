import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../api/auth';
import { gamificationAPI } from '../api/gamification';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import { User, Mail, Calendar, Award, Zap, Flame, Edit2, Lock, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);

  // Edit name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Change password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, progressRes] = await Promise.all([
        authAPI.getProfile(),
        gamificationAPI.getProgress()
      ]);

      setProfile(profileRes.data);
      setProgress(progressRes.data);
      setNewName(profileRes.data.name);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setSavingName(true);
    try {
      const response = await authAPI.updateProfile({ name: newName });
      setProfile(response.data);
      updateUser({ ...user, name: response.data.name });
      setIsEditingName(false);
      toast.success('Name updated successfully!');
    } catch (error) {
      console.error('Failed to update name:', error);
      toast.error(error.response?.data?.detail || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Please fill all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setSavingPassword(true);
    try {
      await authAPI.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });

      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully!');
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Profile Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account information and preferences
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Profile Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-primary-500" />
                  Personal Information
                </h2>
              </div>

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  {isEditingName ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter your name"
                      />
                      <Button
                        onClick={handleSaveName}
                        loading={savingName}
                        size="sm"
                        className="!px-3"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditingName(false);
                          setNewName(profile.name);
                        }}
                        variant="secondary"
                        size="sm"
                        className="!px-3"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <span className="text-gray-900 dark:text-white font-medium">
                        {profile?.name}
                      </span>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300
                                 flex items-center gap-1 text-sm font-medium transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{profile?.email}</span>
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                      Cannot be changed
                    </span>
                  </div>
                </div>

                {/* Member Since */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Member Since
                  </label>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">
                      {formatDate(profile?.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Gamification Stats Card */}
          {progress && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                  <Award className="w-5 h-5 text-primary-500" />
                  Your Progress
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Level */}
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Level</p>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{progress.level}</p>
                      </div>
                    </div>
                  </div>

                  {/* XP */}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total XP</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{progress.xp.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Streak */}
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <Flame className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Streak</p>
                        <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{progress.streak} days</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* XP Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      Level {progress.level} Progress
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {progress.xp_progress_in_current_level} / {progress.xp_for_next_level - progress.xp_for_current_level} XP
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.xp_progress_percentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {progress.xp_needed_for_next_level} XP needed for Level {progress.level + 1}
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Security Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary-500" />
                  Security
                </h2>
              </div>

              {!isChangingPassword ? (
                <Button
                  onClick={() => setIsChangingPassword(true)}
                  variant="secondary"
                  icon={Lock}
                >
                  Change Password
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter new password (min 6 characters)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={handleChangePassword}
                      loading={savingPassword}
                    >
                      Save New Password
                    </Button>
                    <Button
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
