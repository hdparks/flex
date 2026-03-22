'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ToastProvider';
import Link from 'next/link';
import { WorkoutCard } from '@/components/WorkoutCard';
import { WorkoutEditModal } from '@/components/WorkoutEditModal';

export default function Workouts() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('my');
  const [editingWorkout, setEditingWorkout] = useState(null);

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
            currentUserId={session?.user?.id}
            onEdit={filter === 'my' ? (w) => setEditingWorkout(w) : null}
            onDelete={filter === 'my' ? handleDelete : null}
          />
        ))
      )}

      {editingWorkout && (
        <WorkoutEditModal
          workout={editingWorkout}
          onSave={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setEditingWorkout(null)}
        />
      )}
    </div>
  );
}