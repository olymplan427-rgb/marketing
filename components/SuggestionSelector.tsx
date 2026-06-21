
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
        <label className="block text-sm font-medium text-concrete mb-1">{label}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={selectedValue}
            onChange={(e) => onEdit(e.target.value)}
            placeholder={`${label}를 입력하거나 AI 추천을 받으세요`}
            className="flex-grow w-full px-3 py-2 bg-chalk border border-hairline rounded-lg placeholder-ash focus:outline-none focus:ring-2 focus:ring-graphite focus:border-graphite"
          />
          <button
            onClick={onGenerate}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-chalk bg-graphite rounded-lg hover:bg-carbon disabled:bg-ash disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <Loader /> : <WandIcon className="w-4 h-4" />}
            <span>AI 추천</span>
          </button>
        </div>
      </div>
      {suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-concrete mb-2">추천 {label}:</h4>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((item) => (
              <button
                key={item}
                onClick={() => onSelect(item)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedValue === item
                    ? 'bg-graphite text-chalk font-semibold'
                    : 'bg-mist text-graphite hover:bg-smoke'
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
