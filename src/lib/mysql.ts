import mysql from 'mysql2/promise';

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bufas_cards',
  port: parseInt(process.env.DB_PORT || '3306'),
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
};

// Pool de conexiones para mejor rendimiento
let pool: mysql.Pool | null = null;

// Crear el pool de conexiones (lanzar error si falla para no usar datos mock)
pool = mysql.createPool(dbConfig);

export { pool };

// Función para ejecutar queries con manejo de errores
export async function executeQuery<T = any>(
  query: string,
  params?: any[]
): Promise<T[]> {
  if (!pool) throw new Error('MySQL pool not initialized');
  try {
    const [rows] = await pool.execute(query, params);
    return rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Función para obtener una sola fila
export async function executeQuerySingle<T = any>(
  query: string,
  params?: any[]
): Promise<T | null> {
  if (!pool) throw new Error('MySQL pool not initialized');
  try {
    const rows = await executeQuery<T>(query, params);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw error;
  }
}

// Función para transacciones
export async function executeTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  if (!pool) throw new Error('MySQL pool not initialized');
  let connection: mysql.PoolConnection | null = null;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
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