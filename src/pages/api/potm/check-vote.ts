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
    
    // Verificar si ya votó este mes
    const result = await pool.query(
      `SELECT id FROM potm_votes 
       WHERE user_id = $1 
       AND voted_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
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
