#!/usr/bin/env node

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient, type Client } from '@libsql/client';
// @ts-expect-error - tsx resolves .mts extensions
import { createSession, runBugFix, getClient } from '../src/lib/opencode-service.mts';
import * as github from '../src/lib/github-service.js';

const POLL_INTERVAL_MS = 2 * 60 * 1000;
const DIRECTORY = process.cwd();
const MAX_FILE_CHANGES = 10;

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
  process.exit(1);
}

const db: Client = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

interface BugReport {
  id: string;
  description: string;
  severity: string;
}

async function getPendingBugs(): Promise<BugReport[]> {
  const result = await db.execute({
    sql: `SELECT * FROM bug_reports WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1`,
    args: [],
  });
  return result.rows as unknown as BugReport[];
}

async function updateBugStatus(
  bugId: string,
  status: string,
  extra: { opencode_session_id?: string | null; pr_url?: string; error_message?: string } = {}
): Promise<void> {
  const updates: string[] = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
  const args: (string | null)[] = [status];

  if (extra.opencode_session_id !== undefined) {
    updates.push('opencode_session_id = ?');
    args.push(extra.opencode_session_id);
  }
  if (extra.pr_url !== undefined) {
    updates.push('pr_url = ?');
    args.push(extra.pr_url);
  }
  if (extra.error_message !== undefined) {
    updates.push('error_message = ?');
    args.push(extra.error_message);
  }

  args.push(bugId);

  await db.execute({
    sql: `UPDATE bug_reports SET ${updates.join(', ')} WHERE id = ?`,
    args,
  });
}

async function processBug(bug: BugReport, abort: AbortController): Promise<void> {
  console.log('\n' + '='.repeat(50));
  console.log(`[Processor] Processing bug: ${bug.id}`);
  console.log(`[Processor] Description: ${bug.description.slice(0, 100)}...`);
  console.log(`[Processor] Severity: ${bug.severity}`);
  console.log('='.repeat(50));

  await updateBugStatus(bug.id, 'in_progress', {
    opencode_session_id: null,
  });

  let session: { id: string } | null = null;
  try {
    console.log('[Processor] Creating OpenCode session...');
    session = await createSession(`Fix bug: ${bug.id.slice(0, 8)}`, DIRECTORY);

    await updateBugStatus(bug.id, 'in_progress', {
      opencode_session_id: session.id,
    });

    console.log('[Processor] Sending bug fix prompt...');
    const result = await runBugFix(session.id, bug.description, bug.severity, DIRECTORY, abort.signal);

    if (!result.completed) {
      console.error('[Processor] Session did not complete:', result.error);
      await updateBugStatus(bug.id, 'needs_manual_review', {
        error_message: `OpenCode session failed: ${result.error}`,
      });
      return;
    }

    console.log('[Processor] Session completed, checking for changes...');
    const hasChanges = await github.hasChanges();

    if (!hasChanges) {
      console.log('[Processor] No code changes detected');
      await updateBugStatus(bug.id, 'needs_manual_review', {
        error_message: 'No code changes made by OpenCode session',
      });
      return;
    }

    const changedFiles = await github.getChangedFiles();
    console.log('[Processor] Changed files:', changedFiles.length);

    if (changedFiles.length > MAX_FILE_CHANGES) {
      console.error('[Processor] Too many files changed, aborting PR');
      await github.resetToMain();
      await updateBugStatus(bug.id, 'needs_manual_review', {
        error_message: `Too many files changed (${changedFiles.length}), expected <= ${MAX_FILE_CHANGES}`,
      });
      return;
    }

    console.log('[Processor] Creating PR...');
    const pr = await github.createBugFixPR(bug.id, bug.description, bug.severity);

    if (pr) {
      await updateBugStatus(bug.id, 'ready_for_review', {
        pr_url: pr.html_url,
      });
      console.log('[Processor] SUCCESS - PR ready for review:', pr.html_url);
    } else {
      await updateBugStatus(bug.id, 'needs_manual_review', {
        error_message: 'Failed to create PR - no changes or GitHub error',
      });
    }
  } catch (err) {
    const error = err as Error;
    console.error('[Processor] Error processing bug:', error.message);
    await github.resetToMain();
    await updateBugStatus(bug.id, 'needs_manual_review', {
      error_message: error.message,
    });
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('Flex Bug Processor Starting');
  console.log('='.repeat(50));
  console.log(`Polling every ${POLL_INTERVAL_MS / 1000}s for new bugs`);
  console.log(`Directory: ${DIRECTORY}`);
  console.log('');

  try {
    await getClient();
  } catch (err) {
    console.error('Error: OpenCode server not running');
    console.error('Please run "opencode serve" in another terminal');
    process.exit(1);
  }

  let running = true;
  let processing = false;
  let shuttingDown = false;
  const abort = new AbortController();

  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n[Processor] Shutting down...');
    running = false;
    abort.abort();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  while (running) {
    if (!processing) {
      processing = true;
      try {
        const pendingBugs = await getPendingBugs();

        if (pendingBugs.length > 0) {
          console.log(`\n[Processor] Found ${pendingBugs.length} pending bug(s)`);
          for (const bug of pendingBugs) {
            if (!running) break;
            await processBug(bug, abort);
          }
        } else {
          console.log(`[Processor] No pending bugs, waiting...`);
        }
      } catch (err) {
        const error = err as Error;
        console.error('[Processor] Error:', error.message);
      }
      processing = false;
    }

    try {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), POLL_INTERVAL_MS);
        abort.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch {
      // Abort signaled
    }
  }

  console.log('[Processor] Stopped');
}

main();
