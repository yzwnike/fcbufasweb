import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserCards, getUserCollectionStats } from '@/lib/cards';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    }

    const [cards, stats] = await Promise.all([
      getUserCards(auth.id),
      getUserCollectionStats(auth.id)
    ]);

    return new Response(JSON.stringify({ success: true, cards, stats }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};