'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useToast } from './ToastProvider';

export function BugReportModal({ isOpen, onClose }) {
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const modalRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
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

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast('Please describe the bug', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.bugReports.submit({ description, severity });
      toast('Bug report submitted. Thanks!', 'success');
      setDescription('');
      setSeverity('medium');
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to submit bug report', 'error');
    } finally {
      setIsSubmitting(false);
    }
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
        maxWidth: '450px',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Report a Bug</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{ padding: '0.25rem' }}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="severity" className="label">Severity</label>
            <select
              id="severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="low">Low - Minor issue, app still works</option>
              <option value="medium">Medium - Some features affected</option>
              <option value="high">High - Major features broken</option>
              <option value="critical">Critical - App unusable</option>
              <option value="feature-request">Feature Request - Not a bug, but something new</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description" className="label">Describe the bug *</label>
            <textarea
              ref={textareaRef}
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              rows={5}
              placeholder="What happened? What did you expect to happen?"
              maxLength={2000}
              style={{
                width: '100%',
                resize: 'vertical',
                minHeight: '100px',
              }}
            />
            <div style={{
              textAlign: 'right',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: '0.25rem',
            }}>
              {description.length}/2000
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1 }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={isSubmitting || !description.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
