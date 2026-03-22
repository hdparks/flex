'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useSession } from 'next-auth/react';
import { WorkoutCard } from '@/components/WorkoutCard';

export default function UserProfile() {
  const params = useParams();
  const { data: session } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.users.get(params.id);
        setUser(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadUser();
    }
  }, [params.id]);

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (error) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>Failed to load profile</p>
        <Link href="/dashboard" className="btn btn-primary">Back to Feed</Link>
      </div>
    );
  }

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div>
      <Link href="/dashboard" className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
        ← Back
      </Link>

      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt={user.username}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--primary)',
            }}
          />
        ) : (
          <div
            className="avatar"
            style={{
              width: '120px',
              height: '120px',
              fontSize: '3rem',
              border: '3px solid var(--primary)',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {user.username?.[0]?.toUpperCase()}
          </div>
        )}
        <h2 style={{ marginTop: '1rem' }}>{user.username}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Member since {memberSince}
        </p>
      </div>

      <div className="grid" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card stat">
          <div className="stat-value">{user.workout_count}</div>
          <div className="stat-label">Workouts</div>
        </div>
        <div className="card stat">
          <div className="stat-value">{user.total_minutes}</div>
          <div className="stat-label">Minutes</div>
        </div>
      </div>

      <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Recent Workouts
      </h3>

      {user.workouts && user.workouts.length > 0 ? (
        user.workouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            currentUserId={session?.user?.id}
          />
        ))
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No workouts to show</p>
        </div>
      )}
    </div>
  );
}
