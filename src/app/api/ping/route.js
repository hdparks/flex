import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { sendNotification } from '@/lib/push';
import db from '@/lib/db';

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = await request.json();
    const targetUserId = userId || session.user.id;

    const subs = await db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(targetUserId);

    if (subs.length === 0) {
      return NextResponse.json({ error: 'No push subscription found. Please reload the page to enable notifications.' }, { status: 400 });
    }

    await sendNotification(
      targetUserId,
      'Ping! 👋',
      'This is a test notification from Flex!',
      '/profile'
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
