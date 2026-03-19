import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { auth } from '@/lib/auth-config';

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { description, severity = 'medium' } = await request.json();

  if (!description || !description.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  }

  if (description.length > 2000) {
    return NextResponse.json({ error: 'Description must be 2000 characters or less' }, { status: 400 });
  }

  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (!validSeverities.includes(severity)) {
    return NextResponse.json({ error: 'Invalid severity level' }, { status: 400 });
  }

  const id = uuidv4();
  await db.prepare(`
    INSERT INTO bug_reports (id, user_id, description, severity)
    VALUES (?, ?, ?, ?)
  `).run(id, session.user.id, description.trim(), severity);

  return NextResponse.json({ id, message: 'Bug report submitted successfully' }, { status: 201 });
}
