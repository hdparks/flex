import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

function generateInviteCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

router.get('/', authMiddleware, (req, res) => {
  try {
    const membership = db.prepare(`
      SELECT tm.*, t.name, t.invite_code, t.created_at as team_created_at
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = ?
    `).get(req.user.id);

    if (!membership) {
      return res.json({ team: null, members: [] });
    }

    const members = db.prepare(`
      SELECT u.id, u.username, u.avatar_url, u.created_at, tm.role, tm.joined_at
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
      ORDER BY tm.joined_at ASC
    `).all(membership.team_id);

    res.json({ team: { ...membership, id: membership.team_id }, members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/create', authMiddleware, (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Team name required' });
    }

    const existing = db.prepare('SELECT 1 FROM team_members WHERE user_id = ?').get(req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'You are already in a team' });
    }

    const teamId = uuid();
    const inviteCode = generateInviteCode();
    
    db.prepare(`
      INSERT INTO teams (id, name, invite_code, created_by)
      VALUES (?, ?, ?, ?)
    `).run(teamId, name, inviteCode, req.user.id);

    db.prepare(`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES (?, ?, 'admin')
    `).run(teamId, req.user.id);

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    res.status(201).json({ ...team, members: [{ user_id: req.user.id, role: 'admin' }] });
  } catch (err) {
    console.error('Team create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/join', authMiddleware, (req, res) => {
  try {
    const { invite_code } = req.body;
    
    if (!invite_code) {
      return res.status(400).json({ error: 'Invite code required' });
    }

    const existing = db.prepare('SELECT 1 FROM team_members WHERE user_id = ?').get(req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'You are already in a team' });
    }

    const team = db.prepare('SELECT * FROM teams WHERE invite_code = ?').get(invite_code.toUpperCase());
    if (!team) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    db.prepare(`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES (?, ?, 'member')
    `).run(team.id, req.user.id);

    const members = db.prepare(`
      SELECT u.id, u.username, u.avatar_url, tm.role, tm.joined_at
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
    `).all(team.id);

    res.json({ ...team, members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/feed', authMiddleware, (req, res) => {
  try {
    const membership = db.prepare(`
      SELECT team_id FROM team_members WHERE user_id = ?
    `).get(req.user.id);

    if (!membership) {
      return res.json([]);
    }

    const teamMembers = db.prepare(`
      SELECT user_id FROM team_members WHERE team_id = ?
    `).all(membership.team_id).map(m => m.user_id);

    const placeholders = teamMembers.map(() => '?').join(',');
    
    const workouts = db.prepare(`
      SELECT w.*, u.username, u.avatar_url, 'workout' as type
      FROM workouts w
      JOIN users u ON w.user_id = u.id
      WHERE w.user_id IN (${placeholders})
      ORDER BY COALESCE(w.completed_at, w.created_at) DESC
      LIMIT 20
    `).all(...teamMembers);

    const wins = db.prepare(`
      SELECT w.*, u.username, u.avatar_url, 'win' as type
      FROM wins w
      JOIN users u ON w.user_id = u.id
      WHERE w.user_id IN (${placeholders})
      ORDER BY w.achieved_at DESC
      LIMIT 10
    `).all(...teamMembers);

    const feed = [...workouts, ...wins].sort((a, b) => {
      const dateA = new Date(a.achieved_at || a.completed_at || a.created_at);
      const dateB = new Date(b.achieved_at || b.completed_at || b.created_at);
      return dateB - dateA;
    }).slice(0, 30);

    res.json(feed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
