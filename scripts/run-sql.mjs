import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

// Best-effort load of dotenv if present
try {
  const { default: dotenv } = await import('dotenv');
  if (dotenv?.config) dotenv.config();
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: node scripts/run-sql.mjs <path-to-sql-file>');
    process.exit(1);
  }
  const sqlPath = resolve(process.cwd(), fileArg);
  let raw = readFileSync(sqlPath, 'utf8');
  // Strip line comments and block comments for safer splitting
  raw = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*--.*$/gm, '');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'bufas_cards',
    multipleStatements: true,
    charset: 'utf8mb4'
  };

  let conn;
  try {
    console.log('Connecting to MySQL at', config.host + ':' + config.port);
    conn = await mysql.createConnection(config);

    // Split on semicolons; simple but OK for our migrations
    const queries = raw
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0)
      .filter(q => q.toUpperCase() !== 'USE BUFAS_CARDS');

    console.log('Executing', queries.length, 'statements from', sqlPath);

    for (const q of queries) {
      try {
        await conn.execute(q);
        console.log('✔', q.substring(0, 80).replace(/\s+/g, ' ') + (q.length > 80 ? '…' : ''));
      } catch (err) {
        console.warn('⚠', (q.substring(0, 80) + (q.length > 80 ? '…' : '')));
        console.warn('  →', err.message);
      }
    }

    console.log('Done.');
  } catch (e) {
    console.error('Failed to run SQL:', e.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
