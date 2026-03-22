'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { formatRelativeTime } from '../../../lib/dateUtils';
import { useSession } from 'next-auth/react';
import { ImagePlus, Smile, CirclePlus, Users } from 'lucide-react';
import { useToast } from '../../../components/ToastProvider';
import { TrashIcon } from '../../../components/TrashIcon';
import { CountdownTimer } from '../../../components/CountdownTimer';

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
  const { data: session } = useSession();
  const { toast } = useToast();
  const [comments, setComments] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [showAllCheers, setShowAllCheers] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const cheersPopoverRef = useRef(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [participantLoading, setParticipantLoading] = useState(false);
  const [localParticipants, setLocalParticipants] = useState(workout.participants || []);
  const isOwnWorkout = currentUserId && workout.userId === currentUserId;
  const isParticipant = localParticipants.some(p => p.user_id === currentUserId);

  const currentUser = {
    user_id: session?.user?.id,
    username: session?.user?.name,
    avatar_url: session?.user?.image,
  };

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

  useEffect(() => {
    if (!showAllCheers) return;
    
    const handleClickOutside = (event) => {
      if (cheersPopoverRef.current && !cheersPopoverRef.current.contains(event.target)) {
        setShowAllCheers(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAllCheers]);

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

  const handleToggleParticipant = async () => {
    if (participantLoading || isOwnWorkout) return;
    
    const wasParticipant = isParticipant;
    if (wasParticipant) {
      setLocalParticipants(localParticipants.filter(p => p.user_id !== currentUserId));
    } else {
      setLocalParticipants([...localParticipants, currentUser]);
    }
    
    setParticipantLoading(true);
    try {
      if (wasParticipant) {
        await api.participants.remove(workout.id);
        toast('Removed from workout', 'success');
      } else {
        await api.participants.add(workout.id);
        toast('Added to workout!', 'success');
      }
    } catch (err) {
      console.error(err);
      if (wasParticipant) {
        setLocalParticipants([...localParticipants, currentUser]);
      } else {
        setLocalParticipants(localParticipants.filter(p => p.user_id !== currentUserId));
      }
      toast(err.message || 'Failed to update', 'error');
    } finally {
      setParticipantLoading(false);
    }
  };

  const visibleComments = showAll ? comments : comments.slice(0, 3);
  const hasMoreComments = comments.length > 3;

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ marginRight: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
          <div style={{ display: 'flex' }}>
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
            {localParticipants?.map((p, i) => (
              p.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.avatar_url}
                  alt={p.username}
                  title={p.username}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginLeft: '-12px',
                    border: '2px solid var(--surface)',
                  }}
                />
              ) : (
                <div
                  key={p.id}
                  title={p.username}
                  className="avatar"
                  style={{
                    marginLeft: '-12px',
                    border: '2px solid var(--surface)',
                    fontSize: '0.9rem',
                  }}
                >
                  {p.username?.[0]?.toUpperCase()}
                </div>
              )
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link href={`/user/${workout.userId}`} style={{ fontWeight: '600', color: 'inherit', textDecoration: 'none' }}>
                {workout.username}
                {localParticipants?.length > 0 && (
                  <span style={{ fontWeight: '400', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                    + {localParticipants.map(p => p.username).join(', ')}
                  </span>
                )}
              </Link>
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
	        <img 
	          src={workout.image} 
	          alt="Workout" 
	          style={{ width: '100%', borderRadius: '0.5rem', marginTop: '0.5rem', maxHeight: '300px', objectFit: 'cover', cursor: 'pointer' }}
	          onClick={() => setLightboxImage(workout.image)}
	        />
	      )}
	    </div>
            <div style={{ display: 'flex', alignSelf: 'end', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-light)', padding: '0.25rem 0.5rem', borderRadius: '1rem', flexShrink: 0 }}>
              <CheerButton workoutId={workout.id} onCheer={onCheer} disabled={isOwnWorkout} />
              {workout.cheer_count > 0 && (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {workout.cheer_count}
                </span>
              )}
              {workout.cheers?.length > 0 && (
                <div style={{ position: 'relative' }} ref={cheersPopoverRef}>
                  <button
                    onClick={() => setShowAllCheers(!showAllCheers)}
                    style={{
                      display: 'flex',
                      gap: '0.25rem',
                      marginLeft: '0.5rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
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
                        title={`${cheer.username || 'Someone'}: ${cheer.message || '👏'}`}
                      >
                        {!cheer.image && (cheer.message || '👏')}
                      </div>
                    ))}
                    {workout.cheer_count > 5 && (
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginLeft: '0.25rem',
                        alignSelf: 'center',
                      }}>
                        +{workout.cheer_count - 5}
                      </span>
                    )}
                  </button>
                  {showAllCheers && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      minWidth: '200px',
                      zIndex: 100,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Cheers
                      </div>
                      {workout.cheers.map((cheer) => (
                        <div key={cheer.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '1rem' }}>{cheer.image ? '📷' : (cheer.message || '👏')}</span>
                          <span style={{ fontSize: '0.875rem' }}>{cheer.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={handleToggleParticipant}
                className="btn btn-ghost"
                style={{ padding: '0.25rem 0.5rem', opacity: isOwnWorkout ? 0.5 : (isParticipant ? 1 : 0.7) }}
                disabled={isOwnWorkout || participantLoading}
                title={isParticipant ? 'Remove yourself from this workout' : 'I did this too!'}
              >
                <Users size={18} style={{ color: isParticipant ? 'var(--primary)' : 'inherit' }} />
              </button>
            </div>
	    
	  </div>
        </div>
      </div>

      <div className="comments-section" style={{ marginLeft: '2.5rem' }}>
        {comments.length > 0 && visibleComments.map((comment) => (
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
      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'pointer',
          }}
          onClick={() => setLightboxImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Preview"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '0.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: 'white',
              fontSize: '1.5rem',
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
  );
}

export default function Dashboard() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [teams, setTeams] = useState([]);
  const [nextRace, setNextRace] = useState(null);
  const [period, setPeriod] = useState('all');
  const loadMoreRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.team.feed(null, period),
      api.team.get(),
      api.races.getNext().catch(() => null),
    ])
      .then(([feedData, teamData, raceData]) => {
        setFeed(feedData.workouts || []);
        setHasMore(!!feedData.nextCursor);
        setTeams(teamData.teams || []);
        setNextRace(raceData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || feed.length === 0) return;
    const lastItem = feed[feed.length - 1];
    const cursor = lastItem?.completed_at || lastItem?.created_at;
    
    setLoadingMore(true);
    try {
      const data = await api.team.feed(cursor, period);
      setFeed(prev => [...prev, ...(data.workouts || [])]);
      setHasMore(!!data.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, feed, period]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const handleCheer = async (workoutId, message, image) => {
    try {
      await api.cheers.create(workoutId, message, image);
      setFeed(prev => prev.map(w => 
        w.id === workoutId 
          ? { ...w, cheer_count: w.cheer_count + 1 }
          : w
      ));
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
      {nextRace && (
        <CountdownTimer raceDate={nextRace.race_date} raceName={nextRace.name} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
          Team Activity
        </h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>
      {feed.map((item) => (
        <WorkoutCard
          key={item.id}
          workout={item}
          onCheer={handleCheer}
          currentUserId={session?.user?.id}
        />
      ))}
      {hasMore && (
        <div ref={loadMoreRef} style={{ textAlign: 'center', padding: '1rem' }}>
          {loadingMore && <span style={{ color: 'var(--text-muted)' }}>Loading more...</span>}
        </div>
      )}
    </div>
  );
}
