'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import Link from 'next/link';

const WORKOUT_TYPES = ['run', 'strength', 'cardio', 'hiit', 'flexibility', 'sport', 'other'];

export default function Workouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.workouts.my()
      .then(setWorkouts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container">Loading...</div>;

  const totalMinutes = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
  const thisWeek = workouts.filter(w => {
    const d = new Date(w.completed_at || w.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d > weekAgo;
  }).length;

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
        Recent Workouts
      </h2>

      {workouts.length === 0 ? (
        <div className="empty">No workouts yet. Start crushing it!</div>
      ) : (
        workouts.map((workout) => (
          <div key={workout.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="workout-type">{workout.type}</span>
                <h3 style={{ marginTop: '0.5rem' }}>{workout.title}</h3>
                {workout.description && (
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                    {workout.description}
                  </p>
                )}
              </div>
              {workout.duration_minutes && (
                <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{workout.duration_minutes}m</span>
              )}
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {new Date(workout.completed_at || workout.created_at).toLocaleDateString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
