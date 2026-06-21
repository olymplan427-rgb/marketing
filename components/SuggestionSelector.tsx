
import React from 'react';
import type { SuggestionSelectorProps } from '../types';
import Loader from './Loader';
import { WandIcon } from './IconComponents';

const SuggestionSelector: React.FC<SuggestionSelectorProps> = ({
  label,
  suggestions,
  selectedValue,
  isLoading,
  onGenerate,
  onSelect,
  onEdit,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={selectedValue}
            onChange={(e) => onEdit(e.target.value)}
            placeholder={`${label}를 입력하거나 AI 추천을 받으세요`}
            className="flex-grow w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={onGenerate}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <Loader /> : <WandIcon className="w-4 h-4" />}
            <span>AI 추천</span>
          </button>
        </div>
      </div>
      {suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-500 mb-2">추천 {label}:</h4>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((item) => (
              <button
                key={item}
                onClick={() => onSelect(item)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedValue === item
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestionSelector;
