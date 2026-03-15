'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function Dashboard() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    Promise.all([api.team.feed(), api.team.get()])
      .then(([feedData, teamData]) => {
        setFeed(feedData);
        setTeams(teamData.teams || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container">Loading...</div>;

  if (teams.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Join or Create a Team</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Create a team to train with your friends and track progress together.
        </p>
        <a href="/team" className="btn btn-primary">Get Started</a>
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="empty">
        <p>No activity yet. Start by logging a workout!</p>
        <a href="/workouts/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>Log Workout</a>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Team Activity
      </h2>
      {feed.map((item, i) => (
        <div key={item.id} className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className="avatar">{item.username?.[0]?.toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: '600' }}>{item.username}</div>
              <div className="timestamp">
                completed a workout • {formatDate(item.completed_at || item.created_at)}
              </div>
            </div>
          </div>
          
          {item.type === 'workout' && (
            <div>
              <span className="workout-type">{item.type}</span>
              <h3 style={{ marginTop: '0.5rem' }}>{item.title}</h3>
              {item.description && <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{item.description}</p>}
              {item.duration_minutes && (
                <p style={{ color: 'var(--primary)', marginTop: '0.5rem' }}>⏱️ {item.duration_minutes} min</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
