import { describe, it, expect } from 'vitest';
import { formatRelativeTime, formatDateLocal, toLocalDatetimeInput, fromLocalDatetimeInput } from '../src/lib/dateUtils';

describe('formatRelativeTime (from dashboard/page.js)', () => {
  it('should format recent timestamps as "Just now"', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');
  });

  it('should format timestamps within 24 hours as hours ago', () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveHoursAgo)).toBe('5h ago');
  });

  it('should format timestamps 24+ hours as days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
  });

  it('should handle full ISO timestamps with time component', () => {
    const timestamp = new Date(Date.now() - 21 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(timestamp);
    expect(result).toMatch(/^\d+h ago$/);
  });

  it('should NOT format date-only strings as hours ago (THE BUG)', () => {
    const dateOnly = '2026-03-19';
    const result = formatRelativeTime(dateOnly);
    const hoursMatch = result.match(/^(\d+)h ago$/);
    expect(hoursMatch).toBeNull();
  });

  it('should return "Unknown date" for invalid input', () => {
    expect(formatRelativeTime(null)).toBe('Unknown date');
    expect(formatRelativeTime(undefined)).toBe('Unknown date');
    expect(formatRelativeTime('invalid')).toBe('Unknown date');
  });
});

describe('formatDateLocal (from PatchNotesModal.jsx)', () => {
  it('should parse YYYY-MM-DD dates in local timezone', () => {
    expect(formatDateLocal('2026-03-18')).toBe('Mar 18, 2026');
  });

  it('should NOT have timezone offset issues', () => {
    const result = formatDateLocal('2026-03-18');
    expect(result).toBe('Mar 18, 2026');
    expect(result).not.toBe('Mar 17, 2026');
    expect(result).not.toBe('Mar 19, 2026');
  });

  it('should handle dates at month boundaries', () => {
    expect(formatDateLocal('2026-01-01')).toBe('Jan 1, 2026');
    expect(formatDateLocal('2026-12-31')).toBe('Dec 31, 2026');
  });

  it('should return empty string for invalid input', () => {
    expect(formatDateLocal(null)).toBe('');
    expect(formatDateLocal(undefined)).toBe('');
  });
});

describe('toLocalDatetimeInput (datetime picker display)', () => {
  it('should convert UTC ISO string to local datetime for input', () => {
    const utcTime = '2026-03-19T21:00:00.000Z';
    const result = toLocalDatetimeInput(utcTime);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('should convert UTC to local time (accounting for timezone offset)', () => {
    const utcTime = new Date('2026-03-19T12:00:00Z');
    const localTime = toLocalDatetimeInput(utcTime.toISOString());
    const [date, time] = localTime.split('T');
    expect(date).toBe('2026-03-19');
  });

  it('should return empty string for null/undefined', () => {
    expect(toLocalDatetimeInput(null)).toBe('');
    expect(toLocalDatetimeInput(undefined)).toBe('');
    expect(toLocalDatetimeInput('')).toBe('');
  });

  it('THE BUG: date-only strings were causing wrong hours to display', () => {
    const dateOnly = '2026-03-19';
    const result = toLocalDatetimeInput(dateOnly);
    expect(result).not.toBe(dateOnly);
  });
});

describe('fromLocalDatetimeInput (datetime picker storage)', () => {
  it('should convert local datetime input to UTC ISO string', () => {
    const localInput = '2026-03-19T14:00';
    const result = fromLocalDatetimeInput(localInput);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it('should convert back to UTC correctly', () => {
    const localInput = '2026-03-19T14:00';
    const result = fromLocalDatetimeInput(localInput);
    const parsedBack = new Date(result);
    expect(parsedBack.toISOString()).toBe(result);
  });

  it('should return null for invalid input', () => {
    expect(fromLocalDatetimeInput(null)).toBe(null);
    expect(fromLocalDatetimeInput(undefined)).toBe(null);
    expect(fromLocalDatetimeInput('')).toBe(null);
  });
});

describe('Round-trip conversion (THE BUG FIX)', () => {
  it('should preserve datetime through input->storage->display cycle', () => {
    const originalUtc = '2026-03-19T21:00:00.000Z';
    
    const forInput = toLocalDatetimeInput(originalUtc);
    expect(forInput).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    
    const forStorage = fromLocalDatetimeInput(forInput);
    const forDisplayAgain = toLocalDatetimeInput(forStorage);
    
    expect(forDisplayAgain).toBe(forInput);
  });

  it('should match what the feed displays (formatRelativeTime)', () => {
    const now = new Date();
    const utcString = now.toISOString();
    
    const forInput = toLocalDatetimeInput(utcString);
    const forStorage = fromLocalDatetimeInput(forInput);
    const relativeTime = formatRelativeTime(forStorage);
    
    expect(relativeTime).toBe('Just now');
  });

  it('should round-trip correctly so datetime picker and feed display match', () => {
    const utcString = '2026-03-19T21:00:00.000Z';
    
    const forInput = toLocalDatetimeInput(utcString);
    const forStorage = fromLocalDatetimeInput(forInput);
    
    expect(forStorage).toBe(utcString);
  });

  it('should convert UTC to local time for display', () => {
    const utcString = '2026-03-19T21:00:00.000Z';
    const forInput = toLocalDatetimeInput(utcString);
    expect(forInput).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('THE BUG: original code showed raw UTC time in local picker', () => {
    const utcString = '2026-03-19T21:00:00.000Z';
    const forInput = toLocalDatetimeInput(utcString);
    
    const utcHour = 21;
    const localHour = parseInt(forInput.split('T')[1].split(':')[0]);
    
    const offset = new Date(utcString).getTimezoneOffset();
    const expectedHour = (utcHour - offset / 60 + 24) % 24;
    expect(localHour).toBe(expectedHour);
  });
});
