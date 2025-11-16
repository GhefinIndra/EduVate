import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function Card({
  children,
  className = '',
  hover = false,
  gradient = false,
  onClick,
  ...props
}) {
  const Component = onClick || hover ? motion.div : 'div';
  const motionProps = (onClick || hover) ? { whileHover: hover ? { y: -2 } : undefined } : {};

  return (
    <Component
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-xl shadow-card dark:shadow-gray-900/50 transition-all duration-200',
        hover && 'hover:shadow-card-hover dark:hover:shadow-gray-900/70 hover:-translate-y-0.5 cursor-pointer',
        gradient && 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900',
        className
      )}
      onClick={onClick}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
}
