'use client';
import { useEffect, useState, useRef } from 'react';
import { api } from '../../../lib/api';
import { formatRelativeTime } from '../../../lib/dateUtils';
import { useSession } from 'next-auth/react';
import { ImagePlus, Smile, CirclePlus, MessageSquare } from 'lucide-react';
import { useToast } from '../../../components/ToastProvider';
import { TrashIcon } from '../../../components/TrashIcon';

const EMOJIS = ['🔥', '💪', '👏', '❤️', '🎉', '⭐', '🚀', '💯'];

function CheerButton({ workoutId, onCheer, disabled }) {
  const [open, setOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const popoverRef = useRef(null);
  const timeoutRef = useRef(null);

  const stopCamera = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
    setCapturedImage(null);
    setVideoReady(false);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        stopCamera();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

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
      timeoutRef.current = setTimeout(() => {
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
      stopCamera();
    }
  };

  const sendPhoto = async () => {
    if (capturedImage) {
      await onCheer(workoutId, null, capturedImage);
      setOpen(false);
      stopCamera();
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        className="btn btn-ghost"
        style={{ padding: '0.25rem 0.5rem', position: 'relative', opacity: disabled ? 0.5 : 1 }}
        disabled={disabled}
      >
        <Smile size={20} />
	<svg width={12} height={12} style={{ position: 'absolute', top: 3, right: 3}}>
	  <circle cx={6} cy={6} r={6} fill='var(--surface)' />
        </svg>
        <CirclePlus strokeWidth={3} size={10} style={{ position: 'absolute', top: 3, right: 3 }} />
      </button>
      {open && (
        <div ref={popoverRef} style={{
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
		  <div style={{ width: '2px', background: 'var(--border)', margin: '0 0.25rem' }}></div>
		  <button 
		    onClick={startCamera}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.5rem',
                      color: 'var(--bg)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
		  >
                    <ImagePlus size={20} />
		  </button>
              </div>
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

function WorkoutCard({ workout, onCheer, currentUserId, onRefresh }) {
  const [comments, setComments] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const isOwnWorkout = currentUserId && workout.userId === currentUserId;

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const data = await api.comments.list(workout.id);
      setComments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.id]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await api.comments.create(workout.id, newComment.trim());
      setNewComment('');
      setShowInput(false);
      loadComments();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.comments.delete(commentId);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      console.error(err);
    }
  };

  const visibleComments = showAll ? comments : comments.slice(0, 3);
  const hasMoreComments = comments.length > 3;

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
              {isOwnWorkout && (
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'var(--surface-light)', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>
                  you
                </span>
              )}
              <span className="timestamp">{formatRelativeTime(workout.completed_at || workout.created_at)}</span>
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
	    <div>
	      <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
	        {workout?.description}
	      </p>
	      {workout.image && (
	        // eslint-disable-next-line @next/next/no-img-element
	        <img src={workout.image} alt="Workout" style={{ width: '100%', borderRadius: '0.5rem', marginTop: '0.5rem', maxHeight: '300px', objectFit: 'cover' }} />
	      )}
	    </div>
            <div style={{ display: 'flex', alignSelf: 'end', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-light)', padding: '0.25rem 0.5rem', borderRadius: '1rem', flexShrink: 0 }}>
              <button
                onClick={() => setShowInput(!showInput)}
                className="btn btn-ghost"
                style={{ padding: '0.25rem 0.5rem', opacity: showInput ? 1 : 0.7 }}
                title="Add comment"
              >
                <MessageSquare size={18} />
              </button>
              {comments.length > 0 && (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {comments.length}
                </span>
              )}
              <CheerButton workoutId={workout.id} onCheer={onCheer} disabled={isOwnWorkout} />
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
                        background: cheer.image ? `url(${cheer.image}) center/cover` : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: cheer.image ? '0' : '1.05rem',
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

      {comments.length > 0 && (
        <div className="comments-section" style={{ marginLeft: '2.5rem' }}>
          {visibleComments.map((comment) => (
            <div key={comment.id} className="comment">
              {comment.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={comment.avatar_url}
                  alt={comment.username}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                  {comment.username?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="comment-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="comment-username">{comment.username}</span>
                    <span className="timestamp" style={{ marginLeft: '0.5rem' }}>{formatRelativeTime(comment.created_at)}</span>
                  </div>
                  {currentUserId === comment.user_id && (
                    <button className="btn-icon btn-danger" onClick={() => handleDeleteComment(comment.id)} title="Delete" style={{ marginLeft: '0.5rem' }}>
                      <TrashIcon size={14} />
                    </button>
                  )}
                </div>
                <p className="comment-text">{comment.content}</p>
              </div>
            </div>
          ))}
          {hasMoreComments && (
            <button
              className="comment-action"
              onClick={() => setShowAll(!showAll)}
              style={{ marginTop: '0.5rem' }}
            >
              {showAll ? 'Show less' : `Show ${comments.length - 3} more comment${comments.length - 3 === 1 ? '' : 's'}`}
            </button>
          )}
          {showInput ? (
            <div className="comment-input-row">
              <input
                type="text"
                className="input comment-input"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                autoFocus
              />
              <button
                className="btn btn-primary"
                style={{ padding: '0.5rem 0.75rem' }}
                onClick={handleSubmitComment}
                disabled={submitting || !newComment.trim()}
              >
                {submitting ? '...' : 'Post'}
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.5rem 0.75rem' }}
                onClick={() => { setShowInput(false); setNewComment(''); }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="comment-action"
              onClick={() => setShowInput(true)}
              style={{ marginTop: '0.5rem' }}
            >
              Add a comment
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);

  const loadFeed = () => {
    setLoading(true);
    return api.team.feed()
      .then(setFeed)
      .catch((err) => {
        console.error(err);
        throw err;
      })
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
      toast(err.message || 'Failed to cheer', 'error');
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
