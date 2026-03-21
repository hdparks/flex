import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import db from '@/lib/db';
import { auth } from '@/lib/auth-config';

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const memberships = await db.prepare(`
      SELECT team_id FROM team_members WHERE user_id = ?
    `).all(session.user.id);

    if (memberships.length === 0) {
      return NextResponse.json(null);
    }

    const teamIds = memberships.map(m => m.team_id);
    const placeholders = teamIds.map(() => '?').join(',');
    
    const race = await db.prepare(`
      SELECT * FROM races
      WHERE team_id IN (${placeholders}) AND race_date > datetime('now')
      ORDER BY race_date ASC
      LIMIT 1
    `).get(...teamIds);

    return NextResponse.json(race || null);
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
    const { name, race_date, location, team_id } = await request.json();

    if (!name || !race_date || !team_id) {
      return NextResponse.json({ error: 'Name, date, and team_id required' }, { status: 400 });
    }

    const membership = await db.prepare(`
      SELECT * FROM team_members WHERE user_id = ? AND team_id = ?
    `).get(session.user.id, team_id);

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
    }

    const id = uuid();
    
    await db.prepare(`
      INSERT INTO races (id, team_id, name, race_date, location)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, team_id, name, race_date, location || null);

    const race = await db.prepare('SELECT * FROM races WHERE id = ?').get(id);

    return NextResponse.json(race, { status: 201 });
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Race ID required' }, { status: 400 });
    }

    const race = await db.prepare('SELECT * FROM races WHERE id = ?').get(id);

    if (!race) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 });
    }

    const membership = await db.prepare(`
      SELECT * FROM team_members WHERE user_id = ? AND team_id = ?
    `).get(session.user.id, race.team_id);

    if (!membership) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await db.prepare('DELETE FROM races WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
