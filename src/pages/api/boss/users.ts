import type { APIRoute } from 'astro';
import { executeQuery } from '@/lib/mysql';

export const GET: APIRoute = async () => {
  try {
    const users = await executeQuery<any>(
      `SELECT 
         u.id, u.username, u.email, u.coins, u.created_at, u.updated_at,
         COALESCE(COUNT(uc.id),0) AS cards,
         COALESCE(SUM(CASE WHEN c.special_type='TEAM_OF_THE_WEEK' THEN 1 ELSE 0 END),0) AS totw,
         COALESCE(SUM(CASE WHEN c.special_type='PLAYER_OF_THE_MONTH' THEN 1 ELSE 0 END),0) AS potm
       FROM users u
       LEFT JOIN user_cards uc ON uc.user_id = u.id
       LEFT JOIN cards c ON c.id = uc.card_id
       GROUP BY u.id, u.username, u.email, u.coins, u.created_at, u.updated_at
       ORDER BY u.created_at ASC`
    );
    return new Response(JSON.stringify({ success: true, users }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any)?.message || e) }), { status: 500 });
  }
};