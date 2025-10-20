import 'dotenv/config';
import { Pool } from 'pg';

// Cargar variables de entorno desde process.env o import.meta.env (Astro/Vite)
const ENV_PROC: Record<string, any> = typeof process !== 'undefined' ? (process.env as any) : {};
const ENV_VITE: Record<string, any> = (() => { try { return (import.meta as any)?.env ?? {}; } catch { return {}; } })();
function envGet(key: string, def?: string) {
  return (ENV_PROC?.[key] ?? ENV_VITE?.[key] ?? def) as string | undefined;
}

// Preferir conexión a PostgreSQL (Supabase)
const PGHOST = envGet('PGHOST') || envGet('SUPABASE_HOST');
const PGPORT = Number(envGet('PGPORT', '6543')); // Puerto para Supabase pooled
const PGUSER = envGet('PGUSER') || envGet('SUPABASE_USER') || 'postgres';
const PGPASSWORD = envGet('PGPASSWORD') || envGet('SUPABASE_PASSWORD') || '';
const PGDATABASE = envGet('PGDATABASE') || envGet('SUPABASE_DB') || 'postgres';

const pool = new Pool({
  host: PGHOST,
  port: PGPORT,
  user: PGUSER,
  password: PGPASSWORD,
  database: PGDATABASE,
  max: 10,
  ssl: { rejectUnauthorized: false }, // Supabase requiere SSL
  // Configuración para Supabase pooled
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  query_timeout: 60000,
});

export function currentPgConfig() {
  return {
    host: PGHOST,
    port: PGPORT,
    user: PGUSER,
    database: PGDATABASE,
    hasPassword: Boolean(PGPASSWORD),
  };
}

export { pool };

// Util: transformar sintaxis MySQL -> Postgres de forma básica
function transformSql(sql: string): string {
  let q = sql;
  // RAND() -> RANDOM()
  q = q.replace(/\bRAND\(\)/gi, 'RANDOM()');
  // DATE_SUB(NOW(), INTERVAL 7 DAY) -> NOW() - INTERVAL '7 days'
  q = q.replace(/DATE_SUB\(NOW\(\),\s*INTERVAL\s+7\s+DAY\)/gi, "NOW() - INTERVAL '7 days'");
  return q;
}

// Sustituir ? por $1, $2, ...
function toPgParams(sql: string): { text: string; values: any[] } {
  let idx = 0;
  const values: any[] = [];
  const text = sql.replace(/\?/g, () => {
    idx += 1;
    return `$${idx}`;
  });
  return { text, values };
}

async function pgExecute<T = any>(query: string, params?: any[]): Promise<T[]> {
  const text = transformSql(query);
  const { text: pgText } = toPgParams(text);
  
  // Log de debug para identificar query problemática
  console.log('Ejecutando query:', { query: query.substring(0, 100), params });
  
  // Para serverless, usar timeout más corto
  const client = await pool.connect();
  try {
    const res = await client.query(pgText, params || []);
    console.log('Query exitosa:', { rowCount: res.rowCount });
    return res.rows as T[];
  } catch (error) {
    console.error('Query fallida:', { 
      query: query.substring(0, 100), 
      params, 
      error: error.message,
      pgText: pgText.substring(0, 100)
    });
    throw error;
  } finally {
    client.release();
  }
}

// Exponer API compatible
export async function executeQuery<T = any>(
  query: string,
  params?: any[]
): Promise<T[]> {
  try {
    return await pgExecute<T>(query, params);
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function executeQuerySingle<T = any>(
  query: string,
  params?: any[]
): Promise<T | null> {
  const rows = await executeQuery<T>(query, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function executeTransaction<T>(
  callback: (connection: { execute: (q: string, p?: any[]) => Promise<[any, any]> }) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const wrapper = {
      async execute(q: string, p?: any[]): Promise<[any, any]> {
        // Log de debug para transacciones
        console.log('Transaction query:', { query: q.substring(0, 100), params: p });
        
        try {
          // Detectar INSERT y devolver insertId al estilo mysql2
          const isInsert = /^\s*insert\s+into\s+/i.test(q);
          let text = transformSql(q);
          if (isInsert && !/returning\s+/i.test(text)) {
            text = `${text} RETURNING id`;
          }
          const { text: pgText } = toPgParams(text);
          const res = await client.query(pgText, p || []);
          
          console.log('Transaction query exitosa:', { rowCount: res.rowCount });
          
          if (isInsert) {
            const insertId = res.rows?.[0]?.id ?? null;
            return [{ insertId, rowCount: res.rowCount }, null];
          }
          // Imitar mysql2: [rows, fields]
          return [res.rows, null];
        } catch (error) {
          console.error('Transaction query fallida:', {
            query: q.substring(0, 100),
            params: p,
            error: error.message
          });
          throw error;
        }
      },
    };
    const result = await callback(wrapper);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Tipos para las tablas principales
export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  coins: number;
  last_daily_quiz: string | null;
  daily_quiz_streak: number;
  total_cards_opened: number;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: number;
  name: string;
  team: string;
  position1: string;
  position2: string | null;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  fifa_rating: number;
  market_value: number;
  fantasy_points: number;
  image_url: string;
  created_at: string;
}

export interface Card {
  id: number;
  player_id: number;
  rarity: 'Bronze' | 'Silver' | 'Gold' | 'Elite' | 'Legend';
  special_type: 'Regular' | 'PLAYER_OF_THE_MONTH' | 'RATING_RELOAD' | 'ASSIST_ENGINE' | 'MARKET_MASTER' | 'COMEBACK_HERO' | 'TEAM_OF_THE_WEEK' | 'OLD_GENERATION';
  special_month: string | null;
  base_price: number;
  image_path?: string | null;
  created_at: string;
}

export interface UserCard {
  id: number;
  user_id: number;
  card_id: number;
  obtained_at: string;
  is_for_sale: boolean;
  sale_price: number | null;
}

export interface Pack {
  id: number;
  user_id: number;
  type: 'FREE_DAILY' | 'PREMIUM' | 'SPECIAL';
  cost: number;
  opened: boolean;
  next_free_pack: string | null;
  created_at: string;
  opened_at: string | null;
}

export interface DailyQuizQuestion {
  id: number;
  date: string;
  question_number: number;
  player_id: number;
  stat_name: string;
  correct_answer: number;
  option_a: number;
  option_b: number;
  option_c: number;
  created_at: string;
}

export interface DailyQuizAnswer {
  id: number;
  user_id: number;
  question_id: number;
  selected_answer: number;
  is_correct: boolean;
  coins_earned: number;
  answered_at: string;
}

export interface FantasyRush {
  id: number;
  user_id: number;
  week_start: string;
  jornada?: number | null;
  forward_player_id: number;
  midfielder_player_id: number;
  defender_player_id: number;
  total_points: number;
  coins_earned: number;
  created_at: string;
}

export interface CardTrade {
  id: number;
  seller_id: number;
  buyer_id: number | null;
  user_card_id: number;
  price: number;
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED';
  created_at: string;
  completed_at: string | null;
}

export interface CoinTransaction {
  id: number;
  user_id: number;
  amount: number;
  type: 'DAILY_QUIZ' | 'FANTASY_RUSH' | 'PACK_PURCHASE' | 'PACK_SPEEDUP' | 'CARD_SALE' | 'CARD_PURCHASE' | 'INITIAL_BONUS' | 'ADMIN_GRANT' | 'ADMIN_DEDUCT';
  description: string;
  created_at: string;
}

// SBC Types
export interface SbcChallenge {
  id: number;
  code: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  requirements: any;
  created_at: string;
}

export interface SbcReward {
  id: number;
  challenge_id: number;
  reward_type: 'PACK' | 'CARD';
  pack_type?: 'FREE_DAILY' | 'PREMIUM' | 'SPECIAL' | null;
  card_id?: number | null;
  amount: number;
  // Optional preview fields for UI convenience
  card_image_path?: string | null;
  player_name?: string | null;
}

export interface SbcSubmission {
  id: number;
  challenge_id: number;
  user_id: number;
  submitted_at: string;
}

// Utilidades para validación
export function isValidRarity(rarity: string): rarity is Card['rarity'] {
  return ['Bronze', 'Silver', 'Gold', 'Elite', 'Legend'].includes(rarity);
}

export function isValidSpecialType(type: string): type is Card['special_type'] {
  return ['Regular', 'PLAYER_OF_THE_MONTH', 'RATING_RELOAD', 'ASSIST_ENGINE', 'MARKET_MASTER', 'COMEBACK_HERO'].includes(type);
}

export function isValidPosition(position: string): boolean {
  return ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'].includes(position);
}
