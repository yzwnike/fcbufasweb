import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { buyCard } from '@/lib/trading';

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    }

    const body = await request.json().catch(() => null) as any;
    const trade_id = Number(body?.trade_id);
    if (!trade_id || Number.isNaN(trade_id)) {
      return new Response(JSON.stringify({ success: false, error: 'Parámetros inválidos' }), { status: 400 });
    }

    const result = await buyCard(auth.id, trade_id);
    if (!result.success) {
      return new Response(JSON.stringify({ success: false, error: result.error || 'No se pudo completar la compra' }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};