import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { auth } from '@/lib/auth-config';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const session = await auth();

    const user = await db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        u.avatar_url, 
        u.created_at,
        COUNT(w.id) as workout_count,
        COALESCE(SUM(w.duration_minutes), 0) as total_minutes
      FROM users u
      LEFT JOIN workouts w ON w.user_id = u.id
      WHERE u.id = ?
      GROUP BY u.id
    `).get(id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let workouts = [];
    const userIsViewer = session?.user?.id === id;

    if (!userIsViewer && session?.user?.id) {
      const viewerTeams = await db.prepare(`
        SELECT team_id FROM team_members WHERE user_id = ?
      `).all(session.user.id);

      if (viewerTeams.length > 0) {
        const teamIds = viewerTeams.map(t => t.team_id);
        const userTeams = await db.prepare(`
          SELECT team_id FROM team_members WHERE user_id = ? AND team_id IN (${teamIds.map(() => '?').join(',')})
        `).all(id, ...teamIds);

        if (userTeams.length > 0) {
          workouts = await db.prepare(`
            SELECT w.*, 
              (SELECT COUNT(*) FROM cheers WHERE workout_id = w.id) as cheer_count
            FROM workouts w
            WHERE w.user_id = ?
            ORDER BY w.completed_at DESC, w.created_at DESC
            LIMIT 20
          `).all(id);
        }
      }
    } else if (userIsViewer) {
      workouts = await db.prepare(`
        SELECT w.*, 
          (SELECT COUNT(*) FROM cheers WHERE workout_id = w.id) as cheer_count
        FROM workouts w
        WHERE w.user_id = ?
        ORDER BY w.completed_at DESC, w.created_at DESC
        LIMIT 20
      `).all(id);
    }

    return NextResponse.json({ ...user, workouts });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
