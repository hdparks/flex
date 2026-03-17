'use client';
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Toast } from './Toast';

const ToastContext = createContext(null);
let nextToastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutRefs = useRef([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const timeouts = timeoutRefs.current;
      mountedRef.current = false;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const toast = useCallback((message, type = 'info') => {
    const id = nextToastId++;
    if (!mountedRef.current) return;
    
    setToasts((prev) => [...prev, { id, message, type }]);
    const timeoutId = setTimeout(() => {
      if (!mountedRef.current) return;
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
    timeoutRefs.current.push(timeoutId);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { toast: (msg) => window.alert(msg) };
  }
  return context;
}
