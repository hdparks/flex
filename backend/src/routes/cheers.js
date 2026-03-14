import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

router.post('/', authMiddleware, (req, res) => {
  try {
    const { workout_id, message } = req.body;
    
    if (!workout_id) {
      return res.status(400).json({ error: 'Workout ID required' });
    }

    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(workout_id);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const id = uuid();
    
    db.prepare(`
      INSERT INTO cheers (id, from_user_id, workout_id, message)
      VALUES (?, ?, ?, ?)
    `).run(id, req.user.id, workout_id, message || null);

    const cheer = db.prepare(`
      SELECT c.*, u.username, u.avatar_url
      FROM cheers c
      JOIN users u ON c.from_user_id = u.id
      WHERE c.id = ?
    `).get(id);

    res.status(201).json(cheer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/workout/:workout_id', authMiddleware, (req, res) => {
  try {
    const cheers = db.prepare(`
      SELECT c.*, u.username, u.avatar_url
      FROM cheers c
      JOIN users u ON c.from_user_id = u.id
      WHERE c.workout_id = ?
      ORDER BY c.created_at DESC
    `).all(req.params.workout_id);

    res.json(cheers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
