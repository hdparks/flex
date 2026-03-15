import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import db from '@/lib/db';

async function authMiddleware(request) {
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

  return { user: decoded };
}

function generateInviteCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

export async function GET(request) {
  const authCheck = await authMiddleware(request);
  if (authCheck.error) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    
    if (searchParams.get('feed') === 'true') {
      const memberships = db.prepare(`
        SELECT team_id FROM team_members WHERE user_id = ?
      `).all(authCheck.user.id);

      if (memberships.length === 0) {
        return NextResponse.json([]);
      }

      const teamIds = memberships.map(m => m.team_id);
      const teamMembers = db.prepare(`
        SELECT DISTINCT user_id FROM team_members WHERE team_id IN (${teamIds.map(() => '?').join(',')})
      `).all(...teamIds).map(m => m.user_id);
      
      if (teamMembers.length === 0) {
        return NextResponse.json([]);
      }

      const placeholders = teamMembers.map(() => '?').join(',');
      
      const workouts = db.prepare(`
        SELECT w.*, u.username, u.avatar_url, 'workout' as type
        FROM workouts w
        JOIN users u ON w.user_id = u.id
        WHERE w.user_id IN (${placeholders})
        ORDER BY COALESCE(w.completed_at, w.created_at) DESC
        LIMIT 30
      `).all(...teamMembers);

      return NextResponse.json(workouts);
    }

    const memberships = db.prepare(`
      SELECT tm.*, t.name, t.invite_code, t.created_at as team_created_at
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = ?
    `).all(authCheck.user.id);

    if (memberships.length === 0) {
      return NextResponse.json({ teams: [] });
    }

    const teamsWithMembers = memberships.map(membership => {
      const members = db.prepare(`
        SELECT u.id, u.username, u.avatar_url, u.created_at, tm.role, tm.joined_at
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ?
        ORDER BY tm.joined_at ASC
      `).all(membership.team_id);

      return { ...membership, id: membership.team_id, members };
    });

    return NextResponse.json({ teams: teamsWithMembers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const authCheck = await authMiddleware(request);
  if (authCheck.error) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { name, invite_code } = await request.json();
    
    if (name) {
      const teamId = uuid();
      const inviteCode = generateInviteCode();
      
      db.prepare(`
        INSERT INTO teams (id, name, invite_code, created_by)
        VALUES (?, ?, ?, ?)
      `).run(teamId, name, inviteCode, authCheck.user.id);

      db.prepare(`
        INSERT INTO team_members (team_id, user_id, role)
        VALUES (?, ?, 'admin')
      `).run(teamId, authCheck.user.id);

      const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
      return NextResponse.json({ ...team, members: [{ user_id: authCheck.user.id, role: 'admin' }] }, { status: 201 });
    }
    
    if (invite_code) {
      const team = db.prepare('SELECT * FROM teams WHERE invite_code = ?').get(invite_code.toUpperCase());
      if (!team) {
        return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
      }

      const existing = db.prepare('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?').get(team.id, authCheck.user.id);
      if (existing) {
        return NextResponse.json({ error: 'You are already a member of this team' }, { status: 400 });
      }

      db.prepare(`
        INSERT INTO team_members (team_id, user_id, role)
        VALUES (?, ?, 'member')
      `).run(team.id, authCheck.user.id);

      const members = db.prepare(`
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

export async function DELETE(request, { params }) {
  const authCheck = await authMiddleware(request);
  if (authCheck.error) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const { teamId } = params;

    if (action === 'leave') {
      const membership = db.prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, authCheck.user.id);
      if (!membership) {
        return NextResponse.json({ error: 'You are not a member of this team' }, { status: 404 });
      }

      const memberCount = db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?').get(teamId);
      if (memberCount.count === 1) {
        return NextResponse.json({ error: 'Cannot leave team as the only member. Disband the team instead.' }, { status: 400 });
      }

      if (membership.role === 'admin') {
        const adminCount = db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ? AND role = ?').get(teamId, 'admin');
        if (adminCount.count === 1) {
          return NextResponse.json({ error: 'Cannot leave as the only admin. Assign another admin first or disband the team.' }, { status: 400 });
        }
      }

      db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(teamId, authCheck.user.id);
      return NextResponse.json({ success: true });
    }

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.created_by !== authCheck.user.id) {
      return NextResponse.json({ error: 'Only the team creator can disband this team' }, { status: 403 });
    }

    const memberCount = db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?').get(teamId);
    if (memberCount.count > 1) {
      return NextResponse.json({ error: 'Cannot disband team with more than one member. Remove members first.' }, { status: 400 });
    }

    db.prepare('DELETE FROM team_members WHERE team_id = ?').run(teamId);
    db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
