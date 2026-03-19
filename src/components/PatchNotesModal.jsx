'use client';
import { useEffect, useRef } from 'react';
import { patchNotes, getLatestVersion, markPatchNotesViewed } from '@/patchNotes';

export function PatchNotesModal({ isOpen, onClose }) {
  const modalRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        markPatchNotesViewed(getLatestVersion());
        onClose();
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        markPatchNotesViewed(getLatestVersion());
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleClose = () => {
    markPatchNotesViewed(getLatestVersion());
    onClose();
  };

  if (!isOpen) return null;

  const typeStyles = {
    new: { color: '#4ade80', label: 'New' },
    improvement: { color: '#60a5fa', label: 'Improved' },
    fix: { color: '#fbbf24', label: 'Fixed' },
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem',
    }}>
      <div ref={modalRef} className="card" style={{
        width: '100%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Patch Notes</h2>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-icon"
            style={{ padding: '0.25rem' }}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {patchNotes.map((release) => (
            <div key={release.version}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '0.75rem',
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)' }}>
                  v{release.version}
                </h3>
                <span className="timestamp">{formatDate(release.date)}</span>
              </div>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}>
                {release.changes.map((change, idx) => (
                  <li key={idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-muted)',
                  }}>
                    <span style={{
                      color: typeStyles[change.type]?.color || 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      background: 'var(--surface-light)',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                    }}>
                      {typeStyles[change.type]?.label}
                    </span>
                    <span>{change.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button onClick={handleClose} className="btn btn-secondary" style={{ width: '100%' }}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
