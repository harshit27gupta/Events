import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { PortalInput } from './components/PortalInput';
import { PortalButton } from './components/PortalButton';
import { api } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type Mode = 'login' | 'signup';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});
const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

// Lazy load R3F background to optimize bundle
const PortalBackground = React.lazy(() => import('./components/PortalBackground'));

export function AuthPortal({ open, onClose, initialMode = 'login' }: { open: boolean; onClose: () => void; initialMode?: Mode }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const schema = useMemo(() => (mode === 'login' ? loginSchema : signupSchema), [mode]);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<any>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: any) => {
    try {
      setLoading(true);
      if (mode === 'login') {
        await api.post('/api/auth/login', values);
        toast.success('Logged in');
      } else {
        await api.post('/api/auth/signup', values);
        toast.success('Account created');
      }
      // Ensure auth cache is fresh for components depending on `me`
      try { await queryClient.invalidateQueries({ queryKey: ['me'] }); } catch {}
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setLoading(false);
      }, 900);
    } catch (err: any) {
      const msg = err?.response?.data?.error || (mode === 'login' ? 'Login failed' : 'Signup failed');
      toast.error(msg);
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    reset();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 portal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <React.Suspense fallback={null}>
              <PortalBackground />
            </React.Suspense>
          </motion.div>

          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-portal-title"
          >
            <motion.div
              layout
              className="portal-glass w-full max-w-lg p-8"
              initial={{ y: 12, opacity: 0, filter: 'blur(6px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: 6, opacity: 0, filter: 'blur(6px)' }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 id="auth-portal-title" className="text-2xl font-semibold text-gradient-holo">
                    {mode === 'login' ? 'Welcome back' : 'Create account'}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    {mode === 'login' ? 'Log in to your portal' : 'Sign up to enter the portal'}
                  </p>
                </div>
                <button onClick={onClose} className="text-neutral-400 hover:text-white px-2 py-1 rounded-md">
                  Esc
                </button>
              </div>

              <motion.form
                layout
                onSubmit={handleSubmit(onSubmit)}
                className="mt-6 space-y-4"
              >
                <AnimatePresence initial={false}>
                  {mode === 'signup' && (
                    <motion.div
                      key="name"
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      transition={{ duration: 0.28 }}
                    >
                      <PortalInput label="Name" placeholder="Your name" {...register('name')} error={(errors as any).name?.message as string} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <PortalInput label="Email" placeholder="you@example.com" {...register('email')} error={(errors as any).email?.message as string} />

                <PortalInput label="Password" type="password" placeholder="••••••••" {...register('password')} error={(errors as any).password?.message as string} />

                <div className="pt-2 grid grid-cols-2 gap-3">
                  <button type="button" onClick={switchMode} className="text-sm text-neutral-300 hover:text-white px-3 py-2 rounded-md border border-white/10 bg-white/5">
                    {mode === 'login' ? 'Need an account?' : 'Have an account?'}
                  </button>
                  <PortalButton type="submit" loading={loading} success={success}>
                    {mode === 'login' ? (loading ? 'Signing in…' : 'Continue') : (loading ? 'Creating…' : 'Sign up')}
                  </PortalButton>
                </div>
              </motion.form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AuthPortal;


