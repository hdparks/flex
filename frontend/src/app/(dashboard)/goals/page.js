'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target_value: '', unit: '', current_value: '0' });

  useEffect(() => {
    api.goals.list()
      .then(setGoals)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const created = await api.goals.create({
        ...newGoal,
        target_value: parseFloat(newGoal.target_value),
        current_value: parseFloat(newGoal.current_value) || 0,
      });
      setGoals([...goals, created]);
      setShowForm(false);
      setNewGoal({ title: '', target_value: '', unit: '', current_value: '0' });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdate = async (id, currentValue) => {
    try {
      const updated = await api.goals.update(id, { current_value: currentValue });
      setGoals(goals.map(g => g.id === id ? updated : g));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await api.goals.delete(id);
      setGoals(goals.filter(g => g.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Your Goals
        </h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '−' : '+'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label className="label">Goal Title</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Run 50 miles this month"
              value={newGoal.title}
              onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label">Target</label>
              <input
                type="number"
                className="input"
                placeholder="50"
                value={newGoal.target_value}
                onChange={(e) => setNewGoal({ ...newGoal, target_value: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label">Unit</label>
              <input
                type="text"
                className="input"
                placeholder="miles"
                value={newGoal.unit}
                onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Goal</button>
        </form>
      )}

      {goals.length === 0 ? (
        <div className="empty">No goals yet. Set one to start tracking!</div>
      ) : (
        goals.map((goal) => {
          const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
          return (
            <div key={goal.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3>{goal.title}</h3>
                <button className="btn-ghost" onClick={() => handleDelete(goal.id)}>🗑️</button>
              </div>
              <div className="progress-bar" style={{ marginBottom: '0.5rem' }}>
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {goal.current_value} / {goal.target_value} {goal.unit}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="btn-ghost"
                    onClick={() => handleUpdate(goal.id, Math.max(0, goal.current_value - 1))}
                  >−</button>
                  <button
                    className="btn-primary"
                    style={{ padding: '0.25rem 0.75rem' }}
                    onClick={() => handleUpdate(goal.id, goal.current_value + 1)}
                  >+</button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
