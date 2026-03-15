import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  try {
    const memberships = db.prepare(`
      SELECT team_id FROM team_members WHERE user_id = ?
    `).all(req.user.id);
    
    if (memberships.length === 0) {
      return res.json([]);
    }

    const teamIds = memberships.map(m => m.team_id);
    const teamMembers = db.prepare(`
      SELECT DISTINCT user_id FROM team_members WHERE team_id IN (${teamIds.map(() => '?').join(',')})
    `).all(...teamIds).map(m => m.user_id);
    
    if (teamMembers.length === 0) {
      return res.json([]);
    }

    const placeholders = teamMembers.map(() => '?').join(',');
    const wins = db.prepare(`
      SELECT w.*, u.username, u.avatar_url
      FROM wins w
      JOIN users u ON w.user_id = u.id
      WHERE w.user_id IN (${placeholders})
      ORDER BY w.achieved_at DESC, w.created_at DESC
      LIMIT 50
    `).all(...teamMembers);

    res.json(wins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/my', authMiddleware, (req, res) => {
  try {
    const wins = db.prepare(`
      SELECT * FROM wins 
      WHERE user_id = ?
      ORDER BY achieved_at DESC, created_at DESC
    `).all(req.user.id);

    res.json(wins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { title, description, achieved_at } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }

    const id = uuid();
    const achievedAt = achieved_at || new Date().toISOString();
    
    db.prepare(`
      INSERT INTO wins (id, user_id, title, description, achieved_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.user.id, title, description || null, achievedAt);

    const win = db.prepare(`
      SELECT w.*, u.username, u.avatar_url
      FROM wins w
      JOIN users u ON w.user_id = u.id
      WHERE w.id = ?
    `).get(id);

    res.status(201).json(win);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const win = db.prepare('SELECT * FROM wins WHERE id = ?').get(req.params.id);
    
    if (!win) {
      return res.status(404).json({ error: 'Win not found' });
    }

    if (win.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare('DELETE FROM wins WHERE id = ?').run(req.params.id);
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
