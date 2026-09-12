/**
 * Selects the Prisma datasource provider from the environment.
 *
 * Prisma requires a literal provider in schema.prisma — `env()` is not allowed
 * there — but this project runs on SQLite locally (zero setup) and PostgreSQL
 * in production. Rather than keeping two schema files that drift apart, this
 * script rewrites the single provider line before any prisma command runs.
 *
 * Usage: DATABASE_PROVIDER=postgresql node scripts/db-provider.mjs
 * Default is sqlite, so local development needs no environment variable.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPPORTED = ['sqlite', 'postgresql'];

const provider = (process.env.DATABASE_PROVIDER ?? 'sqlite').trim();

if (!SUPPORTED.includes(provider)) {
  console.error(
    `✗ DATABASE_PROVIDER="${provider}" is not supported. Use one of: ${SUPPORTED.join(', ')}`,
  );
  process.exit(1);
}

const schemaPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'prisma', 'schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

// Only the provider inside the `datasource` block may change; the generator
// block has a provider line of its own that must be left alone.
const datasourceBlock = /(datasource\s+db\s*\{[^}]*?provider\s*=\s*")([^"]+)(")/;
const match = schema.match(datasourceBlock);

if (!match) {
  console.error('✗ Could not find the datasource provider in prisma/schema.prisma');
  process.exit(1);
}

if (match[2] === provider) {
  console.log(`• Prisma datasource already set to "${provider}"`);
  process.exit(0);
}

writeFileSync(schemaPath, schema.replace(datasourceBlock, `$1${provider}$3`), 'utf8');
console.log(`✓ Prisma datasource switched from "${match[2]}" to "${provider}"`);
