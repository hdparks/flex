import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authMiddleware } from '@/lib/auth';

export async function GET(request) {
  const authCheck = await authMiddleware(request);
  if (authCheck.error) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const user = await db.prepare('SELECT id, username, email, avatar_url, created_at FROM users WHERE id = ?').get(authCheck.user.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  const teams = await db.prepare(`
    SELECT tm.*, t.name as team_name, t.invite_code
    FROM team_members tm 
    JOIN teams t ON tm.team_id = t.id 
    WHERE tm.user_id = ?
  `).all(authCheck.user.id);
  
  return NextResponse.json({ user, teams });
}
