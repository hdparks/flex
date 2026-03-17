'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ToastProvider } from '../../components/ToastProvider';

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Feed' },
  { href: '/workouts', icon: '💪', label: 'Workouts' },
  { href: '/team', icon: '👥', label: 'Team' },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <span>Loading...</span>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const username = session?.user?.name || 'Athlete';

  return (
    <ToastProvider>
      <div className="container" style={{ paddingBottom: '5rem' }}>
        <header className="header">
          <div>
            <h1>Hey, {username}!</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Let&apos;s get moving</p>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
            🚪
          </button>
        </header>
        {children}
        <nav className="nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </ToastProvider>
  );
}
