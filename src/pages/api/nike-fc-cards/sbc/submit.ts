import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { submitChallenge } from '@/lib/sbc';

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });

    const body = await request.json().catch(() => null) as any;
    const challenge_id = Number(body?.challenge_id);
    const user_card_ids = Array.isArray(body?.user_card_ids) ? body.user_card_ids.map((n: any)=>Number(n)).filter((n: any)=>Number.isFinite(n)) : [];

    if (!challenge_id || user_card_ids.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Parámetros inválidos' }), { status: 400 });
    }

    const result = await submitChallenge(auth.id, challenge_id, user_card_ids);
    if (!result.success) {
      return new Response(JSON.stringify({ success: false, error: result.error }), { status: 400 });
    }
    return new Response(JSON.stringify({ success: true, completed: true, challenge_id }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};