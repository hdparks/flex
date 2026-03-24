

import { createOpencodeClient, OpencodeClient } from '@opencode-ai/sdk';
import { spawn, ChildProcess } from 'child_process';

interface Session {
  id: string;
  title: string;
  directory: string;
}

interface SessionStatus {
  type: 'idle' | 'retry' | 'busy';
  attempt?: number;
  message?: string;
  next?: number;
}

interface SessionCompletionResult {
  completed: boolean;
  sessionId?: string;
  error?: string;
}

interface SendPromptOptions {
  model?: string;
}

interface BugReport {
  id: string;
  description: string;
  severity: string;
}

let client: OpencodeClient | null = null;
let serverProcess: ChildProcess | null = null;

const DEFAULT_MODEL = process.env.OPENCODE_MODEL || 'opencode/big-pickle';
const SERVER_URL = process.env.OPENCODE_SERVER_URL || 'http://localhost:4096';
const SERVER_PASSWORD = process.env.OPENCODE_SERVER_PASSWORD;
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;

export async function getClient(): Promise<OpencodeClient> {
  console.log('getting opencode client');
  if (client) return client;

  console.log('looking for opencode server at', SERVER_URL);
  const config: { baseUrl: string; headers?: { Authorization: string } } = {
    baseUrl: SERVER_URL,
  };

  if (SERVER_PASSWORD) {
    config.headers = {
      Authorization: `Basic ${Buffer.from(`opencode:${SERVER_PASSWORD}`).toString('base64')}`,
    };
  }

  try {
    client = createOpencodeClient(config);
    await client.project.current();
    console.log('[OpenCode] Connected to server');
    return client;
  } catch (err) {
    const error = err as Error;
    console.error('[OpenCode] Failed to connect to server:', error.message);
    throw new Error('OpenCode server not running. Run "opencode serve" first.');
  }
}

export async function startServer(): Promise<void> {
  if (serverProcess) {
    console.log('[OpenCode] Server already running');
    return;
  }

  console.log('[OpenCode] Starting server...');

  serverProcess = spawn('opencode', ['serve', '--port', '4096'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  serverProcess.stdout?.on('data', (data: Buffer) => {
    process.stdout.write('[OpenCode] ' + data);
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    process.stderr.write('[OpenCode] ' + data);
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server start timeout')), 30000);
    const checkInterval = setInterval(async () => {
      try {
        const c = createOpencodeClient({ baseUrl: SERVER_URL });
        await c.project.current();
        clearInterval(checkInterval);
        clearTimeout(timeout);
        client = c;
        resolve();
      } catch {
        // Server not ready yet
      }
    }, 1000);
  });

  console.log('[OpenCode] Server started');
}

export function stopServer(): void {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    client = null;
    console.log('[OpenCode] Server stopped');
  }
}

export async function createSession(title: string, directory: string): Promise<Session> {
  const c = await getClient();

  const sessionResponse = await c.session.create({
    body: { title },
    query: { directory },
  });
  console.log('[OpenCode] Created session:', sessionResponse.data);

  return {
    id: sessionResponse.data.id,
    title,
    directory,
  };
}

export async function sendPrompt(
  sessionId: string,
  parts: Array<{ type: 'text'; text: string }>,
  options: SendPromptOptions = {}
): Promise<unknown> {
  const c = await getClient();

  const modelConfig = options.model
    ? {
        providerID: options.model.split('/')[0],
        modelID: options.model,
      }
    : {
        providerID: DEFAULT_MODEL.split('/')[0],
        modelID: DEFAULT_MODEL,
      };

  console.log('[OpenCode] Sending prompt to session:', sessionId);
  console.log('[OpenCode] Model config:', modelConfig);
  console.log('[OpenCode] Parts length:', parts.length);

  try {
    const result = await c.session.prompt({
      path: { id: sessionId },
      body: { parts, model: modelConfig },
    });

    console.log('[OpenCode] Prompt sent, result:', JSON.stringify(result));
    return result.data;
  } catch (err) {
    const error = err as Error;
    console.error('[OpenCode] Error sending prompt:', error.message);
    console.error('[OpenCode] Full error:', error);
    throw error;
  }
}

export async function getSessionStatus(sessionId: string, directory: string): Promise<SessionStatus | null> {
  const c = await getClient();

  const statusResult = await c.session.status({
    query: { directory },
  });

  const sessionStatus = statusResult.data[sessionId] || null;
  console.log('[OpenCode] getSessionStatus for', sessionId, ':', sessionStatus);
  return sessionStatus;
}

export async function abortSession(sessionId: string, directory: string): Promise<boolean> {
  const c = await getClient();

  const result = await c.session.abort({
    path: { id: sessionId },
    query: { directory },
  });

  console.log('[OpenCode] Aborted session:', sessionId);
  return result.data;
}

export async function waitForSessionCompletion(
  sessionId: string,
  directory: string,
  options: { onProgress?: (status: SessionStatus | null) => void; signal?: AbortSignal } = {}
): Promise<SessionCompletionResult> {
  const { onProgress, signal } = options;
  const startTime = Date.now();

  if (signal?.aborted) {
    console.log('[OpenCode] Already aborted, skipping session');
    await abortSession(sessionId, directory);
    return { completed: false, error: 'Aborted before completion' };
  }

  while (Date.now() - startTime < SESSION_TIMEOUT_MS) {
    if (signal?.aborted) {
      console.log('[OpenCode] Abort signal received, stopping');
      await abortSession(sessionId, directory);
      return { completed: false, error: 'Aborted by user' };
    }

    const status = await getSessionStatus(sessionId, directory);

    if (onProgress) {
      onProgress(status);
    }

    if (!status) {
      console.log('[OpenCode] No status yet, waiting...');
      await sleep(POLL_INTERVAL_MS, signal);
      continue;
    }

    console.log('[OpenCode] Session status:', status);

    if (status.type === 'idle' || status.type === 'busy') {
      console.log('[OpenCode] Session is', status.type, '- continuing to poll');
      await sleep(POLL_INTERVAL_MS, signal);
      continue;
    }

    if (status.type === 'retry') {
      console.log('[OpenCode] Session retrying:', status.message);
      await sleep(status.next || POLL_INTERVAL_MS, signal);
      continue;
    }

    console.log('[OpenCode] Session completed');
    return { completed: true, sessionId };
  }

  console.log('[OpenCode] Session timed out, aborting');
  await abortSession(sessionId, directory);
  return { completed: false, error: 'Session timed out' };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

export async function runBugFix(
  sessionId: string,
  bugDescription: string,
  severity: string,
  directory: string,
  signal?: AbortSignal
): Promise<SessionCompletionResult> {
  const prompt = buildFixPrompt(bugDescription, severity);

  console.log('[OpenCode] Running bug fix for session:', sessionId);
  console.log('[OpenCode] Prompt length:', prompt.length);

  await sendPrompt(sessionId, [{ type: 'text', text: prompt }]);

  console.log('[OpenCode] Waiting for session completion...');
  const result = await waitForSessionCompletion(sessionId, directory, {
    onProgress: (status) => {
      console.log('[OpenCode] Session progress:', status?.type || 'unknown');
    },
    signal,
  });

  return result;
}

function buildFixPrompt(description: string, severity: string): string {
  const severityMap: Record<string, string> = {
    low: 'Low priority - nice to fix when convenient',
    medium: 'Medium priority - should be addressed',
    high: 'High priority - important issue',
    critical: 'Critical - breaks core functionality',
    'feature-request': 'Feature request - improvement idea',
  };
  const severityLabel = severityMap[severity] || 'Medium priority';

  return `You're working on a bug fix for a Next.js micro-social media app called "Flex".

## Bug Report
**Description:** ${description}
**Severity:** ${severityLabel}

## Task
1. First, explore the codebase to understand the relevant areas
2. Identify and fix the bug
3. Run \`npm run lint\` to ensure no linting errors
4. If there are tests, verify they pass with \`npm run test:run\`
5. Explain what you changed and why

## Important Rules
- Only modify files necessary to fix this specific bug
- Do NOT make unrelated changes
- If the bug cannot be reproduced or is unclear, note what you found
- Commit your changes with a descriptive message starting with "fix: "
`;
}

export async function listRecentSessions(directory: string, limit: number = 10): Promise<Session[]> {
  const c = await getClient();

  const sessions = await c.session.list({
    query: { directory },
  });

  return sessions.data.slice(0, limit);
}

export async function getSessionMessages(
  sessionId: string,
  directory: string
): Promise<Array<{ info: unknown; parts: unknown[] }>> {
  const c = await getClient();

  const messages = await c.session.messages({
    path: { id: sessionId },
    query: { directory },
  });

  return messages.data;
}
