'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { useToast } from '../../../../components/ToastProvider';

const WORKOUT_TYPES = ['run', 'strength', 'cardio', 'hiit', 'flexibility', 'sport', 'other'];

export default function NewWorkout() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: 'run',
    title: '',
    description: '',
    duration_minutes: '',
    completed_at: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await api.workouts.create({
        ...form,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      });
      router.push('/workouts');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Log Workout</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">Type</label>
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {WORKOUT_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="label">Title</label>
          <input
            type="text"
            className="input"
            placeholder="e.g., Morning Run"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="label">Description (optional)</label>
          <textarea
            className="input"
            rows={3}
            placeholder="How did it go?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="label">Duration (minutes)</label>
          <input
            type="number"
            className="input"
            placeholder="30"
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={form.completed_at}
            onChange={(e) => setForm({ ...form, completed_at: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => router.back()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
            {loading ? 'Saving...' : 'Log It'}
          </button>
        </div>
      </form>
    </div>
  );
}
