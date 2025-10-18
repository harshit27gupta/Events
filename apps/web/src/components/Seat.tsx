import React from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

type Props = {
  id: string;
  label: string; // e.g., A1
  state: 'available' | 'held' | 'reserved' | 'selected';
  disabled?: boolean;
  onClick?: () => void;
  onHoverRipple?: (id: string) => void;
  onHoverEndRipple?: () => void;
  neighborPulse?: boolean;
  highlight?: boolean;
};

const stateToClass: Record<Props['state'], string> = {
  available: 'holo-available glow-cyan',
  held: 'holo-held glow-amber',
  reserved: 'holo-reserved glow-magenta',
  selected: 'holo-selected glow-cyan'
};

export function Seat({ id, label, state, disabled, onClick, onHoverRipple, onHoverEndRipple, neighborPulse, highlight }: Props) {
  const scale = useMotionValue(1);
  const spring = useSpring(scale, { stiffness: 220, damping: 22, mass: 0.4 });

  const handleHoverStart = () => {
    scale.set(1.12);
    onHoverRipple?.(id);
  };
  const handleHoverEnd = () => { scale.set(1); onHoverEndRipple?.(); };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      style={{ scale: spring }}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      onClick={onClick}
      aria-label={`Seat ${label} ${state}`}
      className={`relative w-8 h-8 md:w-10 md:h-10 rounded-[6px] text-[10px] flex items-center justify-center select-none focus:outline-none focus:ring-2 focus:ring-white/70 ${stateToClass[state]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${neighborPulse ? 'animate-breathe' : ''}`}
      disabled={disabled}
    >
      <span className="relative z-10">{label.replace(/^[A-Z]/, '')}</span>
      {/* Glow halo */}
      <div className="pointer-events-none absolute inset-0 rounded-[8px] blur-md opacity-40" style={{ background: 'radial-gradient(60% 60% at 50% 50%, rgba(255,255,255,0.35), rgba(255,255,255,0))' }} />
      {highlight && <div className="pointer-events-none absolute inset-0 ripple-ring" />}
    </motion.button>
  );
}

export default Seat;


