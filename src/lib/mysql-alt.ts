import 'dotenv/config';
import { Pool } from 'pg';

// Usar connection string para Supabase pooled
const DATABASE_URL = process.env.DATABASE_URL;

// Fallback a variables individuales si no hay connection string
const PGHOST = process.env.PGHOST || process.env.SUPABASE_HOST;
const PGPORT = Number(process.env.PGPORT || '6543');
const PGUSER = process.env.PGUSER || process.env.SUPABASE_USER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD || process.env.SUPABASE_PASSWORD;
const PGDATABASE = process.env.PGDATABASE || process.env.SUPABASE_DB || 'postgres';

// Configuración optimizada para Supabase pooled en Vercel
const poolConfig = DATABASE_URL 
  ? {
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5, // Reducido para serverless
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    }
  : {
      host: PGHOST,
      port: PGPORT,
      user: PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    };

const pool = new Pool(poolConfig);

export { pool };