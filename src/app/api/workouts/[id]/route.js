import { NextResponse } from 'next/server';
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

export async function GET(request, { params }) {
  const authCheck = await authMiddleware(request);
  if (authCheck.error) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const workout = db.prepare(`
      SELECT w.*, u.username, u.avatar_url,
        (SELECT COUNT(*) FROM cheers WHERE workout_id = w.id) as cheer_count
      FROM workouts w
      JOIN users u ON w.user_id = u.id
      WHERE w.id = ?
    `).get(params.id);

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const cheers = db.prepare(`
      SELECT c.*, u.username, u.avatar_url
      FROM cheers c
      JOIN users u ON c.from_user_id = u.id
      WHERE c.workout_id = ?
      ORDER BY c.created_at DESC
    `).all(params.id);

    return NextResponse.json({ ...workout, cheers });
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
    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(params.id);
    
    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    if (workout.user_id !== authCheck.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    db.prepare('DELETE FROM cheers WHERE workout_id = ?').run(params.id);
    db.prepare('DELETE FROM workouts WHERE id = ?').run(params.id);
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
