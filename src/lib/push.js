import webpush from 'web-push';
import { v4 as uuid } from 'uuid';
import db from '@/lib/db';

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    'mailto:admin@flex.app',
    publicKey,
    privateKey
  );
}

export async function sendNotification(userId, title, body, url) {
  if (!publicKey || !privateKey) {
    console.debug('VAPID keys not configured, skipping notification');
    return;
  }

  const subscriptions = await db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);
  
  const notification = JSON.stringify({
    title,
    body,
    url: url || '/',
    icon: '/icon-192.png'
  });

  for (const sub of subscriptions) {
    let pushSubscription;
    try {
      pushSubscription = {
        endpoint: sub.endpoint,
        keys: JSON.parse(sub.keys)
      };
    } catch (err) {
      console.error('Invalid push subscription keys:', err.message);
      continue;
    }

    try {
      await webpush.sendNotification(pushSubscription, notification);
    } catch (err) {
      console.error('Push notification error:', err.message, { statusCode: err.statusCode, endpoint: sub.endpoint.slice(0, 50) + '...' });
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
      }
    }
  }
}

export async function notifyTeam(teamId, authorId, authorName, workoutTitle) {
  const members = await db.prepare(`
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

export { publicKey, privateKey };
