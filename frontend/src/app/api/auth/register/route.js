import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '@/lib/db';
import { generateToken, authMiddleware } from '@/lib/auth';

export async function POST(request) {
  try {
    const { username, email, password } = await request.json();
    
    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Username, email, and password required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const id = uuid();
    
    db.prepare('INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)').run(id, username, email, password_hash);
    
    const user = { id, username, email };
    const token = generateToken(user);
    
    return NextResponse.json({ user, token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
