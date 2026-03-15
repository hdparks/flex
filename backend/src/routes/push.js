import { Router } from 'express';
import webpush from 'web-push';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  'mailto:admin@flex.app',
  publicKey,
  privateKey
);

db.exec(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    keys TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
`);

router.get('/public-key', (req, res) => {
  res.json({ publicKey });
});

router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    const id = uuid();
    const keys = JSON.stringify(subscription.keys);
    
    db.prepare(`
      INSERT INTO push_subscriptions (id, user_id, endpoint, keys)
      VALUES (?, ?, ?, ?)
    `).run(id, req.user.id, subscription.endpoint, keys);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }

    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
      .run(req.user.id, endpoint);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export async function sendNotification(userId, title, body, url) {
  const subscriptions = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);
  
  const notification = JSON.stringify({
    title,
    body,
    url: url || '/',
    icon: '/icon-192.png'
  });

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: JSON.parse(sub.keys)
    };

    try {
      await webpush.sendNotification(pushSubscription, notification);
    } catch (err) {
      console.error('Push notification error:', err.message);
      if (err.statusCode === 410 || err.statusCode === 404) {
        db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
      }
    }
  }
}

export async function notifyTeam(teamId, authorId, authorName, workoutTitle) {
  const members = db.prepare(`
    SELECT user_id FROM team_members WHERE team_id = ? AND user_id != ?
  `).all(teamId, authorId);

  for (const member of members) {
    await sendNotification(
      member.user_id,
      'New Workout!',
      `${authorName} completed: ${workoutTitle}`,
      '/dashboard'
    );
  }
}

export default router;