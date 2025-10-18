import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string().min(1),
  location: z.string().optional(),
  tags: z.string().optional()
});
type FormValues = z.infer<typeof schema>;

export function OrganizerEventForm() {
  const { id } = useParams();
  const isCreate = id === 'new' || !id;
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (!id || isCreate) return;
    (async () => {
      try {
        const r = await api.get(`/api/events/${id}`);
        const e = r.data;
        setValue('title', e.title || '');
        setValue('description', e.description || '');
        setValue('date', e.date || '');
        setValue('location', e.location || '');
        setValue('tags', Array.isArray(e.tags) ? e.tags.join(', ') : '');
      } catch {}
    })();
  }, [id, isCreate, setValue]);

  const onSubmit = async (values: FormValues) => {
    const payload: any = {
      title: values.title,
      description: values.description || null,
      date: values.date,
      location: values.location || null,
      tags: values.tags ? values.tags.split(',').map(s => s.trim()).filter(Boolean) : []
    };
    try {
      if (isCreate) {
        const r = await api.post('/api/events', payload);
        toast.success('Event created');
        navigate(`/events/${r.data._id}`);
      } else {
        await api.put(`/api/events/${id}`, payload);
        toast.success('Event updated');
        navigate(`/events/${id}`);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save event');
    }
  };

  return (
    <form className="glass p-6 space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label className="block text-sm text-neutral-300 mb-1">Title</label>
        <input {...register('title')} className="w-full bg-neutral-800/60 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" />
        {errors.title && <p className="text-xs text-red-300 mt-1">{errors.title.message}</p>}
      </div>
      <div>
        <label className="block text-sm text-neutral-300 mb-1">Description</label>
        <textarea {...register('description')} className="w-full bg-neutral-800/60 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div>
        <label className="block text-sm text-neutral-300 mb-1">Date</label>
        <input type="datetime-local" {...register('date')} className="w-full bg-neutral-800/60 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" />
        {errors.date && <p className="text-xs text-red-300 mt-1">{errors.date.message}</p>}
      </div>
      <div>
        <label className="block text-sm text-neutral-300 mb-1">Location</label>
        <input {...register('location')} className="w-full bg-neutral-800/60 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div>
        <label className="block text-sm text-neutral-300 mb-1">Tags (comma-separated)</label>
        <input {...register('tags')} className="w-full bg-neutral-800/60 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div className="pt-2">
        <button disabled={isSubmitting} type="submit" className="px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-500 disabled:opacity-50">{isCreate ? 'Create' : 'Save changes'}</button>
      </div>
    </form>
  );
}


