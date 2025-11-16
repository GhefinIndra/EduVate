import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function StatCard({ title, value, icon: Icon, color = 'blue', trend }) {
  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30',
      icon: 'bg-blue-500',
      text: 'text-blue-600',
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30',
      icon: 'bg-green-500',
      text: 'text-green-600',
    },
    purple: {
      bg: 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30',
      icon: 'bg-primary-500',
      text: 'text-primary-600',
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30',
      icon: 'bg-orange-500',
      text: 'text-orange-600',
    },
    teal: {
      bg: 'bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-900/30 dark:to-secondary-800/30',
      icon: 'bg-secondary-500',
      text: 'text-secondary-600',
    },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-card dark:shadow-gray-900/50 p-6 hover:shadow-card-hover dark:hover:shadow-gray-900/70 transition-shadow duration-200"
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
        <div className={clsx('p-3 rounded-xl shadow-sm', colors.bg)}>
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', colors.icon)}>
            <Icon size={18} className="text-white" />
          </div>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {trend && (
            <p className={clsx('text-sm mt-1', trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}