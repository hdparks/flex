import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import db from '@/lib/db';
import { publicKey } from '@/lib/push';

async function authMiddleware(request) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'spartan-race-secret-change-in-production';
  
  let decoded;
  try {
    const jwt = await import('jsonwebtoken');
    decoded = jwt.verify(token, secret);
  } catch (err) {
    return { error: 'Invalid token', status: 401 };
  }

  return { user: decoded };
}

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
      
      db.prepare(`
        INSERT INTO push_subscriptions (id, user_id, endpoint, keys)
        VALUES (?, ?, ?, ?)
      `).run(id, authCheck.user.id, subscription.endpoint, keys);

      return NextResponse.json({ success: true });
    }
    
    if (endpoint) {
      db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
        .run(authCheck.user.id, endpoint);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
