'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { ToastProvider } from '../../components/ToastProvider';

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Feed' },
  { href: '/workouts', icon: '💪', label: 'Workouts' },
  { href: '/team', icon: '👥', label: 'Team' },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasValidated = useRef(false);

  useEffect(() => {
    if (hasValidated.current) return;
    hasValidated.current = true;

    const token = api.getToken();
    if (!token) {
      setLoading(false);
      router.replace('/');
      return;
    }

    api.auth.me()
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch((err) => {
        if (err.message === 'Unauthorized' || err.message?.includes('token') || err.message?.includes('No token')) {
          api.clearToken();
          router.replace('/');
        } else {
          console.error('Auth error:', err);
          setUser(null);
          setLoading(false);
        }
      });
  }, [router]);

  const handleLogout = () => {
    api.clearToken();
    router.replace('/');
  };

  if (loading) return null;
  if (!user) return null;

  return (
    <ToastProvider>
      <div className="container" style={{ paddingBottom: '5rem' }}>
        <header className="header">
          <div>
            <h1>Hey, {user.username}!</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Let's get moving</p>
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
