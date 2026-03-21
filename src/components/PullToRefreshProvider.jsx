'use client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

export function PullToRefreshProvider({ children, onRefresh }) {
  const { pulling, pullDistance, pullHandlers } = usePullToRefresh(onRefresh);

  return (
    <div
      {...pullHandlers}
      style={{ minHeight: '100vh', touchAction: 'pan-y' }}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: `${pullDistance}px`,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '12px',
          transform: `translateY(${Math.max(0, pullDistance - 20)}px)`,
          transition: pullDistance === 0 ? 'transform 0.3s ease' : 'none',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        {pullDistance > 10 && (
          <div
            style={{
              width: '24px',
              height: '24px',
              border: '3px solid var(--border)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: pulling ? 'spin 0.6s linear infinite' : 'none',
            }}
          />
        )}
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      {children}
    </div>
  );
}
