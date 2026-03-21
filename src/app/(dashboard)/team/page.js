'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';
import { toLocalDatetimeInput, fromLocalDatetimeInput } from '../../../lib/dateUtils';

export default function Team() {
  const { toast } = useToast();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showAddRace, setShowAddRace] = useState(null);
  const [form, setForm] = useState({ name: '', invite_code: '' });
  const [raceForm, setRaceForm] = useState({ name: '', race_date: '', location: '' });
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    api.team.get()
      .then((data) => {
        setTeams(data.teams || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateTeamRaces = (teamId, newRaces) => {
    setTeams(teams.map(t => t.id === teamId ? { ...t, races: newRaces } : t));
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openMenu && !e.target.closest('[data-dropdown]')) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenu]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = await api.team.create(form.name);
      setTeams([...teams, { id: data.id, name: data.name, invite_code: data.invite_code, members: data.members }]);
      setShowCreate(false);
      setForm({ ...form, name: '' });
    } catch (err) {
      toast(err.message, 'error');
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
      toast(err.message, 'error');
    }
  };

  const handleLeave = async (teamId, teamName) => {
    if (!confirm(`Are you sure you want to leave "${teamName}"?`)) return;
    try {
      await api.team.leave(teamId);
      setTeams(teams.filter(t => t.id !== teamId));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDisband = async (teamId, teamName) => {
    if (!confirm(`Are you sure you want to permanently delete "${teamName}"? This cannot be undone.`)) return;
    try {
      await api.team.disband(teamId);
      setTeams(teams.filter(t => t.id !== teamId));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleAddRace = async (teamId, e) => {
    e.preventDefault();
    try {
      const raceData = {
        name: raceForm.name,
        race_date: fromLocalDatetimeInput(raceForm.race_date),
        location: raceForm.location || null,
        team_id: teamId,
      };
      const newRace = await api.races.create(raceData);
      const team = teams.find(t => t.id === teamId);
      updateTeamRaces(teamId, [...(team.races || []), newRace]);
      setShowAddRace(null);
      setRaceForm({ name: '', race_date: '', location: '' });
      toast('Race added!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDeleteRace = async (raceId, teamId) => {
    if (!confirm('Delete this race?')) return;
    try {
      await api.races.delete(raceId);
      const team = teams.find(t => t.id === teamId);
      updateTeamRaces(teamId, (team.races || []).filter(r => r.id !== raceId));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const isOnlyMember = (team) => {
    return team.members && team.members.length === 1 && team.members[0].id === team.created_by;
  };

  const copyInviteLink = async (inviteCode) => {
    const url = `${window.location.origin}/join?code=${encodeURIComponent(inviteCode)}`;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        toast('Invite link copied to clipboard!', 'success');
      } catch (err) {
        toast(`Copy this link: ${url}`, 'info');
      }
    } else {
      toast(`Copy this link: ${url}`, 'info');
    }
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
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginTop: '0.25rem', color: 'rgba(255,255,255,0.8)' }}
                    onClick={() => copyInviteLink(team.invite_code)}
                  >
                    Copy Link
                  </button>
                </div>
                <div style={{ position: 'relative' }} data-dropdown>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '0.25rem 0.5rem', color: 'rgba(255,255,255,0.8)', borderRadius: '50%' }}
                    onClick={() => setOpenMenu(openMenu === team.id ? null : team.id)}
                    title="Team actions"
                  >
                    ⋮
                  </button>
                  {openMenu === team.id && (
                    <div className="card" style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.25rem', minWidth: '140px', padding: '0', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 10 }}>
                      <button
                        className="btn btn-ghost"
                        style={{ width: '100%', textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', justifyContent: 'flex-start', borderRadius: 0 }}
                        onClick={() => { isOnlyMember(team) ? handleDisband(team.id, team.name) : handleLeave(team.id, team.name); setOpenMenu(null); }}
                      >
                        {isOnlyMember(team) ? '💣 Disband' : '🚪 Leave'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Members
            </h3>

            {(!team.members || team.members.length === 0) ? (
              <div className="empty">No members yet</div>
            ) : (
              team.members.map((member) => (
                <div key={member.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  {member.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatar_url}
                      alt={member.username}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="avatar">{member.username?.[0]?.toUpperCase()}</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600' }}>{member.username}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {member.role === 'admin' ? '👑 Admin' : 'Member'} • Joined {new Date(member.joined_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}

            <h3 style={{ marginBottom: '0.5rem', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Upcoming Races
            </h3>

            {(team.races || []).length > 0 ? (
              team.races.map((race) => (
                <div key={race.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: '600' }}>{race.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(race.race_date).toLocaleDateString()}
                      {race.location && ` • ${race.location}`}
                    </div>
                  </div>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => handleDeleteRace(race.id, team.id)}
                    title="Delete race"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                No upcoming races
              </div>
            )}

            {showAddRace === team.id ? (
              <div className="card" style={{ marginTop: '0.5rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>Add Race</h4>
                <form onSubmit={(e) => handleAddRace(team.id, e)}>
                  <div className="form-group">
                    <input
                      type="text"
                      className="input"
                      placeholder="Race name (e.g., Boston Marathon)"
                      value={raceForm.name}
                      onChange={(e) => setRaceForm({ ...raceForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="datetime-local"
                      className="input"
                      value={raceForm.race_date}
                      onChange={(e) => setRaceForm({ ...raceForm, race_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      className="input"
                      placeholder="Location (optional)"
                      value={raceForm.location}
                      onChange={(e) => setRaceForm({ ...raceForm, location: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowAddRace(null); setRaceForm({ name: '', race_date: '', location: '' }); }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                      Add
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                onClick={() => setShowAddRace(team.id)}
              >
                + Add Race
              </button>
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
