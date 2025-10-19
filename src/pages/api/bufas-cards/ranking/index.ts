import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/mysql';

// GET /api/bufas-cards/ranking
// Devuelve ranking de TODOS los usuarios con progreso por categoría y total BASE
export const GET: APIRoute = async ({ request }) => {
  try {
    // Ranking público (no requiere token)

    // Totales por categoría (por player_id único)
    const totals = await executeQuery<any>(
      `SELECT special_type, COUNT(DISTINCT player_id) AS total
       FROM cards
       GROUP BY special_type`
    );
    const totalBaseRow = totals.find((t: any) => t.special_type === 'Regular');
    const totalBase = Number(totalBaseRow?.total || 0);

    // Propiedad por usuario con recuentos condicionales por categoría
    const rows = await executeQuery<any>(
      `SELECT 
         u.id as user_id, u.username,
         COUNT(DISTINCT CASE WHEN c.special_type='Regular' THEN c.player_id END) AS base_owned,
         COUNT(DISTINCT CASE WHEN c.special_type='OLD_GENERATION' THEN c.player_id END) AS og_owned,
         COUNT(DISTINCT CASE WHEN c.special_type='TEAM_OF_THE_WEEK' THEN c.player_id END) AS totw_owned,
         COUNT(DISTINCT CASE WHEN c.special_type='RATING_RELOAD' THEN c.player_id END) AS rr_owned,
         COUNT(DISTINCT CASE WHEN c.special_type='MARKET_MASTER' THEN c.player_id END) AS mm_owned,
         COUNT(DISTINCT CASE WHEN c.special_type='ASSIST_ENGINE' THEN c.player_id END) AS ae_owned,
         COUNT(DISTINCT CASE WHEN c.special_type='COMEBACK_HERO' THEN c.player_id END) AS ch_owned,
         COUNT(DISTINCT CASE WHEN c.special_type='PLAYER_OF_THE_MONTH' THEN c.player_id END) AS potm_owned
       FROM users u
       LEFT JOIN user_cards uc ON uc.user_id = u.id
       LEFT JOIN cards c ON c.id = uc.card_id
       GROUP BY u.id, u.username
       ORDER BY base_owned DESC, u.username ASC`
    );

    const totalsByCode: Record<string, number> = {};
    const mapCode = (special: string): string => {
      switch (special) {
        case 'Regular': return 'BASE';
        case 'OLD_GENERATION': return 'OG';
        case 'TEAM_OF_THE_WEEK': return 'TOTW';
        case 'RATING_RELOAD': return 'RR';
        case 'MARKET_MASTER': return 'MM';
        case 'ASSIST_ENGINE': return 'AE';
        case 'COMEBACK_HERO': return 'CH';
        case 'PLAYER_OF_THE_MONTH': return 'POTM';
        default: return special;
      }
    };
    for (const t of totals) totalsByCode[mapCode(t.special_type)] = Number(t.total || 0);
    const orderCodes = ['BASE','OG','TOTW','RR','MM','AE','CH','POTM'];
    const totalAll = orderCodes.reduce((acc, code) => acc + (totalsByCode[code] || 0), 0);

    let users = rows.map((r: any) => {
      const byCode = {
        BASE: Number(r.base_owned || 0),
        OG: Number(r.og_owned || 0),
        TOTW: Number(r.totw_owned || 0),
        RR: Number(r.rr_owned || 0),
        MM: Number(r.mm_owned || 0),
        AE: Number(r.ae_owned || 0),
        CH: Number(r.ch_owned || 0),
        POTM: Number(r.potm_owned || 0),
      };
      const totalOwned = orderCodes.reduce((acc, code) => acc + (byCode as any)[code], 0);
      return {
        userId: r.user_id,
        username: r.username,
        baseOwned: Number(r.base_owned || 0),
        totalOwned,
        byCode,
      };
    });

    // Ordenar por totalOwned desc, luego username
    users.sort((a: any, b: any) => (b.totalOwned - a.totalOwned) || a.username.localeCompare(b.username));

    return new Response(JSON.stringify({ success: true, totals: { totalAll, byCode: totalsByCode }, users }), { status: 200 });
  } catch (e) {
    console.error('Ranking API error:', e);
    return new Response(JSON.stringify({ success: false, error: String((e as any)?.message || e) }), { status: 500 });
  }
};
