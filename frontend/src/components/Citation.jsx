import { FileText } from 'lucide-react';

export default function Citation({ citation }) {
  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-4 py-3 shadow-sm transition hover:border-primary-300 dark:hover:border-primary-600 hover:bg-white dark:hover:bg-gray-800">
      <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">
        <FileText size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wide uppercase">
          Page {citation.page}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {citation.snippet}
        </p>
      </div>
    </div>
  );
}
