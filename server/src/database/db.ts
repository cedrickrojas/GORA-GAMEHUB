import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from '../config/env.js';
export interface Sql {
  query<T = any>(text: string, values?: any[]): Promise<{ rows: T[]; rowCount: number }>;
}
const pool = config.databaseUrl
  ? new Pool({ connectionString: config.databaseUrl, max: 10 })
  : null;
const embedded = pool ? null : new PGlite(config.embeddedPath);
export const db: Sql = {
  async query<T>(text: string, values: any[] = []) {
    if (pool) {
      const r = await pool.query(text, values);
      return { rows: r.rows as T[], rowCount: r.rowCount || 0 };
    }
    const r = await embedded!.query<T>(text, values);
    return { rows: r.rows, rowCount: r.affectedRows || r.rows.length };
  },
};
export async function transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T> {
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn({
        query: async (s, v) => {
          const r = await client.query(s, v);
          return { rows: r.rows, rowCount: r.rowCount || 0 };
        },
      });
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  return embedded!.transaction(async (tx) =>
    fn({
      query: async <R>(s: string, v?: any[]) => {
        const r = await tx.query<R>(s, v);
        return { rows: r.rows, rowCount: r.affectedRows || r.rows.length };
      },
    }),
  );
}
export async function migrate() {
  await db.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const directory = resolve('database/migrations');
  const files = readdirSync(directory)
    .filter((file) => /^\d+_[a-z0-9_]+\.sql$/.test(file))
    .sort();
  for (const file of files) {
    const version = file.split('_')[0];
    const sql = readFileSync(resolve(directory, file), 'utf8');
    if (pool) {
      await transaction(async (tx) => {
        await tx.query('SELECT pg_advisory_xact_lock(714723)');
        if (
          (await tx.query('SELECT 1 FROM schema_migrations WHERE version=$1', [version])).rows
            .length
        )
          return;
        await tx.query(sql);
        await tx.query('INSERT INTO schema_migrations(version) VALUES($1)', [version]);
      });
    } else {
      await embedded!.transaction(async (tx) => {
        if (
          (await tx.query('SELECT 1 FROM schema_migrations WHERE version=$1', [version])).rows
            .length
        )
          return;
        await tx.exec(sql);
        await tx.query('INSERT INTO schema_migrations(version) VALUES($1)', [version]);
      });
    }
  }
}
export async function closeDb() {
  if (pool) await pool.end();
  else await embedded!.close();
}
