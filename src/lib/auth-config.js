import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { v4 as uuidv4 } from 'uuid';
import db from './db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const existingUser = await db.prepare('SELECT * FROM users WHERE email = ?').get(user.email);
        if (!existingUser) {
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
      if (user?.email) {
        const dbUser = await db.prepare('SELECT id, is_admin FROM users WHERE email = ?').get(user.email);
        if (dbUser) {
          token.userId = dbUser.id;
          token.isAdmin = dbUser.is_admin || false;
        }
      } else if (!token.userId && token.email) {
        const dbUser = await db.prepare('SELECT id, is_admin FROM users WHERE email = ?').get(token.email);
        if (dbUser) {
          token.userId = dbUser.id;
          token.isAdmin = dbUser.is_admin || false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.isAdmin = token.isAdmin;
      if (token.userId) {
        const dbUser = await db.prepare('SELECT username, avatar_url FROM users WHERE id = ?').get(token.userId);
        if (dbUser) {
          if (dbUser.username) {
            session.user.name = dbUser.username;
          }
          if (dbUser.avatar_url) {
            session.user.image = dbUser.avatar_url;
          }
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
});
