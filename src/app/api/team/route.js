import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import db from '@/lib/db';
import { auth } from '@/lib/auth-config';

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function GET(request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const inviteCode = searchParams.get('invite_code');
  
  if (inviteCode) {
    try {
      const team = await db.prepare('SELECT id, name, invite_code FROM teams WHERE invite_code = ?').get(inviteCode.toUpperCase());
      if (!team) {
        return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
      }
      return NextResponse.json(team);
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (searchParams.get('feed') === 'true') {
      const memberships = await db.prepare(`
        SELECT team_id FROM team_members WHERE user_id = ?
      `).all(session.user.id);

      if (memberships.length === 0) {
        return NextResponse.json([]);
      }

      const teamIds = memberships.map(m => m.team_id);
      const rows = await db.prepare(`
        SELECT DISTINCT user_id FROM team_members WHERE team_id IN (${teamIds.map(() => '?').join(',')})
      `).all(...teamIds);
      const teamMembers = rows.map(m => m.user_id);
      
      if (teamMembers.length === 0) {
        return NextResponse.json([]);
      }

      const placeholders = teamMembers.map(() => '?').join(',');
      
      const workouts = await db.prepare(`
        SELECT w.user_id AS userId, w.id, w.type, w.title, w.description, w.duration_minutes, w.completed_at, w.image, w.created_at, 
          u.username, u.avatar_url, 'workout' as type,
          (SELECT COUNT(*) FROM cheers c WHERE c.workout_id = w.id) as cheer_count
        FROM workouts w
        JOIN users u ON w.user_id = u.id
        WHERE w.user_id IN (${placeholders})
        ORDER BY COALESCE(w.completed_at, w.created_at) DESC
        LIMIT 30
      `).all(...teamMembers);

      const workoutIds = workouts.map(w => w.id);
      let cheersMap = {};
      if (workoutIds.length > 0) {
        const cheersPlaceholders = workoutIds.map(() => '?').join(',');
        const cheers = await db.prepare(`
          SELECT c.*, u.username, u.avatar_url
          FROM cheers c
          JOIN users u ON c.from_user_id = u.id
          WHERE c.workout_id IN (${cheersPlaceholders})
          ORDER BY c.created_at DESC
        `).all(...workoutIds);
        
        cheersMap = cheers.reduce((acc, c) => {
          if (!acc[c.workout_id]) acc[c.workout_id] = [];
          acc[c.workout_id].push(c);
          return acc;
        }, {});
      }

      const workoutsWithCheers = workouts.map(w => ({
        ...w,
        cheers: cheersMap[w.id] || [],
      }));

      return NextResponse.json(workoutsWithCheers);
    }

    const memberships = await db.prepare(`
      SELECT tm.*, t.name, t.invite_code, t.created_at as team_created_at
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = ?
    `).all(session.user.id);

    if (memberships.length === 0) {
      return NextResponse.json({ teams: [] });
    }

    const teamsWithMembers = await Promise.all(memberships.map(async (membership) => {
      const members = await db.prepare(`
        SELECT u.id, u.username, u.avatar_url, u.created_at, tm.role, tm.joined_at
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ?
        ORDER BY tm.joined_at ASC
      `).all(membership.team_id);

      return { ...membership, id: membership.team_id, members };
    }));

    return NextResponse.json({ teams: teamsWithMembers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, invite_code } = await request.json();
    
    if (name) {
      const teamId = uuid();
      const inviteCode = generateInviteCode();
      
      await db.transaction(async () => {
        await db.prepare(`
          INSERT INTO teams (id, name, invite_code, created_by)
          VALUES (?, ?, ?, ?)
        `).run(teamId, name, inviteCode, session.user.id);

        await db.prepare(`
          INSERT INTO team_members (team_id, user_id, role)
          VALUES (?, ?, 'admin')
        `).run(teamId, session.user.id);
      });

      const team = await db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
      return NextResponse.json({ ...team, members: [{ user_id: session.user.id, role: 'admin' }] }, { status: 201 });
    }
    
    if (invite_code) {
      const team = await db.prepare('SELECT * FROM teams WHERE invite_code = ?').get(invite_code.toUpperCase());
      if (!team) {
        return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
      }

      const existing = await db.prepare('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?').get(team.id, session.user.id);
      if (existing) {
        return NextResponse.json({ error: 'You are already a member of this team' }, { status: 400 });
      }

      await db.prepare(`
        INSERT INTO team_members (team_id, user_id, role)
        VALUES (?, ?, 'member')
      `).run(team.id, session.user.id);

      const members = await db.prepare(`
        SELECT u.id, u.username, u.avatar_url, tm.role, tm.joined_at
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ?
      `).all(team.id);

      return NextResponse.json({ ...team, members });
    }

    return NextResponse.json({ error: 'Name or invite code required' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const teamId = searchParams.get('teamId');

    if (action === 'leave') {
      const membership = await db.prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, session.user.id);
      if (!membership) {
        return NextResponse.json({ error: 'You are not a member of this team' }, { status: 404 });
      }

      const memberCount = await db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?').get(teamId);
      if (memberCount.count === 1) {
        return NextResponse.json({ error: 'Cannot leave team as the only member. Disband the team instead.' }, { status: 400 });
      }

      if (membership.role === 'admin') {
        const adminCount = await db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ? AND role = ?').get(teamId, 'admin');
        if (adminCount.count === 1) {
          return NextResponse.json({ error: 'Cannot leave as the only admin. Assign another admin first or disband the team.' }, { status: 400 });
        }
      }

      await db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(teamId, session.user.id);
      return NextResponse.json({ success: true });
    }

    const team = await db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.created_by !== session.user.id) {
      return NextResponse.json({ error: 'Only the team creator can disband this team' }, { status: 403 });
    }

    const memberCount = await db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?').get(teamId);
    if (memberCount.count > 1) {
      return NextResponse.json({ error: 'Cannot disband team with more than one member. Remove members first.' }, { status: 400 });
    }

    await db.prepare('DELETE FROM team_members WHERE team_id = ?').run(teamId);
    await db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
