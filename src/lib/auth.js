import jwt from 'jsonwebtoken';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be configured');
  }
  return secret;
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export async function authMiddleware(request) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (err) {
    return { error: 'Invalid token', status: 401 };
  }

  return { user: decoded };
}

export async function adminMiddleware(request, db) {
  const authCheck = await authMiddleware(request);
  if (authCheck.error) {
    return authCheck;
  }

  const user = await db.prepare('SELECT is_admin FROM users WHERE id = ?').get(authCheck.user.id);
  if (!user || !user.is_admin) {
    return { error: 'Admin access required', status: 403 };
  }
  
  return { user: authCheck.user };
}


