import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserCards, getUserCollectionStats } from '@/lib/cards';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    }

    let cards, stats;
    try {
      cards = await getUserCards(auth.id);
    } catch (e: any) {
      console.error('getUserCards error:', e);
      return new Response(JSON.stringify({ success: false, error: 'DB: user_cards', details: e?.message || String(e) }), { status: 500 });
    }

    try {
      stats = await getUserCollectionStats(auth.id);
    } catch (e: any) {
      console.error('getUserCollectionStats error:', e);
      return new Response(JSON.stringify({ success: false, error: 'DB: packs/stats', details: e?.message || String(e) }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, cards, stats }), { status: 200 });
  } catch (e: any) {
    console.error('Collection API error:', e);
    return new Response(JSON.stringify({ success: false, error: 'DB o autenticación', details: e?.message || String(e) }), { status: 500 });
  }
};
