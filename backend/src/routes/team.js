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
    const memberships = db.prepare(`
      SELECT tm.*, t.name, t.invite_code, t.created_at as team_created_at
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = ?
    `).all(req.user.id);

    if (memberships.length === 0) {
      return res.json({ teams: [] });
    }

    const teamsWithMembers = memberships.map(membership => {
      const members = db.prepare(`
        SELECT u.id, u.username, u.avatar_url, u.created_at, tm.role, tm.joined_at
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ?
        ORDER BY tm.joined_at ASC
      `).all(membership.team_id);

      return { ...membership, id: membership.team_id, members };
    });

    res.json({ teams: teamsWithMembers });
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

    const team = db.prepare('SELECT * FROM teams WHERE invite_code = ?').get(invite_code.toUpperCase());
    if (!team) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const existing = db.prepare('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?').get(team.id, req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'You are already a member of this team' });
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

router.delete('/:teamId/leave', authMiddleware, (req, res) => {
  try {
    const { teamId } = req.params;

    const membership = db.prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, req.user.id);
    if (!membership) {
      return res.status(404).json({ error: 'You are not a member of this team' });
    }

    const memberCount = db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?').get(teamId);
    if (memberCount.count === 1) {
      return res.status(400).json({ error: 'Cannot leave team as the only member. Disband the team instead.' });
    }

    if (membership.role === 'admin') {
      const adminCount = db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ? AND role = ?').get(teamId, 'admin');
      if (adminCount.count === 1) {
        return res.status(400).json({ error: 'Cannot leave as the only admin. Assign another admin first or disband the team.' });
      }
    }

    db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(teamId, req.user.id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:teamId', authMiddleware, (req, res) => {
  try {
    const { teamId } = req.params;

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (team.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the team creator can disband this team' });
    }

    const memberCount = db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?').get(teamId);
    if (memberCount.count > 1) {
      return res.status(400).json({ error: 'Cannot disband team with more than one member. Remove members first.' });
    }

    db.prepare('DELETE FROM team_members WHERE team_id = ?').run(teamId);
    db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/feed', authMiddleware, (req, res) => {
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
