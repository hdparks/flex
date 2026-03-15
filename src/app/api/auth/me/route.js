import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authMiddleware } from '@/lib/auth';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  
  const { JWT_SECRET } = await import('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'spartan-race-secret-change-in-production';
  
  let decoded;
  try {
    const jwt = await import('jsonwebtoken');
    decoded = jwt.verify(token, secret);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const user = db.prepare('SELECT id, username, email, avatar_url, created_at FROM users WHERE id = ?').get(decoded.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  const teams = db.prepare(`
    SELECT tm.*, t.name as team_name, t.invite_code
    FROM team_members tm 
    JOIN teams t ON tm.team_id = t.id 
    WHERE tm.user_id = ?
  `).all(decoded.id);
  
  return NextResponse.json({ user, teams });
}
