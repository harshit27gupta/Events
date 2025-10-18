import React, { forwardRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

export interface PortalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const PortalInput = forwardRef<HTMLInputElement, PortalInputProps>(
  ({ label, error, hint, className = '', type = 'text', onFocus, onBlur, onKeyDown, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [pulseKey, setPulseKey] = useState(0);

    const handleFocus = useCallback<NonNullable<typeof onFocus>>((e) => {
      setFocused(true);
      onFocus?.(e);
    }, [onFocus]);

    const handleBlur = useCallback<NonNullable<typeof onBlur>>((e) => {
      setFocused(false);
      onBlur?.(e);
    }, [onBlur]);

    const handleKeyDown = useCallback<NonNullable<typeof onKeyDown>>((e) => {
      setPulseKey((k) => k + 1);
      onKeyDown?.(e);
    }, [onKeyDown]);

    const inputId = props.id || props.name || undefined;

    return (
      <div className={`space-y-1 ${className}`}>
        {label && (
          <label htmlFor={inputId} className="block text-[11px] font-medium tracking-[0.08em] uppercase text-neutral-300">
            {label}
          </label>
        )}

        <motion.div
          initial={false}
          animate={focused ? { boxShadow: '0 0 0 1px rgba(0,217,245,0.55), 0 0 24px rgba(0,217,245,0.25)', y: -1, scale: 1.005 } : { boxShadow: '0 0 0 0 rgba(0,0,0,0)', y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className={`relative rounded-xl ${error ? 'ring-1 ring-red-500/60' : ''}`}
        >
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={`input-holo w-full ${type === 'password' ? 'password-scan' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            {...props}
          />

          {/* typing pulse ring */}
          <motion.span
            key={pulseKey}
            className="pointer-events-none absolute inset-0 rounded-xl"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: focused ? 1 : 0, scale: 1 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{ boxShadow: '0 0 0 1px rgba(0,217,245,0.25), 0 0 36px rgba(168,85,247,0.18)' }}
          />
        </motion.div>

        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-[11px] text-neutral-400">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="text-[11px] text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

PortalInput.displayName = 'PortalInput';


