import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { auth } from '@/lib/auth-config';

export async function GET(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.prepare('SELECT id, username, email, avatar_url, created_at FROM users WHERE id = ?').get(session.user.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  const teams = await db.prepare(`
    SELECT tm.*, t.name as team_name, t.invite_code
    FROM team_members tm 
    JOIN teams t ON tm.team_id = t.id 
    WHERE tm.user_id = ?
  `).all(session.user.id);
  
  return NextResponse.json({ user, teams });
}
