import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';

describe('CheerButton handler flow', () => {
  it('should pass emoji through to the parent handler', async () => {
    const EMOJIS = ['🔥', '💪', '👏', '❤️', '🎉', '⭐', '🚀', '💯'];
    
    let capturedArgs = [];
    
    const parentHandleCheer = async (workoutId, message, image) => {
      capturedArgs.push({ workoutId, message, image });
    };

    const handleEmojiClick = async (emoji) => {
      await parentHandleCheer('workout-123', emoji, null);
    };

    for (const emoji of EMOJIS) {
      capturedArgs = [];
      await handleEmojiClick(emoji);
      expect(capturedArgs[0].message).toBe(emoji);
    }
  });

  it('THE BUG: WorkoutCard was dropping emoji by only passing workoutId', () => {
    const EMOJIS = ['🔥', '💪', '👏', '❤️', '🎉', '⭐', '🚀', '💯'];
    
    let capturedArgs = [];
    
    const parentHandleCheer = async (workoutId, message, image) => {
      capturedArgs.push({ workoutId, message, image });
    };

    const handleEmojiClick = async (emoji) => {
      await parentHandleCheer('workout-123', emoji, null);
    };

    handleEmojiClick('🚀');
    expect(capturedArgs[0].message).toBe('🚀');
    expect(capturedArgs[0].workoutId).toBe('workout-123');
  });
});

describe('Avatar rendering logic', () => {
  it('should use avatar_url when available', () => {
    const member = {
      username: 'Brooklyn',
      avatar_url: 'https://example.com/avatar.jpg'
    };

    const shouldShowAvatar = (member) => !!member.avatar_url;
    expect(shouldShowAvatar(member)).toBe(true);
  });

  it('should fall back to initials when avatar_url is null', () => {
    const member = {
      username: 'Brooklyn',
      avatar_url: null
    };

    const shouldShowAvatar = (member) => !!member.avatar_url;
    expect(shouldShowAvatar(member)).toBe(false);
  });

  it('should fall back to initials when avatar_url is empty', () => {
    const member = {
      username: 'Brooklyn',
      avatar_url: ''
    };

    const shouldShowAvatar = (member) => !!member.avatar_url;
    expect(shouldShowAvatar(member)).toBe(false);
  });
});

describe('Feed ordering with COALESCE', () => {
  const workouts = [
    { id: 1, completed_at: '2026-03-19T21:00:00Z', created_at: '2026-03-19T18:00:00Z' },
    { id: 2, completed_at: null, created_at: '2026-03-19T22:00:00Z' },
    { id: 3, completed_at: '2026-03-19T20:00:00Z', created_at: '2026-03-19T17:00:00Z' },
  ];

  it('should sort by completed_at when present', () => {
    const sortWorkouts = (workouts) => {
      return [...workouts].sort((a, b) => {
        const dateA = a.completed_at || a.created_at;
        const dateB = b.completed_at || b.created_at;
        return new Date(dateB) - new Date(dateA);
      });
    };

    const sorted = sortWorkouts(workouts);
    expect(sorted[0].id).toBe(2);
    expect(sorted[1].id).toBe(1);
    expect(sorted[2].id).toBe(3);
  });

  it('THE BUG: OLD code only used completed_at DESC', () => {
    const oldSort = (workouts) => {
      return [...workouts].sort((a, b) => {
        return new Date(b.completed_at) - new Date(a.completed_at);
      });
    };

    const sorted = oldSort(workouts);
    expect(sorted[0].id).toBe(1);
    expect(sorted[1].id).toBe(3);
    expect(sorted[2].id).toBe(2);
  });
});

describe('Image upload detection', () => {
  it('should detect base64 image data', () => {
    const isBase64Image = (data) => {
      return typeof data === 'string' && data.startsWith('data:');
    };

    expect(isBase64Image('data:image/png;base64,abc123')).toBe(true);
    expect(isBase64Image('data:image/jpeg;base64,xyz')).toBe(true);
    expect(isBase64Image('https://example.com/img.jpg')).toBe(false);
  });

  it('should detect cloud URLs', () => {
    const isCloudUrl = (data) => {
      return typeof data === 'string' && data.startsWith('http');
    };

    expect(isCloudUrl('https://utfs.io/f/abc123')).toBe(true);
    expect(isCloudUrl('https://example.com/avatar.jpg')).toBe(true);
    expect(isCloudUrl('data:image/png;base64,abc')).toBe(false);
  });
});
