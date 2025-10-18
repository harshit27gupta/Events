import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, className = '', id, ...props }, ref) => {
    const inputId = id || props.name || undefined;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-neutral-300">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`
            w-full px-3 py-2.5 rounded-lg
            bg-neutral-900/50 backdrop-blur-sm
            border ${error ? 'border-red-500/50' : 'border-white/10'}
            text-neutral-100 placeholder:text-neutral-500
            transition-all duration-200
            focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500' : 'focus:ring-brand-500'} focus:border-transparent
            hover:border-white/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);


