'use client';
import { useEffect, useState, useRef } from 'react';
import { api } from '../../../lib/api';
import { useSession } from 'next-auth/react';

const EMOJIS = ['🔥', '💪', '👏', '❤️', '🎉', '⭐', '🚀', '💯'];

function CheerButton({ workoutId, onCheer }) {
  const [open, setOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const handleEmojiClick = async (emoji) => {
    await onCheer(workoutId, emoji, null);
    setOpen(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setShowCamera(true);
      setVideoReady(false);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Camera error:', err);
      alert('Could not access camera');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && videoRef.current.readyState >= 2) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      setCapturedImage(dataUrl);
    }
  };

  const sendPhoto = async () => {
    if (capturedImage) {
      await onCheer(workoutId, null, capturedImage);
      setOpen(false);
      setShowCamera(false);
      setCapturedImage(null);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCapturedImage(null);
    setVideoReady(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-ghost"
        style={{ padding: '0.25rem 0.5rem', fontSize: '1.25rem' }}
      >
        👍
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '0.5rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '0.5rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 50,
        }}>
          {!showCamera ? (
            <>
              <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      borderRadius: '0.25rem',
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button
                onClick={startCamera}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                📷 Send Photo
              </button>
            </>
          ) : (
            <div style={{ width: '200px' }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                onLoadedMetadata={() => setVideoReady(true)}
                style={{ width: '100%', borderRadius: '0.5rem', display: capturedImage ? 'none' : 'block' }} 
              />
              {capturedImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capturedImage} alt="Captured" style={{ width: '100%', borderRadius: '0.5rem' }} />
              )}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                {!capturedImage ? (
                  <button onClick={capturePhoto} className="btn btn-primary" style={{ flex: 1 }} disabled={!videoReady}>Capture</button>
                ) : (
                  <button onClick={sendPhoto} className="btn btn-primary" style={{ flex: 1 }}>Send</button>
                )}
                <button onClick={stopCamera} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WorkoutCard({ workout, onCheer, currentUserId }) {

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ marginRight: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
          {workout.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={workout.avatar_url}
              alt={workout.username}
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div className="avatar">{workout.username?.[0]?.toUpperCase()}</div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: '600' }}>{workout.username}</span>
              <span className="timestamp">{formatDate(workout.completed_at || workout.created_at)}</span>
              <span className="workout-type">{workout.type}</span>
              {workout.duration_minutes && (
                <span style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.875rem' }}>
                  {workout.duration_minutes}m
                </span>
              )}
            </div>
          </div>
          <h3 style={{ marginTop: '0.5rem' }}>{workout.title}</h3>
	  <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem', justifyContent: 'space-between'}}>
	    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
	      {workout?.description}
	    </p>
            <div style={{ display: 'flex', alignSelf: 'end', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-light)', padding: '0.25rem 0.5rem', borderRadius: '1rem', flexShrink: 0 }}>
              <CheerButton workoutId={workout.id} onCheer={onCheer} />
              {workout.cheer_count > 0 && (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {workout.cheer_count}
                </span>
              )}
              {workout.cheers?.length > 0 && (
                <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
                  {workout.cheers.slice(0, 5).map((cheer, i) => (
                    <div
                      key={cheer.id}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '2px solid var(--surface-light)',
                        marginLeft: i > 0 ? '-8px' : 0,
                        background: cheer.image ? `url(${cheer.image}) center/cover` : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: cheer.image ? '0' : '0.75rem',
                      }}
                    >
                      {!cheer.image && (cheer.message || '👏')}
                    </div>
                  ))}
                  {workout.cheer_count > 5 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                      +{workout.cheer_count - 5}
                    </span>
                  )}
                </div>
              )}
            </div>
	    
	  </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);

  const loadFeed = () => {
    api.team.feed()
      .then(setFeed)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([api.team.feed(), api.team.get()])
      .then(([feedData, teamData]) => {
        setFeed(feedData);
        setTeams(teamData.teams || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCheer = async (workoutId, message, image) => {
    try {
      await api.cheers.create(workoutId, message, image);
      loadFeed();
    } catch (err) {
      console.error(err);
    }
  };

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
      {feed.map((item) => (
        <WorkoutCard
          key={item.id}
          workout={item}
          onCheer={handleCheer}
          currentUserId={session?.user?.id}
        />
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
