'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '../../lib/api';

function JoinTeamContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');
  
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }

    const token = api.getToken();
    setIsLoggedIn(!!token);

    api.team.getByInviteCode(code)
      .then(setTeam)
      .catch(() => {
        setError('Invalid or expired invite link');
      })
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (isLoggedIn && team) {
      api.team.get()
        .then((data) => {
          const member = data.teams?.find(t => t.invite_code === code);
          if (member) {
            setAlreadyMember(true);
          }
        })
        .catch(console.error);
    }
  }, [isLoggedIn, team, code]);

  const handleJoin = async () => {
    setJoining(true);
    setError('');
    try {
      await api.team.join(code);
      router.push('/team');
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleLogin = () => {
    sessionStorage.setItem('join_code', code);
    router.push('/');
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Join a Team</h2>
          <p style={{ color: 'var(--text-muted)' }}>Ask your friend for their invite link to join their team.</p>
        </div>
      </div>
    );
  }

  if (error && !team) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--error)' }}>Invalid Invite Link</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => router.push('/')}>Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        {alreadyMember ? (
          <>
            <h2 style={{ marginBottom: '1rem' }}>You&apos;re already in this team!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              You are already a member of <strong>{team.name}</strong>.
            </p>
            <button className="btn btn-primary" onClick={() => router.push('/team')}>Go to Team</button>
          </>
        ) : isLoggedIn ? (
          <>
            <h2 style={{ marginBottom: '0.5rem' }}>Join {team.name}?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              You&apos;ve been invited to join this team.
            </p>
            {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => router.push('/')}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleJoin} disabled={joining}>
                {joining ? 'Joining...' : 'Join Team'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: '0.5rem' }}>You&apos;ve been invited!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Join <strong>{team.name}</strong>
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Sign in or create an account to join the team.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleLogin}>
              Sign In / Sign Up
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p>Loading...</p>
    </div>
  );
}

export default function JoinTeam() {
  return (
    <Suspense fallback={<Loading />}>
      <JoinTeamContent />
    </Suspense>
  );
}
