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
  if (typeof window === 'undefined') return;
  const viewed = getViewedPatchNotes();
  if (!viewed.includes(version)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([version, ...viewed]));
  }
}

export function hasNewPatchNotes(): boolean {
  const latest = getLatestVersion();
  const viewed = getViewedPatchNotes();
  return !!latest && !viewed.includes(latest);
}
