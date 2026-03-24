import { createOpencodeClient } from '@opencode-ai/sdk';
import { spawn } from 'child_process';

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} title
 * @property {string} directory
 */

/**
 * @typedef {Object} SessionStatus
 * @property {'idle' | 'retry' | 'busy'} type
 * @property {number} [attempt]
 * @property {string} [message]
 * @property {number} [next]
 */

/**
 * @typedef {Object} SessionCompletionResult
 * @property {boolean} completed
 * @property {string} [sessionId]
 * @property {string} [error]
 */

/**
 * @typedef {Object} SendPromptOptions
 * @property {string} [model]
 */

let client = null;
let serverProcess = null;

const DEFAULT_MODEL = process.env.OPENCODE_MODEL || 'opencode/big-pickle';
const SERVER_URL = process.env.OPENCODE_SERVER_URL || 'http://localhost:4096';
const SERVER_PASSWORD = process.env.OPENCODE_SERVER_PASSWORD;
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;

/**
 * @returns {Promise<import('@opencode-ai/sdk').OpencodeClient>}
 */
export async function getClient() {
  console.log('getting opencode client');
  if (client) return client;

  console.log('looking for opencode server at', SERVER_URL);
  /** @type {{ baseUrl: string, headers?: { Authorization: string } }} */
  const config = {
    baseUrl: SERVER_URL,
  };

  if (SERVER_PASSWORD) {
    config.headers = {
      Authorization: `Basic ${Buffer.from(`opencode:${SERVER_PASSWORD}`).toString('base64')}`,
    };
  }

  try {
    client = createOpencodeClient(config);
    const project = await client.project.current();
    console.log('[OpenCode] Connected to server:', project.data?.id);
    return client;
  } catch (err) {
    console.error('[OpenCode] Failed to connect to server:', err.message);
    throw new Error('OpenCode server not running. Run "opencode serve" first.');
  }
}

/**
 * @returns {Promise<void>}
 */
export async function startServer() {
  if (serverProcess) {
    console.log('[OpenCode] Server already running');
    return;
  }

  console.log('[OpenCode] Starting server...');

  serverProcess = spawn('opencode', ['serve', '--port', '4096'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  serverProcess.stdout?.on('data', (data) => {
    process.stdout.write('[OpenCode] ' + data);
  });

  serverProcess.stderr?.on('data', (data) => {
    process.stderr.write('[OpenCode] ' + data);
  });

  await new Promise((resolve, reject) => {
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

/**
 * @returns {void}
 */
export function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    client = null;
    console.log('[OpenCode] Server stopped');
  }
}

/**
 * @param {string} title
 * @param {string} directory
 * @returns {Promise<Session>}
 */
export async function createSession(title, directory) {
  const c = await getClient();

  const session = await c.session.create({
    body: {
      title,
    },
    query: {
      directory,
    },
  });

  console.log('[OpenCode] Created session:', session.data.id, session.data.title);
  return session.data;
}

/**
 * @param {string} sessionId
 * @param {Array<{type: 'text', text: string}>} parts
 * @param {SendPromptOptions} [options]
 * @returns {Promise<unknown>}
 */
export async function sendPrompt(sessionId, parts, options = {}) {
  const c = await getClient();

  const result = await c.session.prompt({
    path: { id: sessionId },
    body: {
      parts,
      model: options.model ? {
        providerID: options.model.split('/')[0],
        modelID: options.model,
      } : {
        providerID: DEFAULT_MODEL.split('/')[0],
        modelID: DEFAULT_MODEL,
      },
    },
  });

  return result.data;
}

/**
 * @param {string} sessionId
 * @param {string} directory
 * @returns {Promise<SessionStatus|null>}
 */
export async function getSessionStatus(sessionId, directory) {
  const c = await getClient();

  const statusResult = await c.session.status({
    query: { directory },
  });

  return statusResult.data[sessionId] || null;
}

/**
 * @param {string} sessionId
 * @param {string} directory
 * @returns {Promise<boolean>}
 */
export async function abortSession(sessionId, directory) {
  const c = await getClient();

  const result = await c.session.abort({
    path: { id: sessionId },
    query: { directory },
  });

  console.log('[OpenCode] Aborted session:', sessionId);
  return result.data;
}

/**
 * @param {string} sessionId
 * @param {string} directory
 * @param {(status: SessionStatus|null) => void} [onProgress]
 * @returns {Promise<SessionCompletionResult>}
 */
export async function waitForSessionCompletion(sessionId, directory, onProgress) {
  const startTime = Date.now();

  while (Date.now() - startTime < SESSION_TIMEOUT_MS) {
    const status = await getSessionStatus(sessionId, directory);

    if (onProgress) {
      onProgress(status);
    }

    if (!status) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }

    if (status.type === 'idle' || status.type === 'busy') {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }

    if (status.type === 'retry') {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }

    return { completed: true, sessionId };
  }

  await abortSession(sessionId, directory);
  return { completed: false, error: 'Session timed out' };
}

/**
 * @param {string} sessionId
 * @param {string} bugDescription
 * @param {string} severity
 * @param {string} directory
 * @returns {Promise<SessionCompletionResult>}
 */
export async function runBugFix(sessionId, bugDescription, severity, directory) {
  const prompt = buildFixPrompt(bugDescription, severity);

  await sendPrompt(sessionId, [{ type: 'text', text: prompt }]);

  const result = await waitForSessionCompletion(sessionId, directory, (status) => {
    console.log('[OpenCode] Session progress:', status?.type || 'unknown');
  });

  return result;
}

/**
 * @param {string} description
 * @param {string} severity
 * @returns {string}
 */
function buildFixPrompt(description, severity) {
  const severityMap = {
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

/**
 * @param {string} directory
 * @param {number} [limit]
 * @returns {Promise<Session[]>}
 */
export async function listRecentSessions(directory, limit = 10) {
  const c = await getClient();

  const sessions = await c.session.list({
    query: { directory },
  });

  return sessions.data.slice(0, limit);
}

/**
 * @param {string} sessionId
 * @param {string} directory
 * @returns {Promise<Array<{info: unknown, parts: unknown[]}>>}
 */
export async function getSessionMessages(sessionId, directory) {
  const c = await getClient();

  const messages = await c.session.messages({
    path: { id: sessionId },
    query: { directory },
  });

  return messages.data;
}
