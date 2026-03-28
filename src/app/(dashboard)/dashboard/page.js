'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getCurrentWeek } from '@/lib/week-utils';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ToastProvider';
import { CountdownTimer } from '@/components/CountdownTimer';
import { WorkoutCard } from '@/components/WorkoutCard';

export default function Dashboard() {
  const router = useRouter();
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

  useEffect(() => {
    if (!session?.user?.id) return;
    const { year, week } = getCurrentWeek();
    
    let targetYear = year;
    let targetWeek = week - 1;
    if (targetWeek < 1) {
      targetYear = year - 1;
      targetWeek = 52;
    }
    
    const lastWeekReviewDate = localStorage.getItem(`weekReviewSeen-${targetYear}-${targetWeek}`);
    if (!lastWeekReviewDate) {
      router.push(`/user/${session.user.id}/week-in-review/${targetYear}-${targetWeek}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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
      const cheer = await api.cheers.create(workoutId, message, image);
      setFeed(prev => prev.map(w => 
        w.id === workoutId 
          ? { 
              ...w, 
              cheer_count: (w.cheer_count || 0) + 1,
              cheers: [...(w.cheers || []), cheer]
            }
          : w
      ));
    } catch (err) {
      console.error(err);
      toast(err.message || 'Failed to cheer', 'error');
    }
  };

  const handleDelete = async (workoutId) => {
    try {
      await api.workouts.delete(workoutId);
      setFeed(prev => prev.filter(w => w.id !== workoutId));
      toast('Workout deleted', 'success');
    } catch (err) {
      console.error(err);
      toast(err.message || 'Failed to delete', 'error');
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
          onDelete={handleDelete}
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
