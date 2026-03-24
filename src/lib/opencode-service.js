import { createOpencode, createOpencodeClient } from '@opencode-ai/sdk';

let client = null;
let serverProcess = null;

const DEFAULT_MODEL = process.env.OPENCODE_MODEL || 'opencode/big-pickle';

const SERVER_URL = process.env.OPENCODE_SERVER_URL || 'http://localhost:4096';
const SERVER_PASSWORD = process.env.OPENCODE_SERVER_PASSWORD;

const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;

async function getClient() {
  console.log('getting opencode client')
  if (client) return client;

  console.log('looking for opencode server at', SERVER_URL)
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

    const health = await client.global.health();
    console.log('[OpenCode] Connected to server:', health.data.version);
    return client;
  } catch (err) {
    console.error('[OpenCode] Failed to connect to server:', err.message);
    throw new Error('OpenCode server not running. Run "opencode serve" first.');
  }
}

export async function startServer() {
  if (serverProcess) {
    console.log('[OpenCode] Server already running');
    return;
  }

  console.log('[OpenCode] Starting server...');
  const { spawn } = await import('child_process');

  serverProcess = spawn('opencode', ['serve', '--port', '4096'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  serverProcess.stdout.on('data', (data) => {
    process.stdout.write('[OpenCode] ' + data);
  });

  serverProcess.stderr.on('data', (data) => {
    process.stderr.write('[OpenCode] ' + data);
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server start timeout')), 30000);
    const checkInterval = setInterval(async () => {
      try {
        const c = createOpencodeClient({ baseUrl: SERVER_URL });
        await c.global.health();
        clearInterval(checkInterval);
        clearTimeout(timeout);
        client = c;
        resolve();
      } catch {}
    }, 1000);
  });

  console.log('[OpenCode] Server started');
}

export async function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    client = null;
    console.log('[OpenCode] Server stopped');
  }
}

export async function createSession(title, directory) {
  const c = await getClient();

  const session = await c.session.create({
    body: {
      title,
      directory,
    },
  });

  console.log('[OpenCode] Created session:', session.data.id, session.data.title);
  return session.data;
}

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
      outputFormat: options.format,
    },
  });

  return result.data;
}

export async function getSessionStatus(sessionId) {
  const c = await getClient();

  const session = await c.session.get({
    path: { id: sessionId },
  });

  return session.data;
}

export async function abortSession(sessionId) {
  const c = await getClient();

  const result = await c.session.abort({
    path: { id: sessionId },
  });

  console.log('[OpenCode] Aborted session:', sessionId);
  return result.data;
}

export async function waitForSessionCompletion(sessionId, onProgress) {
  const startTime = Date.now();

  while (Date.now() - startTime < SESSION_TIMEOUT_MS) {
    const status = await getSessionStatus(sessionId);

    if (onProgress) {
      onProgress(status);
    }

    if (status.status === 'completed' || status.status === 'finished') {
      return { completed: true, status };
    }

    if (status.status === 'error' || status.status === 'aborted') {
      return { completed: false, status, error: 'Session ended with error' };
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  await abortSession(sessionId);
  return { completed: false, error: 'Session timed out' };
}

export async function runBugFix(sessionId, bugDescription, severity, directory) {
  const prompt = buildFixPrompt(bugDescription, severity);

  await sendPrompt(sessionId, [{ type: 'text', text: prompt }]);

  const result = await waitForSessionCompletion(sessionId, (status) => {
    console.log('[OpenCode] Session progress:', status.status, status.title);
  });

  return result;
}

function buildFixPrompt(description, severity) {
  const severityLabel = {
    low: 'Low priority - nice to fix when convenient',
    medium: 'Medium priority - should be addressed',
    high: 'High priority - important issue',
    critical: 'Critical - breaks core functionality',
    'feature-request': 'Feature request - improvement idea',
  }[severity] || 'Medium priority';

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

export async function listRecentSessions(limit = 10) {
  const c = await getClient();

  const sessions = await c.session.list({
    query: { maxCount: limit },
  });

  return sessions.data;
}

export async function getSessionMessages(sessionId) {
  const c = await getClient();

  const session = await c.session.get({
    path: { id: sessionId },
  });

  return session.data.messages || [];
}