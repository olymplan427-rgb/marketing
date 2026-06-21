import React, { useState } from 'react';
import Loader from './Loader';
import { ClipboardIcon, WandIcon } from './IconComponents';

// Simple markdown to HTML converter
const simpleMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  // Process inline elements
  const processInline = (text: string) => {
    return text
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
  };

  const blocks = markdown.split(/\n{2,}/);
  const html = blocks.map(block => {
      // Headers
      if (block.startsWith('# ')) return `<h1>${processInline(block.substring(2))}</h1>`;
      if (block.startsWith('## ')) return `<h2>${processInline(block.substring(3))}</h2>`;
      if (block.startsWith('### ')) return `<h3>${processInline(block.substring(4))}</h3>`;
      
      // Blockquotes
      if (block.startsWith('> ')) {
          const quoteContent = block.split('\n').map(line => line.substring(2)).join('<br>');
          return `<blockquote><p>${processInline(quoteContent)}</p></blockquote>`;
      }
      
      // Lists
      if (block.match(/^(\*|\-|\d+\.) /m)) {
        const items = block.split('\n').map(item => `  <li>${processInline(item.replace(/^(\*|\-|\d+\.) /, ''))}</li>`).join('\n');
        const listTag = block.match(/^\d+\. /) ? 'ol' : 'ul';
        return `<${listTag}>\n${items}\n</${listTag}>`;
      }
      
      // Paragraph
      return `<p>${processInline(block.replace(/\n/g, '<br>'))}</p>`;
  }).join('\n\n');

  return html;
};

// Simple markdown to plain text converter
const simpleMarkdownToText = (markdown: string): string => {
    if (!markdown) return '';
    return markdown
        .replace(/^#+\s/gm, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        .replace(/^(\*|\-|\d+\.) /gm, '')
        .replace(/^> /gm, '')
        .trim();
}

interface BlogPostDisplayProps {
  postContent: string;
  isLoading: boolean;
  onPostChange: (newContent: string) => void;
  onSave?: () => void;
}

type ViewMode = 'text' | 'markdown' | 'html';

const TabButton: React.FC<{
  label: string;
  currentView: ViewMode;
  targetView: ViewMode;
  onClick: () => void;
}> = ({ label, currentView, targetView, onClick }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all flex-1 text-center ${
      currentView === targetView
        ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200'
        : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
    }`}
    aria-pressed={currentView === targetView}
  >
    {label}
  </button>
);


const BlogPostDisplay: React.FC<BlogPostDisplayProps> = ({ postContent, isLoading, onPostChange, onSave }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('markdown');

  const contentToDisplay = {
      markdown: postContent,
      html: simpleMarkdownToHtml(postContent),
      text: simpleMarkdownToText(postContent),
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(contentToDisplay[viewMode]);
    const viewName = {
      text: '텍스트',
      markdown: '마크다운',
      html: 'HTML'
    }[viewMode];
    alert(`${viewName} 내용이 클립보드에 복사되었습니다.`);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 border dark:border-slate-700 rounded-xl shadow-sm animate-pulse min-h-[70vh]">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-6"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-4"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6 mb-4"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-8"></div>
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-4"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-sm relative min-h-[70vh] flex flex-col">
       <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                생성된 블로그 포스트
            </h3>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <div className="flex items-center justify-around gap-2 bg-slate-200/60 dark:bg-slate-600/60 p-1 rounded-xl">
                <TabButton label="텍스트" currentView={viewMode} targetView='text' onClick={() => setViewMode('text')} />
                <TabButton label="마크다운" currentView={viewMode} targetView='markdown' onClick={() => setViewMode('markdown')} />
                <TabButton label="HTML" currentView={viewMode} targetView='html' onClick={() => setViewMode('html')} />
            </div>
        </div>
      
      <div className="flex-grow h-0 overflow-auto">
        {postContent ? (
          viewMode === 'markdown' ? (
            <textarea
              value={postContent}
              onChange={(e) => onPostChange(e.target.value)}
              className="w-full h-full p-6 bg-transparent dark:bg-slate-800 rounded-b-xl focus:outline-none resize-none text-slate-800 dark:text-slate-200 leading-relaxed font-mono"
              placeholder="AI가 생성한 블로그 글을 여기서 수정할 수 있습니다..."
            />
          ) : (
            <textarea
              readOnly
              value={contentToDisplay[viewMode]}
              className="w-full h-full p-6 bg-slate-50/50 dark:bg-slate-700/50 rounded-b-xl focus:outline-none resize-none text-slate-800 dark:text-slate-200 leading-relaxed font-mono select-all"
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 h-full p-8 bg-gray-50 dark:bg-slate-800/50">
            <WandIcon className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-4" />
            <p className="mt-2 max-w-xs">왼쪽 양식을 채우고 생성 버튼을 누르면 AI가 작성한 글이 여기에 표시됩니다.</p>
          </div>
        )}
      </div>

      {postContent && (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 space-y-2">
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-sm hover:from-green-600 hover:to-emerald-700 transition-all transform hover:-translate-y-px"
            aria-label={`Copy ${viewMode} to clipboard`}
          >
            <ClipboardIcon className="w-5 h-5" />
            <span>
              {
                {
                  text: '텍스트 복사',
                  markdown: '마크다운 복사',
                  html: 'HTML 복사'
                }[viewMode]
              }
            </span>
          </button>
          {onSave && (
            <button
              onClick={onSave}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-sm hover:from-indigo-600 hover:to-purple-700 transition-all transform hover:-translate-y-px"
              aria-label="Save blog post"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>블로그 포스트 저장</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BlogPostDisplay;