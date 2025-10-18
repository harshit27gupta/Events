import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

type FormValues = z.infer<typeof schema>;

export function SignupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post('/api/auth/signup', values);
      toast.success('Account created');
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Signup failed';
      toast.error(msg);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-title"
          >
            <div className="relative w-full max-w-md glass-elevated p-8" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
              <h2 id="signup-title" className="text-lg font-semibold mb-4">Create account</h2>
              <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <label className="block text-sm text-neutral-300 mb-1" htmlFor="name">Name</label>
                  <input id="name" autoFocus {...register('name')} className="w-full bg-neutral-800/60 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" placeholder="Your name" />
                  {errors.name && <p className="text-xs text-red-300 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-1" htmlFor="email">Email</label>
                  <input id="email" {...register('email')} className="w-full bg-neutral-800/60 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" placeholder="you@example.com" />
                  {errors.email && <p className="text-xs text-red-300 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-1" htmlFor="password">Password</label>
                  <input id="password" type="password" {...register('password')} className="w-full bg-neutral-800/60 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" placeholder="••••••••" />
                  {errors.password && <p className="text-xs text-red-300 mt-1">{errors.password.message}</p>}
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button type="button" onClick={onClose} className="px-3 py-2 text-sm text-neutral-300 hover:text-white">Cancel</button>
                  <button disabled={isSubmitting} type="submit" className="px-4 py-2 text-sm rounded-md bg-brand-600 hover:bg-brand-500 disabled:opacity-50">{isSubmitting ? 'Creating…' : 'Sign up'}</button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
