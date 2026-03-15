import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '@/lib/db';
import { generateToken } from '@/lib/auth';

async function adminMiddleware(request) {
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

  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(decoded.id);
  if (!user || !user.is_admin) {
    return { error: 'Admin access required', status: 403 };
  }
  
  return { user: decoded };
}

export async function POST(request) {
  const adminCheck = await adminMiddleware(request);
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

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
    
    return NextResponse.json({ user });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
