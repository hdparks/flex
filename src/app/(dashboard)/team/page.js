'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function Team() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [form, setForm] = useState({ name: '', invite_code: '' });

  useEffect(() => {
    api.team.get()
      .then((data) => {
        setTeams(data.teams || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = await api.team.create(form.name);
      setTeams([...teams, { id: data.id, name: data.name, invite_code: data.invite_code, members: data.members }]);
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
      const existingIndex = teams.findIndex(t => t.id === data.id);
      if (existingIndex >= 0) {
        setTeams([...teams.slice(0, existingIndex), { id: data.id, name: data.name, invite_code: data.invite_code, members: data.members }, ...teams.slice(existingIndex + 1)]);
      } else {
        setTeams([...teams, { id: data.id, name: data.name, invite_code: data.invite_code, members: data.members }]);
      }
      setShowJoin(false);
      setForm({ ...form, invite_code: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLeave = async (teamId, teamName) => {
    if (!confirm(`Are you sure you want to leave "${teamName}"?`)) return;
    try {
      await api.team.leave(teamId);
      setTeams(teams.filter(t => t.id !== teamId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDisband = async (teamId, teamName) => {
    if (!confirm(`Are you sure you want to permanently delete "${teamName}"? This cannot be undone.`)) return;
    try {
      await api.team.disband(teamId);
      setTeams(teams.filter(t => t.id !== teamId));
    } catch (err) {
      alert(err.message);
    }
  };

  const isOnlyMember = (team) => {
    return team.members && team.members.length === 1 && team.members[0].id === team.user_id;
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>My Teams</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>Join Team</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Team</button>
        </div>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Create a Team</h3>
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
        </div>
      )}

      {showJoin && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Join a Team</h3>
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
        </div>
      )}

      {teams.length === 0 ? (
        <div className="empty">
          <p>You&apos;re not in any teams yet.</p>
          <p>Create a team or join one with an invite code.</p>
        </div>
      ) : (
        teams.map((team, index) => (
          <div key={team.id}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="card" style={{ marginBottom: '0.75rem', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{team.name}</h2>
                  <p style={{ opacity: 0.9 }}>Invite friends: <strong>{team.invite_code}</strong></p>
                </div>
                <button
                  className="btn-ghost"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}
                  onClick={() => isOnlyMember(team) ? handleDisband(team.id, team.name) : handleLeave(team.id, team.name)}
                  title={isOnlyMember(team) ? 'Disband team' : 'Leave team'}
                >
                  {isOnlyMember(team) ? '💣 Disband' : '🚪 Leave'}
                </button>
              </div>

            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Members
            </h3>

            {(!team.members || team.members.length === 0) ? (
              <div className="empty">No members yet</div>
            ) : (
              team.members.map((member) => (
                <div key={member.user_id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
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
          {index < teams.length - 1 && (
            <div style={{ borderBottom: '2px dashed var(--border)', margin: '1.5rem 0' }} />
          )}
        </div>
        ))
      )}
    </div>
  );
}
