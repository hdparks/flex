'use client';

export function Toast({ message, type = 'info' }) {
  const bgColor = type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : 'var(--primary)';
  
  return (
    <div
      style={{
        background: bgColor,
        color: 'white',
        padding: '0.75rem 1.25rem',
        borderRadius: '8px',
        marginTop: '0.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontWeight: 500,
        animation: 'slideUp 0.2s ease',
      }}
    >
      {message}
    </div>
  );
}
