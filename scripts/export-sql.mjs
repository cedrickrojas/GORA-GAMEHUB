import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationDirectory = resolve(root, 'database/migrations');
const migrations = readdirSync(migrationDirectory)
  .filter((file) => /^\d+_[a-z0-9_]+\.sql$/.test(file))
  .sort();

const sections = migrations.map((file) => {
  const version = file.split('_')[0];
  const delimiter = `$gora_migration_${version}$`;
  const sql = readFileSync(resolve(migrationDirectory, file), 'utf8').trim();
  if (sql.includes(delimiter)) throw new Error(`SQL delimiter collision in ${file}`);
  return `  -- ${file}
  IF NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '${version}') THEN
    EXECUTE ${delimiter}
${sql}
${delimiter};
    INSERT INTO public.schema_migrations (version) VALUES ('${version}');
    RAISE NOTICE 'Applied migration ${version}';
  ELSE
    RAISE NOTICE 'Migration ${version} already applied; keeping existing data';
  END IF;`;
});

const output = `-- GORA: complete PostgreSQL setup for pgAdmin Query Tool.
-- Select your existing gora database before running this entire file (F5).
-- PostgreSQL 16+; public schema. No extensions or fixed passwords required.
-- Includes every application migration, constraints, indexes, timestamp triggers,
-- and the 13 baseline sports. Existing rows are retained on repeat runs.
-- Intended for an empty database or one managed by GORA's schema_migrations.
-- If a query fails, execute ROLLBACK; fix the reported issue and run again.
-- This initializes a database; it does not copy your existing PGlite data.
-- After setup, configure DATABASE_URL in .env and restart the API.
-- Optional development people/events/chats: npm.cmd run db:seed.
-- Regenerate after adding migrations: node scripts/export-sql.mjs

BEGIN;
SET LOCAL search_path = public;

-- Coordinate with the app's migration runner if the API is starting up.
SELECT pg_advisory_xact_lock(714723);

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

DO $gora_setup$
BEGIN
${sections.join('\n\n')}
END;
$gora_setup$;

-- Baseline sports. Never insert demo users or shared login passwords in SQL.
${readFileSync(resolve(root, 'database/seeds/sports.sql'), 'utf8').trim()}

COMMIT;

-- Results: inspect these in pgAdmin's Data Output panel.
SELECT current_database() AS database_name, version AS migration, applied_at
FROM public.schema_migrations ORDER BY version;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT name, slug, icon FROM public.sports ORDER BY name;
`;

const destination = resolve(root, 'database/gora_setup.sql');
writeFileSync(destination, output, 'utf8');
console.log(`Created database/gora_setup.sql (${migrations.length} migrations + sports seed).`);
