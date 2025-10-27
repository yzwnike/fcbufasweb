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

export const POST: APIRoute = async ({ request }) => {
  try {
    // Verificar autenticación
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No autenticado' 
        }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    const body = await request.json();
    const { votes } = body;

    if (!votes || votes.length !== 4) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Debes votar por los 4 jugadores' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verificar si ya votó este mes
    const checkVote = await pool.query(
      `SELECT id FROM potm_votes 
       WHERE user_id = $1 
       AND voted_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
       LIMIT 1`,
      [authUser.id]
    );

    if (checkVote.rows.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Ya has votado este mes' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Preparar datos para insertar
    const voteData = {
      first_place: '',
      second_place: '',
      third_place: '',
      fourth_place: ''
    };

    votes.forEach((vote: any) => {
      switch (vote.position) {
        case 1:
          voteData.first_place = vote.playerId;
          break;
        case 2:
          voteData.second_place = vote.playerId;
          break;
        case 3:
          voteData.third_place = vote.playerId;
          break;
        case 4:
          voteData.fourth_place = vote.playerId;
          break;
      }
    });

    // Insertar voto
    await pool.query(
      `INSERT INTO potm_votes (user_id, first_place, second_place, third_place, fourth_place, voted_at) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [authUser.id, voteData.first_place, voteData.second_place, voteData.third_place, voteData.fourth_place]
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '¡Voto registrado exitosamente!' 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error saving vote:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error al guardar el voto' 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};
