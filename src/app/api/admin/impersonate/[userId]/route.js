import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { auth } from '@/lib/auth-config';

export async function POST(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUser = await db.prepare('SELECT is_admin FROM users WHERE id = ?').get(session.user.id);
  if (!adminUser?.is_admin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  try {
    const { userId } = await params;
    
    const targetUser = await db.prepare('SELECT id, username, email, avatar_url FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      user: targetUser,
      impersonated: true,
      originalAdminId: session.user.id
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
