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
    w-full px-4 py-3 bg-chalk border border-hairline rounded-lg
    text-graphite transition-colors
    focus:outline-none focus:border-graphite
    hover:border-concrete
  `;

  const textareaClass = `
    w-full px-4 py-3 bg-chalk border border-hairline rounded-lg
    text-graphite transition-colors
    focus:outline-none focus:border-graphite
    hover:border-concrete
    resize-vertical
  `;

  const labelClass = `
    block mb-2 text-sm font-medium text-concrete
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
        {label} {required && <span className="text-graphite">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea {...commonProps} className={textareaClass} rows={3} />
      ) : type === 'select' ? (
        <select {...commonProps} className={inputClass}>{children}</select>
      ) : (
        <input type="text" {...commonProps} className={inputClass} />
      )}

      {info && (
        <p className="mt-2 text-xs text-concrete leading-relaxed opacity-80">
          {info}
        </p>
      )}
    </div>
  );
};

export default FloatingLabelInput;
