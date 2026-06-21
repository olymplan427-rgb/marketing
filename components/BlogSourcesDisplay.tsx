import React from 'react';

interface BlogSource {
  uri: string;
  title: string;
}

interface BlogSourcesDisplayProps {
  sources: BlogSource[];
}

const LinkIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path>
    </svg>
);


const BlogSourcesDisplay: React.FC<BlogSourcesDisplayProps> = ({ sources }) => {
    if (!sources || sources.length === 0) {
        return null;
    }

    return (
        <div className="bg-white border border-slate-200/50 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">참고 자료 (AI 웹 검색)</h2>
            <ul className="space-y-3">
                {sources.map((source, index) => (
                    <li key={index} className="flex items-start gap-3">
                         <div className="flex-shrink-0 mt-1">
                           <LinkIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                            <a 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                                {source.title || source.uri}
                            </a>
                            <p className="text-xs text-slate-500 break-all">{source.uri}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default BlogSourcesDisplay;