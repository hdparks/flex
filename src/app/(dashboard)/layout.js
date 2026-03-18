'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ToastProvider } from '../../components/ToastProvider';

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Feed' },
  { href: '/workouts', icon: '💪', label: 'Workouts' },
  { href: '/team', icon: '👥', label: 'Team' },
];

function ProfileDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user?.image) {
      setImgError(false);
    }
  }, [user?.image]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-ghost"
        style={{ padding: '0.25rem', borderRadius: '50%', width: '40px', height: '40px', overflow: 'hidden' }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="profile-menu"
      >
        {user?.image && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={user.image} 
            alt="Profile" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="avatar" style={{ width: '100%', height: '100%', fontSize: '1.25rem' }}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </button>
      {open && (
        <div
          id="profile-menu"
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '150px',
            zIndex: 50,
            overflow: 'hidden',
          }}>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            role="menuitem"
            style={{
              display: 'block',
              padding: '0.75rem 1rem',
              color: 'var(--text)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--border)',
            }}
          >
            My Profile
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            role="menuitem"
            style={{
              display: 'block',
              width: '100%',
              padding: '0.75rem 1rem',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

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
          <ProfileDropdown user={session?.user} />
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
