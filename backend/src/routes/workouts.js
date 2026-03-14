import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  try {
    const teamMembers = db.prepare(`
      SELECT user_id FROM team_members 
      WHERE team_id = (SELECT team_id FROM team_members WHERE user_id = ?)
    `).all(req.user.id).map(m => m.user_id);
    
    if (teamMembers.length === 0) {
      return res.json([]);
    }

    const placeholders = teamMembers.map(() => '?').join(',');
    const workouts = db.prepare(`
      SELECT w.*, u.username, u.avatar_url,
        (SELECT COUNT(*) FROM cheers WHERE workout_id = w.id) as cheer_count
      FROM workouts w
      JOIN users u ON w.user_id = u.id
      WHERE w.user_id IN (${placeholders})
      ORDER BY w.completed_at DESC, w.created_at DESC
    `).all(...teamMembers);

    res.json(workouts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/my', authMiddleware, (req, res) => {
  try {
    const workouts = db.prepare(`
      SELECT w.*, 
        (SELECT COUNT(*) FROM cheers WHERE workout_id = w.id) as cheer_count
      FROM workouts w
      WHERE w.user_id = ?
      ORDER BY w.completed_at DESC, w.created_at DESC
    `).all(req.user.id);

    res.json(workouts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const workout = db.prepare(`
      SELECT w.*, u.username, u.avatar_url,
        (SELECT COUNT(*) FROM cheers WHERE workout_id = w.id) as cheer_count
      FROM workouts w
      JOIN users u ON w.user_id = u.id
      WHERE w.id = ?
    `).get(req.params.id);

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const cheers = db.prepare(`
      SELECT c.*, u.username, u.avatar_url
      FROM cheers c
      JOIN users u ON c.from_user_id = u.id
      WHERE c.workout_id = ?
      ORDER BY c.created_at DESC
    `).all(req.params.id);

    res.json({ ...workout, cheers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { type, title, description, duration_minutes, completed_at } = req.body;
    
    if (!type || !title) {
      return res.status(400).json({ error: 'Type and title required' });
    }

    const id = uuid();
    const completedAt = completed_at || new Date().toISOString();
    
    db.prepare(`
      INSERT INTO workouts (id, user_id, type, title, description, duration_minutes, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, type, title, description || null, duration_minutes || null, completedAt);

    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(id);
    res.status(201).json(workout);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
    
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    if (workout.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare('DELETE FROM cheers WHERE workout_id = ?').run(req.params.id);
    db.prepare('DELETE FROM workouts WHERE id = ?').run(req.params.id);
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
