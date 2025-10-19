import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import { createFantasySelection, updateFantasySelection, getUserFantasySelection } from '@/lib/fantasy';
import { executeQuerySingle } from '@/lib/mysql';

export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Token requerido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = decoded.userId;
    
    // Jornada vigente (si existe)
    const currentRow = await executeQuerySingle<any>(
      'SELECT current_jornada FROM fantasy_current_jornada ORDER BY id DESC LIMIT 1'
    );
    const currentJornada = currentRow?.current_jornada || null;
    let kickoff: string | null = null;
    let blocked = false;
    if (currentJornada !== null) {
      const k = await executeQuerySingle<any>('SELECT kickoff FROM fantasy_jornadas WHERE jornada = ?', [currentJornada]);
      kickoff = k?.kickoff || null;
      // Bloqueado si ahora >= kickoff
      if (kickoff) {
        // Let MySQL decide in POST/PUT; here provide info only
        blocked = false;
      }
    }

    // Obtener la selección actual por jornada vigente (prioritario)
    let selection = null as any;
    if (currentJornada !== null) {
      const row = await executeQuerySingle<any>(
        `SELECT 
           fr.*,
           -- forward fields
           p1.id AS f_id, p1.name AS f_name, p1.team AS f_team, p1.position1 AS f_pos1, p1.position2 AS f_pos2,
           p1.pace AS f_pace, p1.shooting AS f_shooting, p1.passing AS f_passing, p1.defending AS f_defending, p1.physical AS f_physical,
           p1.fifa_rating AS f_fifa_rating, p1.market_value AS f_market_value, p1.fantasy_points AS f_fantasy_points, p1.image_url AS f_image_url, p1.created_at AS f_created_at,
           -- midfielder fields
           p2.id AS m_id, p2.name AS m_name, p2.team AS m_team, p2.position1 AS m_pos1, p2.position2 AS m_pos2,
           p2.pace AS m_pace, p2.shooting AS m_shooting, p2.passing AS m_passing, p2.defending AS m_defending, p2.physical AS m_physical,
           p2.fifa_rating AS m_fifa_rating, p2.market_value AS m_market_value, p2.fantasy_points AS m_fantasy_points, p2.image_url AS m_image_url, p2.created_at AS m_created_at,
           -- defender fields
           p3.id AS d_id, p3.name AS d_name, p3.team AS d_team, p3.position1 AS d_pos1, p3.position2 AS d_pos2,
           p3.pace AS d_pace, p3.shooting AS d_shooting, p3.passing AS d_passing, p3.defending AS d_defending, p3.physical AS d_physical,
           p3.fifa_rating AS d_fifa_rating, p3.market_value AS d_market_value, p3.fantasy_points AS d_fantasy_points, p3.image_url AS d_image_url, p3.created_at AS d_created_at,
           -- card images
          (
            SELECT c.image_path FROM user_cards uc 
            JOIN cards c ON uc.card_id = c.id 
            WHERE uc.user_id = ? AND c.player_id = p1.id 
            ORDER BY 
              CASE c.special_type 
                WHEN 'PLAYER_OF_THE_MONTH' THEN 6 
                WHEN 'TEAM_OF_THE_WEEK' THEN 5 
                WHEN 'COMEBACK_HERO' THEN 4 
                WHEN 'MARKET_MASTER' THEN 3 
                WHEN 'ASSIST_ENGINE' THEN 3 
                WHEN 'RATING_RELOAD' THEN 3 
                WHEN 'OLD_GENERATION' THEN 2 
                ELSE 1 
              END DESC,
              LEAST(99, COALESCE(c.fifa_rating_override, p1.fifa_rating + CASE c.special_type
                WHEN 'TEAM_OF_THE_WEEK' THEN 2
                WHEN 'PLAYER_OF_THE_MONTH' THEN 4
                WHEN 'RATING_RELOAD' THEN 2
                WHEN 'ASSIST_ENGINE' THEN 2
                WHEN 'MARKET_MASTER' THEN 2
                WHEN 'COMEBACK_HERO' THEN 3
                ELSE 0 END)) DESC
            LIMIT 1
          ) AS f_image_path,
          (
            SELECT c.image_path FROM user_cards uc 
            JOIN cards c ON uc.card_id = c.id 
            WHERE uc.user_id = ? AND c.player_id = p2.id 
            ORDER BY 
              CASE c.special_type 
                WHEN 'PLAYER_OF_THE_MONTH' THEN 6 
                WHEN 'TEAM_OF_THE_WEEK' THEN 5 
                WHEN 'COMEBACK_HERO' THEN 4 
                WHEN 'MARKET_MASTER' THEN 3 
                WHEN 'ASSIST_ENGINE' THEN 3 
                WHEN 'RATING_RELOAD' THEN 3 
                WHEN 'OLD_GENERATION' THEN 2 
                ELSE 1 
              END DESC,
              LEAST(99, COALESCE(c.fifa_rating_override, p2.fifa_rating + CASE c.special_type
                WHEN 'TEAM_OF_THE_WEEK' THEN 2
                WHEN 'PLAYER_OF_THE_MONTH' THEN 4
                WHEN 'RATING_RELOAD' THEN 2
                WHEN 'ASSIST_ENGINE' THEN 2
                WHEN 'MARKET_MASTER' THEN 2
                WHEN 'COMEBACK_HERO' THEN 3
                ELSE 0 END)) DESC
            LIMIT 1
          ) AS m_image_path,
          (
            SELECT c.image_path FROM user_cards uc 
            JOIN cards c ON uc.card_id = c.id 
            WHERE uc.user_id = ? AND c.player_id = p3.id 
            ORDER BY 
              CASE c.special_type 
                WHEN 'PLAYER_OF_THE_MONTH' THEN 6 
                WHEN 'TEAM_OF_THE_WEEK' THEN 5 
                WHEN 'COMEBACK_HERO' THEN 4 
                WHEN 'MARKET_MASTER' THEN 3 
                WHEN 'ASSIST_ENGINE' THEN 3 
                WHEN 'RATING_RELOAD' THEN 3 
                WHEN 'OLD_GENERATION' THEN 2 
                ELSE 1 
              END DESC,
              LEAST(99, COALESCE(c.fifa_rating_override, p3.fifa_rating + CASE c.special_type
                WHEN 'TEAM_OF_THE_WEEK' THEN 2
                WHEN 'PLAYER_OF_THE_MONTH' THEN 4
                WHEN 'RATING_RELOAD' THEN 2
                WHEN 'ASSIST_ENGINE' THEN 2
                WHEN 'MARKET_MASTER' THEN 2
                WHEN 'COMEBACK_HERO' THEN 3
                ELSE 0 END)) DESC
            LIMIT 1
          ) AS d_image_path
         FROM fantasy_rush fr
         JOIN players p1 ON fr.forward_player_id = p1.id
         JOIN players p2 ON fr.midfielder_player_id = p2.id
         JOIN players p3 ON fr.defender_player_id = p3.id
         WHERE fr.user_id = ? AND fr.jornada = ?
         LIMIT 1`,
        [userId, userId, userId, userId, currentJornada]
      );
      if (row) {
        selection = {
          id: row.id,
          user_id: row.user_id,
          week_start: row.week_start,
          jornada: row.jornada,
          forward_player_id: row.forward_player_id,
          midfielder_player_id: row.midfielder_player_id,
          defender_player_id: row.defender_player_id,
          total_points: row.total_points,
          coins_earned: row.coins_earned,
          created_at: row.created_at,
          forward_card_image_path: row.f_image_path || null,
          midfielder_card_image_path: row.m_image_path || null,
          defender_card_image_path: row.d_image_path || null,
          forward_player: {
            id: row.f_id,
            name: row.f_name,
            team: row.f_team,
            position1: row.f_pos1,
            position2: row.f_pos2,
            pace: row.f_pace,
            shooting: row.f_shooting,
            passing: row.f_passing,
            defending: row.f_defending,
            physical: row.f_physical,
            fifa_rating: row.f_fifa_rating,
            market_value: row.f_market_value,
            fantasy_points: row.f_fantasy_points,
            image_url: row.f_image_url,
            created_at: row.f_created_at,
          },
          midfielder_player: {
            id: row.m_id,
            name: row.m_name,
            team: row.m_team,
            position1: row.m_pos1,
            position2: row.m_pos2,
            pace: row.m_pace,
            shooting: row.m_shooting,
            passing: row.m_passing,
            defending: row.m_defending,
            physical: row.m_physical,
            fifa_rating: row.m_fifa_rating,
            market_value: row.m_market_value,
            fantasy_points: row.m_fantasy_points,
            image_url: row.m_image_url,
            created_at: row.m_created_at,
          },
          defender_player: {
            id: row.d_id,
            name: row.d_name,
            team: row.d_team,
            position1: row.d_pos1,
            position2: row.d_pos2,
            pace: row.d_pace,
            shooting: row.d_shooting,
            passing: row.d_passing,
            defending: row.d_defending,
            physical: row.d_physical,
            fifa_rating: row.d_fifa_rating,
            market_value: row.d_market_value,
            fantasy_points: row.d_fantasy_points,
            image_url: row.d_image_url,
            created_at: row.d_created_at,
          },
        };
      }
    }

    // Si no hay selección para la jornada vigente, usa el fallback semanal existente
    if (!selection) {
      selection = await getUserFantasySelection(userId);
    }

    // Calcular jugadores en descanso (usados en jornada anterior)
    let restPlayerIds: number[] = [];
    if (currentJornada !== null) {
      const prev = await executeQuerySingle<any>(
        'SELECT forward_player_id, midfielder_player_id, defender_player_id FROM fantasy_rush WHERE user_id = ? AND jornada = ? LIMIT 1',
        [userId, currentJornada - 1]
      );
      if (prev) {
        restPlayerIds = [prev.forward_player_id, prev.midfielder_player_id, prev.defender_player_id].filter(Boolean);
      }
    }

    // Calcular resumen para popup de liquidación:
    // 1) Prioriza la selección de la jornada inmediatamente anterior (currentJornada - 1), exista o no liquidación.
    // 2) Si no existe, busca la última selección NO liquidada (coins_earned=0) anterior a la jornada actual.
    // 3) Si no hay jornada actual, busca la última no liquidada en general.
    let prevFantasyRushId: number | null = null;
    let prevPoints: number | null = null;
    let prevCoins: number | null = null;
    let prevSettled: boolean = false;
    if (currentJornada !== null && currentJornada > 0) {
      const prevJ = currentJornada - 1;
      const frPrev = await executeQuerySingle<any>(
        'SELECT id, forward_player_id, midfielder_player_id, defender_player_id, coins_earned FROM fantasy_rush WHERE user_id = ? AND jornada = ? LIMIT 1',
        [userId, prevJ]
      );
      if (frPrev) {
        prevFantasyRushId = frPrev.id;
        prevSettled = (Number(frPrev.coins_earned) || 0) > 0;
        const pts = await executeQuerySingle<any>(
          `SELECT 
             COALESCE(p1.fantasy_points,0)+COALESCE(p2.fantasy_points,0)+COALESCE(p3.fantasy_points,0) AS pts
           FROM players p1, players p2, players p3
           WHERE p1.id = ? AND p2.id = ? AND p3.id = ?`,
          [frPrev.forward_player_id, frPrev.midfielder_player_id, frPrev.defender_player_id]
        );
        prevPoints = Number(pts?.pts || 0);
        prevCoins = prevPoints * 20; // mismo multiplicador que backend
      }
    }

    return new Response(JSON.stringify({
      success: true,
      selection,
      currentJornada,
      kickoff,
      blocked,
      restPlayerIds,
      prev: { prevFantasyRushId, prevPoints, prevCoins, prevSettled }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fantasy selection GET API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Token requerido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { forwardPlayerId, midfielderPlayerId, defenderPlayerId, jornada } = body;

    // Jornada vigente desde BD (ignora body si no coincide)
    const currentRow = await executeQuerySingle<any>(
      'SELECT current_jornada FROM fantasy_current_jornada ORDER BY id DESC LIMIT 1'
    );
    const currentJornada = currentRow?.current_jornada ?? jornada ?? null;
    // Kickoff lock disabled (previously: blocked if NOW() >= kickoff)
    // Intentionally no-op to allow selection at any time.

    // Validar datos de entrada
    if (!forwardPlayerId || !midfielderPlayerId || !defenderPlayerId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Se requieren forwardPlayerId, midfielderPlayerId y defenderPlayerId' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = decoded.userId;

    // Crear nueva selección
    const result = await createFantasySelection(userId, {
      forwardPlayerId,
      midfielderPlayerId,
      defenderPlayerId
    }, undefined, (typeof currentJornada === 'number' ? currentJornada : (typeof jornada === 'number' ? jornada : undefined)));

    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error || 'Validación fallida'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      fantasyRushId: result.fantasyRushId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fantasy selection POST API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: String((error as any)?.message || error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Token requerido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { fantasyRushId, forwardPlayerId, midfielderPlayerId, defenderPlayerId } = body;

    // Kickoff lock disabled for updates as well (previously blocked after kickoff)
    // Intentionally no-op.

    // Validar datos de entrada
    if (!fantasyRushId || !forwardPlayerId || !midfielderPlayerId || !defenderPlayerId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Se requieren fantasyRushId, forwardPlayerId, midfielderPlayerId y defenderPlayerId' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = decoded.userId;

    // Actualizar selección existente
    const result = await updateFantasySelection(userId, fantasyRushId, {
      forwardPlayerId,
      midfielderPlayerId,
      defenderPlayerId
    });

    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fantasy selection PUT API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};