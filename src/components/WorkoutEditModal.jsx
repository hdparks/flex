'use client';
import { useState } from 'react';
import { WORKOUT_TYPES } from '@/lib/constants';
import { toLocalDatetimeInput, fromLocalDatetimeInput } from '@/lib/dateUtils';
import { TrashIcon } from '@/components/TrashIcon';

export function WorkoutEditModal({ workout, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    type: workout.type,
    title: workout.title,
    description: workout.description || '',
    duration_minutes: workout.duration_minutes || '',
    completed_at: toLocalDatetimeInput(workout.completed_at || workout.created_at)
  });
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(workout.image || null);
  const [imageFile, setImageFile] = useState(null);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        ...form,
        completed_at: fromLocalDatetimeInput(form.completed_at),
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      };
      if (imageFile) {
        data.image = imagePreview;
      } else if (!imagePreview && workout.image) {
        data.image = null;
      }
      await onSave(workout.id, data);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this workout?')) return;
    try {
      await onDelete(workout.id);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: '500px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Edit Workout</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

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
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="label">Photo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
          <label className="label">Duration (min)</label>
          <input
            type="number"
            className="input"
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

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn btn-danger" onClick={handleDelete} style={{ flex: 1 }}>
            Delete
          </button>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving} style={{ flex: 1 }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}