import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import db from '@/lib/db';
import { notifyTeam } from '@/lib/push';
import { auth } from '@/lib/auth-config';

export async function GET(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = session.user.id;
    
    if (searchParams.get('my') === 'true') {
      const workouts = await db.prepare(`
        SELECT w.*, 
          (SELECT COUNT(*) FROM cheers WHERE workout_id = w.id) as cheer_count
        FROM workouts w
        WHERE w.user_id = ?
        ORDER BY COALESCE(w.completed_at, w.created_at) DESC
      `).all(userId);

      return NextResponse.json(workouts);
    }

    const memberships = await db.prepare(`
      SELECT team_id FROM team_members WHERE user_id = ?
    `).all(userId);
    
    if (memberships.length === 0) {
      return NextResponse.json([]);
    }

    const teamIds = memberships.map(m => m.team_id);
    const teamMembers = await db.prepare(`
      SELECT DISTINCT user_id FROM team_members WHERE team_id IN (${teamIds.map(() => '?').join(',')})
    `).all(...teamIds).map(m => m.user_id);
    
    if (teamMembers.length === 0) {
      return NextResponse.json([]);
    }

    const placeholders = teamMembers.map(() => '?').join(',');
    const workouts = await db.prepare(`
      SELECT w.*, u.username, u.avatar_url,
        (SELECT COUNT(*) FROM cheers WHERE workout_id = w.id) as cheer_count
      FROM workouts w
      JOIN users u ON w.user_id = u.id
      WHERE w.user_id IN (${placeholders})
      ORDER BY w.completed_at DESC, w.created_at DESC
    `).all(...teamMembers);

    return NextResponse.json(workouts);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type, title, description, duration_minutes, completed_at } = await request.json();
    
    if (!type || !title) {
      return NextResponse.json({ error: 'Type and title required' }, { status: 400 });
    }

    const id = uuid();
    const completedAt = completed_at || new Date().toISOString();
    
    await db.prepare(`
      INSERT INTO workouts (id, user_id, type, title, description, duration_minutes, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, session.user.id, type, title, description || null, duration_minutes || null, completedAt);

    const workout = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(id);

    const teams = await db.prepare('SELECT team_id FROM team_members WHERE user_id = ?').all(session.user.id);
    for (const team of teams) {
      const userName = session.user.name || session.user.email || session.user.id || 'Unknown User';
      notifyTeam(team.team_id, session.user.id, userName, title).catch(console.error);
    }

    return NextResponse.json(workout, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
