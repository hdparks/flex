import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import db from './db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const existingUser = await db.prepare('SELECT * FROM users WHERE email = ?').get(user.email);
        if (!existingUser) {
          const { v4: uuidv4 } = await import('uuid');
          const id = uuidv4();
          const username = user.name || user.email.split('@')[0] || 'User';
          
          await db.prepare(
            'INSERT INTO users (id, username, email, avatar_url) VALUES (?, ?, ?, ?)'
          ).run(id, username, user.email, user.image);
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await db.prepare('SELECT is_admin FROM users WHERE id = ?').get(user.id);
        token.isAdmin = dbUser?.is_admin || false;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.isAdmin = token.isAdmin;
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
});
