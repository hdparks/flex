'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { api } from '../../../../lib/api';
import { toLocalDatetimeInput, fromLocalDatetimeInput } from '../../../../lib/dateUtils';
import { useToast } from '../../../../components/ToastProvider';

const WORKOUT_TYPES = ['run', 'strength', 'cardio', 'hiit', 'flexibility', 'sport', 'other'];

export default function NewWorkout() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState({
    type: 'run',
    title: '',
    description: '',
    duration_minutes: '',
    completed_at: toLocalDatetimeInput(new Date().toISOString())
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setImageFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        ...form,
        completed_at: fromLocalDatetimeInput(form.completed_at),
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      };
      
      if (imageFile) {
        payload.image = imagePreview;
      }
      
      await api.workouts.create(payload);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'],
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
          <label className="label">Photo (optional)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label className="btn btn-secondary" style={{ cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              Choose Image
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            </label>
            {imagePreview && (
              <div style={{ position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '0.5rem' }} />
                <button
                  type="button"
                  onClick={() => { setImagePreview(null); setImageFile(null); }}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'var(--error)',
                    border: 'none',
                    color: 'white',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
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
          <label className="label">Date & Time</label>
          <input
            type="datetime-local"
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
