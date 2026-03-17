'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useSession } from 'next-auth/react';

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.profile.get()
      .then(setUser)
      .catch(console.error)
      .finally(() => setLoading(false));
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
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

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>My Profile</h1>

      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <div
          onClick={handleAvatarClick}
          style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}
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
        </div>
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
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
