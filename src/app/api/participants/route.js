import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import db from '@/lib/db';
import { auth } from '@/lib/auth-config';

async function canAccessWorkout(sessionUserId, workoutId) {
  const workout = await db.prepare('SELECT user_id FROM workouts WHERE id = ?').get(workoutId);
  if (!workout) return null;

  if (workout.user_id === sessionUserId) {
    return true;
  }

  const memberships = await db.prepare('SELECT team_id FROM team_members WHERE user_id = ?').all(sessionUserId);
  if (memberships.length === 0) return false;

  const teamIds = memberships.map(m => m.team_id);
  const ownerMemberships = await db.prepare(
    'SELECT team_id FROM team_members WHERE user_id = ? AND team_id IN (' + teamIds.map(() => '?').join(',') + ')'
  ).all(workout.user_id, ...teamIds);

  return ownerMemberships.length > 0;
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { workout_id } = await request.json();
    
    if (!workout_id) {
      return NextResponse.json({ error: 'Workout ID required' }, { status: 400 });
    }

    const workout = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(workout_id);
    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const canAccess = await canAccessWorkout(session.user.id, workout_id);
    if (!canAccess) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (workout.user_id === session.user.id) {
      return NextResponse.json({ error: 'Cannot add yourself to your own workout' }, { status: 400 });
    }

    const existing = await db.prepare(
      'SELECT id FROM workout_participants WHERE workout_id = ? AND user_id = ?'
    ).get(workout_id, session.user.id);

    if (existing) {
      return NextResponse.json({ error: 'Already a participant' }, { status: 400 });
    }

    const id = uuid();
    
    await db.prepare(`
      INSERT INTO workout_participants (id, workout_id, user_id)
      VALUES (?, ?, ?)
    `).run(id, workout_id, session.user.id);

    const participant = await db.prepare(`
      SELECT p.*, u.username, u.avatar_url
      FROM workout_participants p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id);

    return NextResponse.json(participant, { status: 201 });
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
    const workoutId = searchParams.get('workout_id');

    if (!workoutId) {
      return NextResponse.json({ error: 'Workout ID required' }, { status: 400 });
    }

    const canAccess = await canAccessWorkout(session.user.id, workoutId);
    if (!canAccess) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await db.prepare(
      'DELETE FROM workout_participants WHERE workout_id = ? AND user_id = ?'
    ).run(workoutId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}