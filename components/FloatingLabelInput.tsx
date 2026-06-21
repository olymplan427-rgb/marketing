import React, { ChangeEvent } from 'react';

interface FloatingLabelInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder?: string;
  required?: boolean;
  type?: 'input' | 'textarea' | 'select';
  children?: React.ReactNode;
  info?: string;
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  type = 'input',
  children,
  info
}) => {
  const inputClass = `
    w-full px-4 py-3 bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm border-2 border-slate-200/60 dark:border-slate-600/60 rounded-xl
    text-slate-800 dark:text-slate-200 transition-all duration-300 ease-in-out
    focus:outline-none focus:border-indigo-400/80 dark:focus:border-indigo-500/80 focus:bg-white/90 dark:focus:bg-slate-700/90 focus:shadow-lg focus:shadow-indigo-500/20
    hover:border-slate-300/80 dark:hover:border-slate-500/80 hover:bg-white/80 dark:hover:bg-slate-700/80 hover:shadow-md
  `;

  const textareaClass = `
    w-full px-4 py-3 bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm border-2 border-slate-200/60 dark:border-slate-600/60 rounded-xl
    text-slate-800 dark:text-slate-200 transition-all duration-300 ease-in-out
    focus:outline-none focus:border-indigo-400/80 dark:focus:border-indigo-500/80 focus:bg-white/90 dark:focus:bg-slate-700/90 focus:shadow-lg focus:shadow-indigo-500/20
    hover:border-slate-300/80 dark:hover:border-slate-500/80 hover:bg-white/80 dark:hover:bg-slate-700/80 hover:shadow-md
    resize-vertical
  `;

  const labelClass = `
    block mb-2 text-sm font-medium text-slate-600 dark:text-slate-400
  `;

  const commonProps = {
    id: name,
    name: name,
    value: value,
    onChange: onChange,
    placeholder: placeholder || '',
  };

  return (
    <div className="mb-6">
      <label htmlFor={name} className={labelClass}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea {...commonProps} className={textareaClass} rows={3} />
      ) : type === 'select' ? (
        <select {...commonProps} className={inputClass}>{children}</select>
      ) : (
        <input type="text" {...commonProps} className={inputClass} />
      )}

      {info && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed opacity-80">
          {info}
        </p>
      )}
    </div>
  );
};

export default FloatingLabelInput;
