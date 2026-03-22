import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { auth } from '@/lib/auth-config';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    let query = `
      SELECT 
        br.*,
        u.username as reporter_username,
        u.avatar_url as reporter_avatar
      FROM bug_reports br
      LEFT JOIN users u ON br.user_id = u.id
    `;
    const args = [];

    if (status && ['open', 'addressed'].includes(status)) {
      query += ' WHERE br.status = ?';
      args.push(status);
    }

    query += ' ORDER BY CASE br.severity WHEN \'critical\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 WHEN \'low\' THEN 4 ELSE 5 END, br.created_at DESC';

    const bugReports = await db.prepare(query).all(...args);
    return NextResponse.json(bugReports);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch bug reports' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { description, severity = 'medium' } = body;

  if (!description || !description.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  }

  const trimmedDescription = description.trim();

  if (trimmedDescription.length > 2000) {
    return NextResponse.json({ error: 'Description must be 2000 characters or less' }, { status: 400 });
  }

  const validSeverities = ['low', 'medium', 'high', 'critical', 'feature-request'];
  if (!validSeverities.includes(severity)) {
    return NextResponse.json({ error: 'Invalid severity level' }, { status: 400 });
  }

  const id = uuidv4();
  try {
    await db.prepare(`
      INSERT INTO bug_reports (id, user_id, description, severity)
      VALUES (?, ?, ?, ?)
    `).run(id, session.user.id, trimmedDescription, severity);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to submit bug report' }, { status: 500 });
  }

  return NextResponse.json({ id, message: 'Bug report submitted successfully' }, { status: 201 });
}
