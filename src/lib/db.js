import { createClient } from '@libsql/client';

let client = null;
let initializingPromise = null;

async function getClient() {
  if (client) return client;
  
  if (initializingPromise) {
    return initializingPromise;
  }

  initializingPromise = (async () => {
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;

    if (!url || !token) {
      throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
    }

    client = createClient({
      url,
      authToken: token,
    });

    const schema = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_url TEXT,
        is_admin INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        invite_code TEXT UNIQUE NOT NULL,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS team_members (
        team_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (team_id, user_id),
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        duration_minutes INTEGER,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS cheers (
        id TEXT PRIMARY KEY,
        from_user_id TEXT NOT NULL,
        workout_id TEXT NOT NULL,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_user_id) REFERENCES users(id),
        FOREIGN KEY (workout_id) REFERENCES workouts(id)
      )`,
      `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        keys TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_workouts_completed ON workouts(completed_at)`,
      `CREATE INDEX IF NOT EXISTS idx_cheers_workout ON cheers(workout_id)`,
      `CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id)`,
    ];

    for (const stmt of schema) {
      try {
        await client.execute(stmt);
      } catch (err) {
        if (!err.message?.includes('already exists')) {
          console.error('Schema creation error:', err.message);
        }
      }
    }

    return client;
  })();

  try {
    const result = await initializingPromise;
    initializingPromise = null;
    return result;
  } catch (err) {
    initializingPromise = null;
    throw err;
  }
}

const db = {
  prepare: (sql) => ({
    all: async (...args) => {
      const result = await (await getClient()).execute({ sql, args: args.length ? args : [] });
      return result.rows;
    },
    get: async (...args) => {
      const result = await (await getClient()).execute({ sql, args: args.length ? args : [] });
      return result.rows[0] || null;
    },
    run: async (...args) => {
      return (await getClient()).execute({ sql, args: args.length ? args : [] });
    },
  }),
  exec: async (sql) => {
    return (await getClient()).execute({ sql, args: [] });
  },
  transaction: async (fn) => {
    const client = await getClient();
    await client.execute({ sql: 'BEGIN', args: [] });
    try {
      const result = await fn();
      await client.execute({ sql: 'COMMIT', args: [] });
      return result;
    } catch (err) {
      await client.execute({ sql: 'ROLLBACK', args: [] });
      throw err;
    }
  },
};

export default db;
