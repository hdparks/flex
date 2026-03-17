import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import db from '@/lib/db';
import { publicKey } from '@/lib/push';
import { authMiddleware } from '@/lib/auth';

export async function GET(request) {
  return NextResponse.json({ publicKey });
}

export async function POST(request) {
  const authCheck = await authMiddleware(request);
  if (authCheck.error) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { subscription, endpoint } = await request.json();
    
    if (subscription && subscription.endpoint && subscription.keys) {
      const id = uuid();
      const keys = JSON.stringify(subscription.keys);
      
      await db.prepare(`
        INSERT INTO push_subscriptions (id, user_id, endpoint, keys)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(endpoint) DO UPDATE SET keys = excluded.keys, user_id = excluded.user_id, id = excluded.id
      `).run(id, authCheck.user.id, subscription.endpoint, keys);

      return NextResponse.json({ success: true });
    }
    
    if (endpoint) {
      await db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
        .run(authCheck.user.id, endpoint);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
