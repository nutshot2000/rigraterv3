import React from 'react';

interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isTextarea?: boolean;
  rows?: number;
  helpText?: string;
  placeholder?: string;
}

export const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value,
  onChange,
  isTextarea = false,
  rows = 3,
  helpText,
  placeholder
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      {isTextarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="input-blueprint w-full resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-blueprint w-full"
        />
      )}
      {helpText && (
        <p className="text-xs text-slate-400">{helpText}</p>
      )}
    </div>
  );
};
