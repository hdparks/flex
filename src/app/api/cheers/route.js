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
    const { workout_id, message } = await request.json();
    
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

    const id = uuid();
    
    await db.prepare(`
      INSERT INTO cheers (id, from_user_id, workout_id, message)
      VALUES (?, ?, ?, ?)
    `).run(id, session.user.id, workout_id, message || null);

    const cheer = await db.prepare(`
      SELECT c.*, u.username, u.avatar_url
      FROM cheers c
      JOIN users u ON c.from_user_id = u.id
      WHERE c.id = ?
    `).get(id);

    return NextResponse.json(cheer, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(request) {
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

    const workout = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(workoutId);
    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const canAccess = await canAccessWorkout(session.user.id, workoutId);
    if (!canAccess) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const cheers = await db.prepare(`
      SELECT c.*, u.username, u.avatar_url
      FROM cheers c
      JOIN users u ON c.from_user_id = u.id
      WHERE c.workout_id = ?
      ORDER BY c.created_at DESC
    `).all(workoutId);

    return NextResponse.json(cheers);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}