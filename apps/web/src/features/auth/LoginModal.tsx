import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { toast } from 'sonner';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type FormValues = z.infer<typeof schema>;

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });
  if (!open) return null;

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post('/api/auth/login', values);
      toast.success('Logged in');
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Login failed';
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md glass p-6">
        <h2 className="text-lg font-semibold mb-4">Log in</h2>
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Email</label>
            <input {...register('email')} className="w-full bg-neutral-800/60 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" placeholder="you@example.com" />
            {errors.email && <p className="text-xs text-red-300 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Password</label>
            <input type="password" {...register('password')} className="w-full bg-neutral-800/60 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" placeholder="••••••••" />
            {errors.password && <p className="text-xs text-red-300 mt-1">{errors.password.message}</p>}
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-sm text-neutral-300 hover:text-white">Cancel</button>
            <button disabled={isSubmitting} type="submit" className="px-4 py-2 text-sm rounded-md bg-brand-600 hover:bg-brand-500 disabled:opacity-50">{isSubmitting ? 'Signing in…' : 'Continue'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
