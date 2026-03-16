import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
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

export async function POST(request) {
  const authCheck = await authMiddleware(request);
  if (authCheck.error) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
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

    const id = uuid();
    
    await db.prepare(`
      INSERT INTO cheers (id, from_user_id, workout_id, message)
      VALUES (?, ?, ?, ?)
    `).run(id, authCheck.user.id, workout_id, message || null);

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

export async function GET(request, { params }) {
  const authCheck = await authMiddleware(request);
  if (authCheck.error) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const workoutId = searchParams.get('workout_id');

    if (!workoutId) {
      return NextResponse.json({ error: 'Workout ID required' }, { status: 400 });
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
