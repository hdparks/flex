import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { auth } from '@/lib/auth-config';

export async function GET(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.prepare(`
    SELECT id, username, email, avatar_url, created_at 
    FROM users 
    WHERE id = ?
  `).get(session.user.id);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { username, avatar_url } = await request.json();

  if (username !== undefined) {
    const existing = await db.prepare(
      'SELECT id FROM users WHERE username = ? AND id != ?'
    ).get(username, session.user.id);

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }
  }

  const updates = [];
  const args = [];

  if (username !== undefined) {
    updates.push('username = ?');
    args.push(username);
  }

  if (avatar_url !== undefined) {
    updates.push('avatar_url = ?');
    args.push(avatar_url);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  args.push(session.user.id);

  await db.prepare(`
    UPDATE users SET ${updates.join(', ')} WHERE id = ?
  `).run(...args);

  const user = await db.prepare(`
    SELECT id, username, email, avatar_url, created_at 
    FROM users 
    WHERE id = ?
  `).get(session.user.id);

  return NextResponse.json(user);
}
