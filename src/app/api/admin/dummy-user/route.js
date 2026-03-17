import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import db from '@/lib/db';
import { auth } from '@/lib/auth-config';

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUser = await db.prepare('SELECT is_admin FROM users WHERE id = ?').get(session.user.id);
  if (!adminUser?.is_admin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  try {
    const { username, email } = await request.json();
    
    if (!username || !email) {
      return NextResponse.json({ error: 'Username and email required' }, { status: 400 });
    }

    const existing = await db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 });
    }

    const id = uuid();
    
    await db.prepare('INSERT INTO users (id, username, email) VALUES (?, ?, ?)').run(id, username, email);
    
    const user = { id, username, email };
    
    return NextResponse.json({ user });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
