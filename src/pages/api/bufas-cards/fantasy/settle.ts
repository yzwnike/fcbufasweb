import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuerySingle, executeTransaction } from '@/lib/mysql';
import { ECONOMY_CONFIG } from '@/lib/economy';

// POST /api/bufas-cards/fantasy/settle
// Body opcional: { jornada?: number }
// Liquida (idempotente) la selección del usuario para la jornada indicada
export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    }
    const userId = auth.id;

    const body = await request.json().catch(() => ({}));
    let { jornada } = body || {};
    if (typeof jornada !== 'number') {
      const row = await executeQuerySingle<any>('SELECT current_jornada FROM fantasy_current_jornada ORDER BY id DESC LIMIT 1');
      if (!row || row.current_jornada === null) {
        return new Response(JSON.stringify({ success: false, error: 'No hay jornada actual' }), { status: 400 });
      }
      jornada = Number(row.current_jornada) - 1;
    }
    if (jornada < 0) {
      return new Response(JSON.stringify({ success: false, error: 'Jornada inválida' }), { status: 400 });
    }

    const fr = await executeQuerySingle<any>(
      'SELECT id, forward_player_id, midfielder_player_id, defender_player_id, coins_earned FROM fantasy_rush WHERE user_id = ? AND jornada = ? LIMIT 1',
      [userId, jornada]
    );
    if (!fr) {
      return new Response(JSON.stringify({ success: false, error: 'Sin selección para esa jornada' }), { status: 404 });
    }

    // Si ya está liquidado, devolver info
    if ((Number(fr.coins_earned) || 0) > 0) {
      return new Response(JSON.stringify({ success: true, settled: true, points: null, coins: Number(fr.coins_earned) }), { status: 200 });
    }

    // Calcular puntos y liquidar
    const ptsRow = await executeQuerySingle<any>(
      `SELECT 
         COALESCE(p1.fantasy_points,0)+COALESCE(p2.fantasy_points,0)+COALESCE(p3.fantasy_points,0) AS pts
       FROM players p1, players p2, players p3
       WHERE p1.id = ? AND p2.id = ? AND p3.id = ?`,
      [fr.forward_player_id, fr.midfielder_player_id, fr.defender_player_id]
    );
    const pts = Number(ptsRow?.pts || 0);
    const coins = pts * ECONOMY_CONFIG.FANTASY.POINTS_MULTIPLIER;

    await executeTransaction(async (conn) => {
      await conn.execute('UPDATE fantasy_rush SET total_points = ?, coins_earned = ? WHERE id = ?', [pts, coins, fr.id]);
      if (coins > 0) {
        await conn.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [coins, userId]);
        await conn.execute(
          'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
          [userId, coins, 'FANTASY_RUSH', `Liquidación Fantasy jornada ${jornada}: ${pts} pts`]
        );
      }
    });

    return new Response(JSON.stringify({ success: true, settled: true, points: pts, coins }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};
