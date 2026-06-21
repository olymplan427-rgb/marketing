
import React from 'react';
import type { StepCardProps } from '../types';
import { CheckCircleIcon } from './IconComponents';

const StepCard: React.FC<StepCardProps> = ({ step, title, children, isComplete, isDisabled }) => {
  return (
    <div
      className={`bg-white border rounded-xl shadow-sm transition-all duration-300 ${isDisabled ? 'opacity-50' : 'opacity-100'} ${isComplete ? 'border-emerald-500' : 'border-slate-200'}`}
    >
      <div className="p-6">
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
              isComplete ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isComplete ? <CheckCircleIcon className="w-6 h-6" /> : <span className="font-bold text-lg">{step}</span>}
          </div>
          <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
        </div>
        <div className={`mt-6 transition-opacity ${isDisabled ? 'pointer-events-none' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default StepCard;
