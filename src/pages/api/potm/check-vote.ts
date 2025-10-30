import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: import.meta.env.PGHOST,
  port: parseInt(import.meta.env.PGPORT || '5432'),
  user: import.meta.env.PGUSER,
  password: import.meta.env.PGPASSWORD,
  database: import.meta.env.PGDATABASE,
});

export const GET: APIRoute = async ({ request }) => {
  try {
    // Obtener usuario autenticado
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return new Response(
        JSON.stringify({ hasVoted: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Asegurar columna user_id y restricción única
    try {
      await pool.query(`ALTER TABLE potm_votes ADD COLUMN IF NOT EXISTS user_id BIGINT`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS potm_votes_user_id_uniq ON potm_votes(user_id)`);
    } catch (e) {
      // ignore if fails
    }

    // Verificar si ya votó alguna vez (una sola vez para siempre)
    const result = await pool.query(
      `SELECT id FROM potm_votes 
       WHERE user_id = $1 
       LIMIT 1`,
      [authUser.id]
    );

    return new Response(
      JSON.stringify({ 
        hasVoted: result.rows.length > 0 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error checking vote status:', error);
    return new Response(
      JSON.stringify({ 
        hasVoted: false,
        error: 'Error al verificar el estado del voto' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
