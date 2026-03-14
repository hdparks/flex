'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function Wins() {
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newWin, setNewWin] = useState({ title: '', description: '', achieved_at: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    api.wins.my()
      .then(setWins)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const created = await api.wins.create(newWin);
      setWins([created, ...wins]);
      setShowForm(false);
      setNewWin({ title: '', description: '', achieved_at: new Date().toISOString().split('T')[0] });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this win?')) return;
    try {
      await api.wins.delete(id);
      setWins(wins.filter(w => w.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Your Wins
        </h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '−' : '+'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label className="label">What did you achieve?</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Completed my first pull-up!"
              value={newWin.title}
              onChange={(e) => setNewWin({ ...newWin, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="label">Description (optional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Tell us more..."
              value={newWin.description}
              onChange={(e) => setNewWin({ ...newWin, description: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={newWin.achieved_at}
              onChange={(e) => setNewWin({ ...newWin, achieved_at: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Celebrate! 🎉</button>
        </form>
      )}

      {wins.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
          <p>No wins yet. Celebrate your achievements!</p>
        </div>
      ) : (
        wins.map((win) => (
          <div key={win.id} className="card" style={{ borderLeft: '3px solid var(--success)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ color: 'var(--success)' }}>🏆 {win.title}</h3>
                {win.description && (
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    {win.description}
                  </p>
                )}
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(win.achieved_at).toLocaleDateString()}
                </div>
              </div>
              <button className="btn-ghost" onClick={() => handleDelete(win.id)}>🗑️</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
