export default function Skeleton({ className = '', variant = 'rect' }) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  
  const variants = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded h-4',
    title: 'rounded h-6',
    button: 'rounded-xl h-10',
    card: 'rounded-2xl h-32',
  };

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} />
  );
}

// Pre-built skeleton patterns
export function TopicCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton variant="title" className="w-3/4 mb-2" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
        <Skeleton variant="circle" className="w-10 h-10" />
      </div>
      
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div>
          <Skeleton variant="text" className="w-16 mb-2" />
          <Skeleton variant="title" className="w-12" />
        </div>
        <div>
          <Skeleton variant="text" className="w-16 mb-2" />
          <Skeleton variant="title" className="w-12" />
        </div>
        <div>
          <Skeleton variant="text" className="w-16 mb-2" />
          <Skeleton variant="title" className="w-12" />
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <Skeleton variant="button" className="flex-1" />
        <Skeleton variant="button" className="flex-1" />
        <Skeleton variant="button" className="flex-1" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="circle" className="w-10 h-10" />
      </div>
      <Skeleton variant="title" className="w-20 h-8 mb-2" />
      <Skeleton variant="text" className="w-32" />
    </div>
  );
}

export function QuizCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton variant="title" className="w-2/3 mb-2" />
          <Skeleton variant="text" className="w-1/3 mb-3" />
          <div className="flex gap-4">
            <Skeleton variant="text" className="w-20" />
            <Skeleton variant="text" className="w-24" />
          </div>
        </div>
        <Skeleton variant="circle" className="w-8 h-8" />
      </div>
    </div>
  );
}

export function ChatSessionSkeleton() {
  return (
    <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between mb-2">
        <Skeleton variant="text" className="w-3/4 h-5" />
        <Skeleton variant="circle" className="w-6 h-6" />
      </div>
      <Skeleton variant="text" className="w-1/2" />
    </div>
  );
}

export function DocumentCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="w-10 h-10" />
        <div className="flex-1">
          <Skeleton variant="title" className="w-3/4 mb-2" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
        <Skeleton variant="circle" className="w-8 h-8" />
      </div>
    </div>
  );
}
