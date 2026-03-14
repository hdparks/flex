'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function Team() {
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [form, setForm] = useState({ name: '', invite_code: '' });

  useEffect(() => {
    api.team.get()
      .then((data) => {
        setTeam(data.team);
        setMembers(data.members || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = await api.team.create(form.name);
      setTeam({ id: data.id, name: data.name, invite_code: data.invite_code });
      setMembers(data.members || []);
      setShowCreate(false);
      setForm({ ...form, name: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      const data = await api.team.join(form.invite_code);
      setTeam({ id: data.id, name: data.name, invite_code: data.invite_code });
      setMembers(data.members || []);
      setShowJoin(false);
      setForm({ ...form, invite_code: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="container">Loading...</div>;

  if (!team) {
    return (
      <div>
        <h1 style={{ marginBottom: '1.5rem' }}>Join a Team</h1>
        
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Create a Team</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Create your own team and invite friends with a code.
          </p>
          {!showCreate ? (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowCreate(true)}>
              Create Team
            </button>
          ) : (
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <input
                  type="text"
                  className="input"
                  placeholder="Team name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Join Existing Team</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Got an invite code from a friend?
          </p>
          {!showJoin ? (
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowJoin(true)}>
              Join with Code
            </button>
          ) : (
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <input
                  type="text"
                  className="input"
                  placeholder="Enter invite code"
                  value={form.invite_code}
                  onChange={(e) => setForm({ ...form, invite_code: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowJoin(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Join
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{team.name}</h2>
        <p style={{ opacity: 0.9 }}>Invite friends: <strong>{team.invite_code}</strong></p>
      </div>

      <h2 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Team Members
      </h2>

      {members.length === 0 ? (
        <div className="empty">No members yet</div>
      ) : (
        members.map((member) => (
          <div key={member.user_id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="avatar">{member.username?.[0]?.toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600' }}>{member.username}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {member.role === 'admin' ? '👑 Admin' : 'Member'} • Joined {new Date(member.joined_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
