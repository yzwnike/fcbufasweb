import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { putCardForSale } from '@/lib/trading';

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    }

    const body = await request.json().catch(() => null) as any;
    const user_card_id = Number(body?.user_card_id);
    const price = Number(body?.price);

    if (!user_card_id || !price || Number.isNaN(user_card_id) || Number.isNaN(price)) {
      return new Response(JSON.stringify({ success: false, error: 'Parámetros inválidos' }), { status: 400 });
    }

    const result = await putCardForSale(auth.id, user_card_id, price);
    if (!result.success) {
      return new Response(JSON.stringify({ success: false, error: result.error || 'No se pudo poner en venta' }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, tradeId: result.tradeId }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};
