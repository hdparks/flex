import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { auth } from '@/lib/auth-config';
import { uploadImage } from '@/lib/upload';

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
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }

    const existing = await db.prepare(
      'SELECT id FROM users WHERE username = ? AND id != ?'
    ).get(trimmedUsername, session.user.id);

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }
  }

  const updates = [];
  const args = [];

  if (username !== undefined) {
    updates.push('username = ?');
    args.push(username.trim());
  }

  if (avatar_url !== undefined) {
    let storedUrl = avatar_url;
    
    if (avatar_url && avatar_url.startsWith('data:')) {
      try {
        storedUrl = await uploadImage(avatar_url);
      } catch (err) {
        return NextResponse.json({ error: err.message || 'Failed to upload image' }, { status: 400 });
      }
    }
    
    updates.push('avatar_url = ?');
    args.push(storedUrl || null);
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
