import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { sendNotification } from '@/lib/push';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title, body: notificationBody, url } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  if (!notificationBody || !notificationBody.trim()) {
    return NextResponse.json({ error: 'Body is required' }, { status: 400 });
  }

  try {
    const admins = await db.prepare('SELECT id FROM users WHERE is_admin = 1').all();

    if (admins.length === 0) {
      return NextResponse.json({ error: 'No admins found' }, { status: 404 });
    }

    let successCount = 0;
    let failCount = 0;

    for (const admin of admins) {
      try {
        await sendNotification(admin.id, title.trim(), notificationBody.trim(), url);
        successCount++;
      } catch (err) {
        console.error(`Failed to notify admin ${admin.id}:`, err.message);
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      notified: successCount,
      failed: failCount
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}
