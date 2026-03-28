'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useSession } from 'next-auth/react';
import { useToast } from '../../../components/ToastProvider';
import { enableNotifications } from '../../../components/ServiceWorkerRegistration';

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [notificationStatus, setNotificationStatus] = useState('default');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  const fetchProfile = () => {
    setLoading(true);
    setProfileError(null);
    api.profile.get()
      .then(setUser)
      .catch((err) => {
        setProfileError(err);
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setAvatarPreview(user.avatar_url || '');
    }
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      toast('Please select a valid image file (PNG, JPEG, or WebP)', 'error');
      return;
    }

    if (file.size > maxSize) {
      toast('Image size must be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      setAvatarPreview(base64Data);
      
      setSaving(true);
      try {
        const updated = await api.profile.update({ avatar_url: base64Data });
        setUser(updated);
        await updateSession({
          ...session,
          user: { ...session.user, image: updated.avatar_url },
        });
        toast('Profile photo updated!', 'success');
      } catch (err) {
        toast(err.message || 'Failed to update photo', 'error');
        setAvatarPreview(user?.avatar_url || '');
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.profile.update({
        username,
        avatar_url: avatarPreview,
      });
      setUser(updated);
      await updateSession({
        ...session,
        user: {
          ...session.user,
          name: updated.username,
          image: updated.avatar_url,
        },
      });
      alert('Profile updated!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePingMe = async () => {
    try {
      await api.ping.send();
      toast('Ping sent! Check your notifications.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleEnableNotifications = async () => {
    try {
      await enableNotifications();
      setNotificationStatus('granted');
      toast('Notifications enabled!', 'success');
    } catch (err) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      
      if (isIOS && !isPWA) {
        toast('Install Flex App to enable notifications: tap Share > Add to Home Screen', 'error');
      } else {
        toast('Notifications are not supported in this browser. Try installing the app.', 'error');
      }
    }
  };

  if (loading) return <div className="container">Loading...</div>;

  if (profileError) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>Failed to load profile: {profileError.message}</p>
        <button className="btn btn-primary" onClick={fetchProfile}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>My Profile</h1>

      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <button
          type="button"
          onClick={handleAvatarClick}
          aria-label="Change profile photo"
          style={{ cursor: 'pointer', display: 'inline-block', position: 'relative', background: 'none', border: 'none', padding: 0 }}
        >
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt="Profile"
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--primary)',
              }}
            />
          ) : (
            <div
              className="avatar"
              style={{
                width: '120px',
                height: '120px',
                fontSize: '3rem',
                border: '3px solid var(--primary)',
                borderRadius: '50%',
              }}
            >
              {username?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              background: 'var(--primary)',
              color: 'white',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
            }}
          >
            📷
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Tap to change photo
        </p>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="form-group">
          <label className="label">Username</label>
          <input
            type="text"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your username"
            readOnly={!user || profileError}
          />
        </div>

        <div className="form-group">
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={user?.email || ''}
            disabled
            style={{ opacity: 0.6 }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Email cannot be changed
          </p>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '1rem' }}
          onClick={handleSave}
          disabled={saving || !user || profileError}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {notificationStatus !== 'granted' && (
        <div className="card" style={{ marginTop: '1rem', textAlign: 'center' }}>
          <p style={{ marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
            Enable push notifications to receive workout updates
          </p>
          <button
            className="btn btn-secondary"
            onClick={handleEnableNotifications}
          >
            Enable Notifications
          </button>
        </div>
      )}

      <div className="card" style={{ marginTop: '1rem' }}>
        <Link href={`/user/${session?.user?.id}/week-in-review/${new Date().getFullYear()}-${Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000))}`} style={{ textDecoration: 'none' }}>
          <button className="btn btn-secondary" style={{ width: '100%' }}>
            📊 Week in Review
          </button>
        </Link>
      </div>

      {session?.user?.isAdmin && (
        <div className="card" style={{ marginTop: '2rem', border: '2px dashed var(--border)' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Admin Tools</h3>
          <button
            className="btn btn-secondary"
            onClick={handlePingMe}
          >
            Ping Me (Test Notifications)
          </button>
        </div>
      )}
    </div>
  );
}
