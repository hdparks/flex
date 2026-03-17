import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { adminMiddleware, generateToken } from '@/lib/auth';

export async function POST(request, { params }) {
  const adminCheck = await adminMiddleware(request, db);
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  try {
    const { userId } = params;
    
    const targetUser = await db.prepare('SELECT id, username, email, avatar_url FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const token = generateToken(targetUser);
    
    return NextResponse.json({
      user: targetUser,
      token,
      impersonated: true,
      originalAdminId: adminCheck.user.id
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
