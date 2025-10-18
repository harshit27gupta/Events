import React from 'react';
import { motion } from 'framer-motion';

export interface PortalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  success?: boolean;
}

export function PortalButton({ loading, success, className = '', children, ...props }: PortalButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      disabled={loading || props.disabled}
      className={`relative inline-flex items-center justify-center w-full rounded-xl px-4 py-3 font-semibold text-white select-none ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.18))',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
      }}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">
        {loading && (
          <span className="h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
        )}
        <span>{children}</span>
      </span>

      {/* energy border */}
      <span className="pointer-events-none absolute inset-0 rounded-xl" style={{ boxShadow: '0 0 0 1px rgba(0,217,245,0.25), 0 0 32px rgba(168,85,247,0.18)' }} />

      {success && <span className="portal-burst" />}
    </motion.button>
  );
}


