import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request, { params }) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Bug report ID is required' }, { status: 400 });
  }

  const existing = await db.prepare('SELECT id FROM bug_reports WHERE id = ?').get(id);
  if (!existing) {
    return NextResponse.json({ error: 'Bug report not found' }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { status, resolution_note, pr_url } = body;

  if (status && !['open', 'addressed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status. Must be "open" or "addressed"' }, { status: 400 });
  }

  if (pr_url && pr_url.length > 500) {
    return NextResponse.json({ error: 'PR URL must be 500 characters or less' }, { status: 400 });
  }

  if (resolution_note && resolution_note.length > 2000) {
    return NextResponse.json({ error: 'Resolution note must be 2000 characters or less' }, { status: 400 });
  }

  try {
    const updates = [];
    const args = [];

    if (status) {
      updates.push('status = ?');
      args.push(status);
      if (status === 'addressed') {
        updates.push('resolved_at = CURRENT_TIMESTAMP');
        updates.push('resolved_by = ?');
        args.push('agent');
      }
    }

    if (resolution_note !== undefined) {
      updates.push('resolution_note = ?');
      args.push(resolution_note);
    }

    if (pr_url !== undefined) {
      updates.push('pr_url = ?');
      args.push(pr_url);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    args.push(id);
    await db.prepare(`
      UPDATE bug_reports 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...args);

    const updated = await db.prepare('SELECT * FROM bug_reports WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update bug report' }, { status: 500 });
  }
}
