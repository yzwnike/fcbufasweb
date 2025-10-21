import type { APIRoute } from 'astro';
import { executeQuery } from '@/lib/mysql';

export const runtime = 'node';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const playerName = url.searchParams.get('name') || 'Marcos';
    
    // Buscar jugador por nombre
    const players = await executeQuery(
      'SELECT * FROM players WHERE name ILIKE ?',
      [`%${playerName}%`]
    );

    // Buscar cartas de ese jugador
    const cards = await executeQuery(`
      SELECT c.*, p.name as player_name,
        LEAST(99, COALESCE(c.fifa_rating_override, p.fifa_rating + CASE c.special_type
          WHEN 'TEAM_OF_THE_WEEK' THEN 2
          WHEN 'PLAYER_OF_THE_MONTH' THEN 4
          WHEN 'RATING_RELOAD' THEN 2
          WHEN 'ASSIST_ENGINE' THEN 2
          WHEN 'MARKET_MASTER' THEN 2
          WHEN 'COMEBACK_HERO' THEN 3
          ELSE 0 END)) AS effective_fifa_rating
      FROM cards c
      JOIN players p ON c.player_id = p.id
      WHERE p.name ILIKE ?
      ORDER BY effective_fifa_rating DESC
    `, [`%${playerName}%`]);

    return new Response(JSON.stringify({
      success: true,
      players,
      cards,
      searchTerm: playerName
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Debug player API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};