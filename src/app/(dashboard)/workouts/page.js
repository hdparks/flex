'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';
import Link from 'next/link';
import { WORKOUT_TYPES } from '../../../lib/constants';

function WorkoutCard({ workout, onUpdate, onDelete, toast, canEdit = true }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    type: workout.type,
    title: workout.title,
    description: workout.description || '',
    duration_minutes: workout.duration_minutes || '',
    completed_at: (workout.completed_at || workout.created_at).split('T')[0]
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(workout.id, {
        ...form,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      });
      setEditing(false);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this workout?')) return;
    try {
      await onDelete(workout.id);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (editing) {
    return (
      <div className="card">
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
          <label className="label">Duration (min)</label>
          <input
            type="number"
            className="input"
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <span className="workout-type">{workout.type}</span>
          <h3 style={{ marginTop: '0.5rem' }}>{workout.title}</h3>
          {workout.description && (
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
              {workout.description}
            </p>
          )}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
            <button className="btn-icon" onClick={() => setEditing(true)} title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button className="btn-icon btn-danger" onClick={handleDelete} title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {new Date(workout.completed_at || workout.created_at).toLocaleDateString()}
        </div>
        {workout.duration_minutes && (
          <span style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.875rem' }}>
            {workout.duration_minutes}m
          </span>
        )}
      </div>
    </div>
  );
}

export default function Workouts() {
  const { toast } = useToast();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('my');

  const loadWorkouts = (filterType) => {
    setLoading(true);
    setError(null);
    const fetchFn = filterType === 'my' ? api.workouts.my() : api.workouts.list();
    fetchFn
      .then((data) => {
        setWorkouts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setWorkouts([]);
        setLoading(false);
      });
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWorkouts(filter);
  }, [filter]);

  const handleUpdate = async (id, data) => {
    const updated = await api.workouts.update(id, data);
    setWorkouts(prev => prev.map(w => w.id === id ? updated : w));
  };

  const handleDelete = async (id) => {
    await api.workouts.delete(id);
    setWorkouts(prev => prev.filter(w => w.id !== id));
  };

  if (loading) return <div className="container">Loading...</div>;

  if (error) {
    return (
      <div className="container">
        <div className="error">Failed to load workouts: {error.message}</div>
      </div>
    );
  }

  const totalMinutes = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);

  return (
    <div>
      <div className="grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat">
          <div className="stat-value">{workouts.length}</div>
          <div className="stat-label">Total Workouts</div>
        </div>
        <div className="card stat">
          <div className="stat-value">{totalMinutes}</div>
          <div className="stat-label">Minutes</div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <Link href="/workouts/new" className="btn btn-primary" style={{ width: '100%' }}>
          + Log Workout
        </Link>
      </div>

      <h2 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
        {filter === 'my' ? 'My' : 'Team'} Recent Workouts
      </h2>

      {workouts.length === 0 ? (
        <div className="empty">No workouts yet. Start crushing it!</div>
      ) : (
        workouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            toast={toast}
            canEdit={filter === 'my'}
          />
        ))
      )}
    </div>
  );
}