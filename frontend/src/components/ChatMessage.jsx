import { useState } from 'react';
import { Bot, User as UserIcon, BookOpenCheck, ChevronDown } from 'lucide-react';
import Citation from './Citation';

const parseInlineSegments = (text) => {
  // Combined regex for bold (**text**) and italic (*text*)
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    if (match[2]) {
      // Bold: **text**
      segments.push({ type: 'bold', value: match[2] });
    } else if (match[3]) {
      // Italic: *text*
      segments.push({ type: 'italic', value: match[3] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
};

const parseContentBlocks = (content = '') => {
  const lines = content.split('\n');
  const blocks = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', items: listItems });
      listItems = [];
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    if (/^(\*|-)\s+/.test(line)) {
      listItems.push(line.replace(/^(\*|-)\s+/, ''));
    } else {
      flushList();
      blocks.push({ type: 'paragraph', text: line });
    }
  });

  flushList();
  return blocks;
};

const InlineSegments = ({ segments, isUser }) => (
  <>
    {segments.map((segment, index) => {
      if (segment.type === 'bold') {
        return (
          <span
            key={`bold-${index}`}
            className={isUser ? 'font-semibold' : 'font-semibold text-gray-900 dark:text-white'}
          >
            {segment.value}
          </span>
        );
      }
      if (segment.type === 'italic') {
        return (
          <span
            key={`italic-${index}`}
            className={isUser ? 'italic' : 'italic text-gray-600 dark:text-gray-400'}
          >
            {segment.value}
          </span>
        );
      }
      return (
        <span key={`text-${index}`} className={isUser ? '' : 'text-gray-700 dark:text-gray-300'}>
          {segment.value}
        </span>
      );
    })}
  </>
);

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const blocks = parseContentBlocks(message.content);
  const [showSources, setShowSources] = useState(false);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    // Manual convert UTC to WIB (UTC+7)
    const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return wibDate.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`flex items-start gap-3 max-w-3xl w-full ${
          isUser ? 'flex-row-reverse text-white' : 'text-gray-800 dark:text-gray-200'
        }`}
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm ${
            isUser ? 'bg-primary-600 text-white' : 'bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-400'
          }`}
        >
          {isUser ? <UserIcon size={18} /> : <Bot size={18} />}
        </div>

        <div className="flex flex-col gap-2">
          <div
            className={`rounded-2xl px-4 py-3 shadow-sm leading-relaxed ${
              isUser
                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-br-sm'
                : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-bl-sm'
            }`}
          >
            {blocks.length === 0 ? (
              <p className="text-sm">{message.content}</p>
            ) : (
              <div className="space-y-3">
                {blocks.map((block, index) => {
                  if (block.type === 'list') {
                    return (
                      <ul
                        key={`list-${index}`}
                        className={`pl-4 text-sm list-disc space-y-1 ${
                          isUser ? 'text-white/90' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {block.items.map((item, itemIndex) => (
                          <li key={`item-${itemIndex}`}>
                            <InlineSegments
                              segments={parseInlineSegments(item)}
                              isUser={isUser}
                            />
                          </li>
                        ))}
                      </ul>
                    );
                  }

                  return (
                    <p
                      key={`paragraph-${index}`}
                      className={`text-sm ${isUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      <InlineSegments
                        segments={parseInlineSegments(block.text)}
                        isUser={isUser}
                      />
                    </p>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className={`text-xs ${isUser ? 'text-white/80 text-right' : 'text-gray-500 dark:text-gray-400'} px-1`}
          >
            {isUser ? 'You' : 'Eduvate AI'} | {formatTime(message.created_at)}
          </div>

          {!isUser && message.citations && message.citations.length > 0 && (
            <div className="mt-1">
              <button
                type="button"
                onClick={() => setShowSources((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 transition hover:border-primary-300 dark:hover:border-primary-600 hover:text-primary-700 dark:hover:text-primary-400"
              >
                <span className="flex items-center gap-2">
                  <BookOpenCheck size={14} />
                  {showSources
                    ? 'Sembunyikan sumber'
                    : `Lihat sumber (${message.citations.length})`}
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showSources ? 'rotate-180' : ''}`}
                />
              </button>
              {showSources && (
                <div className="mt-3 space-y-2">
                  {message.citations.map((citation, index) => (
                    <Citation key={`citation-${index}`} citation={citation} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
