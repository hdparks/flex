import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { generateToken, authMiddleware } from '../auth.js';

const router = Router();

function adminMiddleware(req, res, next) {
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.post('/dummy-user', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const id = uuid();
    
    db.prepare('INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)').run(id, username, email, password_hash);
    
    const user = { id, username, email };
    
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/impersonate/:userId', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { userId } = req.params;
    
    const targetUser = db.prepare('SELECT id, username, email, avatar_url FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = generateToken(targetUser);
    
    res.json({
      user: targetUser,
      token,
      impersonated: true,
      originalAdminId: req.user.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
