import React from 'react';
import { SearchSource } from '../types';
import { FileText, Globe, BookOpen, MessageCircle, CheckCircle2, Circle } from 'lucide-react';

interface Props {
  source: SearchSource;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
}

export const SearchResultCard: React.FC<Props> = ({ source, selectable, selected, onToggle }) => {
  const getIcon = () => {
    switch (source.sourceType) {
      case 'academic': return <BookOpen size={16} className="text-amber-500" />;
      case 'news': return <Globe size={16} className="text-blue-500" />;
      case 'forum': return <MessageCircle size={16} className="text-green-500" />;
      default: return <FileText size={16} className="text-gray-500" />;
    }
  };

  return (
    <div
      className={`
        group relative bg-white p-4 rounded-xl border border-slate-100 shadow-sm transition-all duration-200
        hover:shadow-md hover:border-violet-200
        ${selected ? 'ring-2 ring-violet-500 bg-violet-50' : ''}
      `}
      onClick={() => selectable && onToggle && onToggle(source.id)}
    >
      {selectable && (
        <div className="absolute top-3 right-3 text-slate-300 group-hover:text-violet-400 transition-colors cursor-pointer">
          {selected ? <CheckCircle2 size={20} className="text-violet-600 fill-white" /> : <Circle size={20} />}
        </div>
      )}

      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
        {getIcon()}
        <span>{source.sourceType}</span>
        <span className="text-slate-300">•</span>
        <span>{new Date(source.date).toLocaleDateString()}</span>
      </div>

      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="block text-base font-semibold text-slate-800 group-hover:text-violet-600 mb-2 line-clamp-1"
        onClick={(e) => e.stopPropagation()} // Prevent selection when clicking link
      >
        {source.title}
      </a>

      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
        {source.snippet}
      </p>
    </div>
  );
};