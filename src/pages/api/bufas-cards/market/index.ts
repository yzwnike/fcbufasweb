import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuery } from '@/lib/mysql';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    }

    // Listar publicaciones activas
    const listings = await executeQuery<any>(
      `SELECT ct.id,
              ct.price as sale_price,
              ct.created_at as listed_at,
              u.id as seller_id,
              u.username as seller_username,
              c.id as card_id,
              c.rarity,
              c.special_type,
              c.base_price,
              c.image_path,
              p.id as player_id,
              p.name as player_name,
              p.position1,
              p.fifa_rating
       FROM card_trades ct
       JOIN users u ON u.id = ct.seller_id
       JOIN user_cards uc ON uc.id = ct.user_card_id
       JOIN cards c ON c.id = uc.card_id
       JOIN players p ON p.id = c.player_id
       WHERE ct.status = 'ACTIVE'
       ORDER BY ct.created_at DESC
       LIMIT 200`
    );

    const normalized = listings.map((row) => ({
      id: row.id,
      seller_id: row.seller_id,
      seller_username: row.seller_username,
      sale_price: row.sale_price,
      listed_at: row.listed_at,
      is_own: row.seller_id === auth.id,
      card: {
        id: row.card_id,
        rarity: row.rarity,
        special_type: row.special_type,
        base_price: row.base_price,
        image_path: row.image_path,
        player: {
          id: row.player_id,
          name: row.player_name,
          position1: row.position1,
          fifa_rating: row.fifa_rating,
        }
      }
    }));

    // Stats sencillas
    const stats = {
      totalListings: normalized.length,
      avgPrice: normalized.length ? Math.round(normalized.reduce((a, b) => a + b.sale_price, 0) / normalized.length) : 0,
      activeSellers: new Set(normalized.map(l => l.seller_username)).size,
      legendCards: normalized.filter(l => l.card.rarity === 'Legend').length,
    };

    return new Response(JSON.stringify({ success: true, listings: normalized, stats }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};
