export type ChangeType = 'new' | 'improvement' | 'fix';

export interface Change {
  type: ChangeType;
  text: string;
}

export interface Release {
  version: string;
  date: string;
  changes: Change[];
}

export const patchNotes: Release[] = [
  {
    version: '0.1.1',
    date: '2026-03-28',
    changes: [
      { type: 'fix', text: 'Week in Review no longer redirects you to earlier weeks on every dashboard visit - it now properly tracks which weeks you\'ve seen.' },
    ]
  },
  {
    version: '0.1.0',
    date: '2026-03-28',
    changes: [
      { type: 'improvement', text: 'Profile pictures now save automatically when selected - no need to click the Save button!' },
      { type: 'new', text: 'Get a confetti celebration when you log a workout!' },
      { type: 'new', text: 'Receive push notifications when someone cheers or comments on your workout.' },
      { type: 'new', text: 'Introducing Week in Review - a fun slideshow summary of your weekly workouts with animated stats and comparisons to previous weeks!' },
    ]
  },
  {
    version: '0.0.9',
    date: '2026-03-25',
    changes: [
      { type: 'fix', text: 'Cheer popups now stay on screen properly on mobile - no more getting cut off.' },
      { type: 'fix', text: 'You can no longer add yourself as a participant to your own workout to double your total minutes for the workout.'},
      { type: 'fix', text: 'User profile page now shows workout cards with user avatars and names properly loaded.'},
    ]
  },
  {
    version: '0.0.8',
    date: '2026-03-22',
    changes: [
      { type: 'improvement', text: 'Moved action icons (cheer, join, delete) below workout card for better layout.'},
      { type: 'improvement', text: 'Comment input now shows by default.'},
      { type: 'new', text: 'Unified workout card component across Feed, Workouts, and Profile pages.'},
      { type: 'new', text: 'Added edit modal for workouts - click the pencil icon to edit.'},
      { type: 'fix', text: 'Cheers are now displayed immediately, no longer requires reload to view.'},
    ]
  },
  {
    version: '0.0.7',
    date: '2026-03-22',
    changes: [
      { type: 'new', text: 'Added date filter to the feed. Filter by Today, This Week, This Month, or All Time.'},
      { type: 'new', text: 'See who cheered your workout! Click on the cheers to see a list of everyone who cheered and what they said.'},
      { type: 'improvement', text: 'Click on workout photos to view them full-screen.'},
      { type: 'fix', text: 'Workouts you join as a participant now appear in your workout history and count toward your total minutes.'},
    ]
  },
  {
    version: '0.0.6',
    date: '2026-03-21',
    changes: [
      { type: 'improvement', text: 'Added infinite scrolling, loads batches of posts at a time instead of all 30+ workouts (well done!)'},
      { type: 'new', text: 'Added Group Workouts. Tag yourself in an existing workout by clicking the little group icon.'},
    ]
  },
  {
    version: '0.0.5',
    date: '2026-03-21',
    changes: [
      { type: 'new', text: 'Added push notifications. Enable them on your profile to get notified when teammates cheer your workouts!' },
      { type: 'fix', text: 'Fixed comment button not working on workout cards.' },
    ]
  },
  {
    version: '0.0.4',
    date: '2026-03-21',
    changes: [
      { type: 'new', text: 'Added image uploads for workouts. Log your runs with photos!' },
      { type: 'new', text: 'Added comments on workouts. Cheer each other on!' },
      { type: 'new', text: 'Added user profile pages. Click on any username to see their stats and recent workouts.' },
      { type: 'new', text: 'Added race countdown timer.' },
    ],
  },
  {
    version: '0.0.3',
    date: '2026-03-19',
    changes: [
      { type: 'fix', text: 'Fixed workout timestamps showing incorrectly (e.g., "21h ago" for brand new posts). Thanks to Brooklyn and Bryce for catching this one!' },
      { type: 'fix', text: 'Fixed feed posts not appearing in chronological order. Brooklyn was right - that was janky.' },
      { type: 'improvement', text: 'Workout date picker is now a datetime picker so you can log the exact time you finished your workout.' },
      { type: 'fix', text: 'Fixed emoji reactions not being saved - they were getting dropped by a bug in the code. Nice find, Brooklyn!' },
      { type: 'fix', text: 'Fixed profile picture uploads. Images are now properly uploaded to the cloud instead of stored as raw data. Good Eye, Brooklyn!' },
      { type: 'fix', text: 'Fixed username preference. The greeting up top will use your preferred username instead of your full legal from your Google account.' },
      { type: 'fix', text: 'Fixed team page not showing profile pictures for members.' },
      { type: 'fix', text: 'Fixed patch note dates showing a day off due to timezone issues.' },
      { type: 'fix', text: 'Fixed the bottom navigation bar on Chrome. (I hope. Gonna be honest, didn\'t really test that one.) It should now stick to the bottom properly instead of floating around when you scroll down.' },
    ],
  },
  {
    version: '0.0.2',
    date: '2026-03-18',
    changes: [
      { type: 'new', text: 'Added Patch Notes. I know how some of you sick freaks loooooooove your patch notes. This one\'s for you.' },
      { type: 'new', text: 'Added "Report a Bug" feature. I expect this one is going to get a lot of use. We\'ve already found like 12 bugs so far. I\'ll try to credit whoever reports the bug in the patch notes, and I\'ll add extra points to your profile.' },
      { type: 'new', text: 'Added "Feature Request" severity option to bug reports. It doens\'t have to be a bug; if you guys have ideas for making this experience better, send those as well!'},
    ],
  },
];

export function getRecentPatchNotes(count = 1): Release[] {
  return patchNotes.slice(0, count);
}

export function getLatestVersion(): string | undefined {
  return patchNotes[0]?.version;
}

const STORAGE_KEY = 'flex_viewed_patch_notes';

export function getViewedPatchNotes(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function markPatchNotesViewed(version: string): void {
  if (typeof version !== 'string' || !version) return;
  if (typeof window === 'undefined') return;
  const viewed = getViewedPatchNotes();
  if (!viewed.includes(version)) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([version, ...viewed]));
    } catch {
      // localStorage may fail in private mode or when quota exceeded
    }
  }
}

export function hasNewPatchNotes(): boolean {
  const latest = getLatestVersion();
  const viewed = getViewedPatchNotes();
  return !!latest && !viewed.includes(latest);
}
