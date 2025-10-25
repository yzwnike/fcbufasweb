import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/mysql';

// GET /api/bufas-cards/ranking
// Devuelve ranking de TODOS los usuarios con progreso por categoría y total
export const GET: APIRoute = async ({ request }) => {
  try {
    // Ranking público (no requiere token)

    // Totales por categoría (contando cartas diferentes disponibles en el juego)
    const totals = await executeQuery<any>(
      `SELECT special_type, COUNT(DISTINCT id) AS total
       FROM cards
       GROUP BY special_type`
    );

    // Propiedad por usuario: contar cuántas cartas únicas posee cada usuario
    // (sin duplicados, pero cada carta diferente cuenta una vez)
  const rows = await executeQuery<any>(
      `SELECT 
         u.id as user_id, u.username,
         COUNT(DISTINCT CASE WHEN c.special_type='Regular' THEN uc.card_id END) AS base_owned,
         COUNT(DISTINCT CASE WHEN c.special_type='OLD_GENERATION' THEN uc.card_id END) AS og_owned,
         COUNT(DISTINCT CASE WHEN c.special_type IN ('TEAM_OF_THE_WEEK','NOM_POTM') THEN uc.card_id END) AS especial_owned,
         COUNT(DISTINCT CASE WHEN c.special_type IN ('RATING_RELOAD','MARKET_MASTER','ASSIST_ENGINE','COMEBACK_HERO') THEN uc.card_id END) AS elite_owned,
         COUNT(DISTINCT CASE WHEN c.special_type='PLAYER_OF_THE_MONTH' THEN uc.card_id END) AS legendario_owned
       FROM users u
       LEFT JOIN user_cards uc ON uc.user_id = u.id
       LEFT JOIN cards c ON c.id = uc.card_id
       WHERE u.username <> 'BANCO_NACIONAL'
       GROUP BY u.id, u.username
       ORDER BY base_owned DESC, u.username ASC`
    );

    const totalsByCode: Record<string, number> = {};
    const mapCode = (special: string): string => {
      switch (special) {
        case 'Regular': return 'BASE';
        case 'OLD_GENERATION': return 'OG';
        case 'TEAM_OF_THE_WEEK':
        case 'NOM_POTM':  // Nominados a POTM también son especiales
          return 'ESPECIAL';
        case 'RATING_RELOAD':
        case 'MARKET_MASTER':
        case 'ASSIST_ENGINE':
        case 'COMEBACK_HERO':
          return 'ELITE';
        case 'PLAYER_OF_THE_MONTH': return 'LEGENDARIO';
        default: return special;
      }
    };
    
    // Agrupar totales por categoría
    for (const t of totals) {
      const code = mapCode(t.special_type);
      totalsByCode[code] = (totalsByCode[code] || 0) + Number(t.total || 0);
    }
    
    const orderCodes = ['TOTAL', 'BASE', 'OG', 'ESPECIAL', 'ELITE', 'LEGENDARIO'];
    const totalAll = Object.values(totalsByCode).reduce((acc, val) => acc + val, 0);
    totalsByCode['TOTAL'] = totalAll;

    let users = rows.map((r: any) => {
      const byCode = {
        BASE: Number(r.base_owned || 0),
        OG: Number(r.og_owned || 0),
        ESPECIAL: Number(r.especial_owned || 0),
        ELITE: Number(r.elite_owned || 0),
        LEGENDARIO: Number(r.legendario_owned || 0),
      };
      const totalOwned = byCode.BASE + byCode.OG + byCode.ESPECIAL + byCode.ELITE + byCode.LEGENDARIO;
      return {
        userId: r.user_id,
        username: r.username,
        totalOwned,
        byCode: { ...byCode, TOTAL: totalOwned },
      };
    });

    // Ordenar por totalOwned desc, luego username
    users.sort((a: any, b: any) => (b.totalOwned - a.totalOwned) || a.username.localeCompare(b.username));
    
    // Obtener cartas destacadas de todos los usuarios
    const userIds = users.map(u => u.userId);
    let featuredCardsMap: Record<number, any[]> = {};
    
    if (userIds.length > 0) {
      const featuredCards = await executeQuery<any>(
        `SELECT 
          ufc.user_id,
          ufc.position,
          c.image_path,
          p.name as player_name
        FROM user_featured_cards ufc
        JOIN user_cards uc ON ufc.user_card_id = uc.id
        JOIN cards c ON uc.card_id = c.id
        JOIN players p ON c.player_id = p.id
        WHERE ufc.user_id IN (${userIds.map(() => '?').join(',')})
        ORDER BY ufc.user_id, ufc.position ASC`,
        userIds as any
      );
      
      // Agrupar por user_id
      for (const fc of featuredCards) {
        if (!featuredCardsMap[fc.user_id]) {
          featuredCardsMap[fc.user_id] = [];
        }
        featuredCardsMap[fc.user_id].push({
          position: fc.position,
          image_path: fc.image_path,
          player_name: fc.player_name
        });
      }
    }
    
    // Agregar cartas destacadas a cada usuario
    users = users.map(u => ({
      ...u,
      featuredCards: featuredCardsMap[u.userId] || []
    }));

    return new Response(JSON.stringify({ success: true, totals: { totalAll, byCode: totalsByCode }, users }), { status: 200 });
  } catch (e) {
    console.error('Ranking API error:', e);
    return new Response(JSON.stringify({ success: false, error: String((e as any)?.message || e) }), { status: 500 });
  }
};
