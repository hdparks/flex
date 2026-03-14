import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  try {
    const goals = db.prepare(`
      SELECT * FROM goals 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    res.json(goals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { title, target_value, current_value, unit, deadline } = req.body;
    
    if (!title || !target_value || !unit) {
      return res.status(400).json({ error: 'Title, target value, and unit required' });
    }

    const id = uuid();
    
    db.prepare(`
      INSERT INTO goals (id, user_id, title, target_value, current_value, unit, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, title, target_value, current_value || 0, unit, deadline || null);

    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    res.status(201).json(goal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', authMiddleware, (req, res) => {
  try {
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (goal.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { current_value, title, target_value, unit, deadline } = req.body;
    
    db.prepare(`
      UPDATE goals SET 
        current_value = COALESCE(?, current_value),
        title = COALESCE(?, title),
        target_value = COALESCE(?, target_value),
        unit = COALESCE(?, unit),
        deadline = COALESCE(?, deadline)
      WHERE id = ?
    `).run(current_value, title, target_value, unit, deadline, req.params.id);

    const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (goal.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
