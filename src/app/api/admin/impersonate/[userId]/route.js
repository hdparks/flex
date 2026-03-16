import { NextResponse } from 'next/server';
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

  const user = await db.prepare('SELECT is_admin FROM users WHERE id = ?').get(decoded.id);
  if (!user || !user.is_admin) {
    return { error: 'Admin access required', status: 403 };
  }
  
  return { user: decoded };
}

export async function POST(request, { params }) {
  const adminCheck = await adminMiddleware(request);
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  try {
    const { userId } = params;
    
    const targetUser = await db.prepare('SELECT id, username, email, avatar_url FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const token = generateToken(targetUser);
    
    return NextResponse.json({
      user: targetUser,
      token,
      impersonated: true,
      originalAdminId: adminCheck.user.id
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
