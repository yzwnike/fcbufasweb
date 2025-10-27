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
    // Verificar autenticación
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return new Response(
        JSON.stringify({ 
          error: 'No autenticado',
          results: [],
          totalVotes: 0
        }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Obtener votos del mes actual
    const result = await pool.query(
      `SELECT first_place, second_place, third_place, fourth_place 
       FROM potm_votes 
       WHERE voted_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)`
    );

    const votes = result.rows;

    // Calcular puntos (1º=4pts, 2º=3pts, 3º=2pts, 4º=1pt)
    const points: Record<string, number> = {
      marcos: 0,
      mario: 0,
      mister: 0,
      nicou: 0
    };

    const voteCounts: Record<string, { first: number; second: number; third: number; fourth: number }> = {
      marcos: { first: 0, second: 0, third: 0, fourth: 0 },
      mario: { first: 0, second: 0, third: 0, fourth: 0 },
      mister: { first: 0, second: 0, third: 0, fourth: 0 },
      nicou: { first: 0, second: 0, third: 0, fourth: 0 }
    };

    votes.forEach((vote) => {
      // Contar posiciones
      if (vote.first_place) {
        points[vote.first_place] += 4;
        voteCounts[vote.first_place].first++;
      }
      if (vote.second_place) {
        points[vote.second_place] += 3;
        voteCounts[vote.second_place].second++;
      }
      if (vote.third_place) {
        points[vote.third_place] += 2;
        voteCounts[vote.third_place].third++;
      }
      if (vote.fourth_place) {
        points[vote.fourth_place] += 1;
        voteCounts[vote.fourth_place].fourth++;
      }
    });

    // Crear array de resultados ordenado
    const results = Object.entries(points).map(([playerId, totalPoints]) => ({
      playerId,
      playerName: getPlayerName(playerId),
      totalPoints,
      votes: voteCounts[playerId],
      totalVotes: Object.values(voteCounts[playerId]).reduce((a, b) => a + b, 0)
    })).sort((a, b) => b.totalPoints - a.totalPoints);

    return new Response(
      JSON.stringify({ 
        results,
        totalVotes: votes.length 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error getting results:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error al obtener los resultados',
        results: [],
        totalVotes: 0
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

function getPlayerName(playerId: string): string {
  const names: Record<string, string> = {
    marcos: 'Marcos',
    mario: 'Mario',
    mister: 'Míster',
    nicou: 'Nico Uriburu'
  };
  return names[playerId] || playerId;
}
