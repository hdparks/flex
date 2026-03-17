import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { auth } from '@/lib/auth-config';

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const workout = await db.prepare(`
      SELECT w.*, u.username, u.avatar_url,
        (SELECT COUNT(*) FROM cheers WHERE workout_id = w.id) as cheer_count
      FROM workouts w
      JOIN users u ON w.user_id = u.id
      WHERE w.id = ?
    `).get(params.id);

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const cheers = await db.prepare(`
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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const workout = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(params.id);
    
    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    if (workout.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await db.transaction(async () => {
      await db.prepare('DELETE FROM cheers WHERE workout_id = ?').run(params.id);
      await db.prepare('DELETE FROM workouts WHERE id = ?').run(params.id);
    });
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const workout = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(params.id);
    
    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    if (workout.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { type, title, description, duration_minutes, completed_at } = body;

    await db.prepare(`
      UPDATE workouts 
      SET type = ?, title = ?, description = ?, duration_minutes = ?, completed_at = ?
      WHERE id = ?
    `).run(
      type ?? workout.type,
      title ?? workout.title,
      description ?? workout.description,
      duration_minutes !== undefined ? duration_minutes : workout.duration_minutes,
      completed_at ?? workout.completed_at,
      params.id
    );

    const updated = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(params.id);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
