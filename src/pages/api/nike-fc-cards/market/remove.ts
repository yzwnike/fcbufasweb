import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { removeCardFromSale } from '@/lib/trading';
import { executeQuerySingle } from '@/lib/mysql';

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    }

    const body = await request.json().catch(() => null) as any;
    let trade_id = body?.trade_id ? Number(body.trade_id) : null;
    const user_card_id = body?.user_card_id ? Number(body.user_card_id) : null;

    if (!trade_id && !user_card_id) {
      return new Response(JSON.stringify({ success: false, error: 'Parámetros inválidos' }), { status: 400 });
    }

    if (!trade_id && user_card_id) {
      // Buscar el trade activo por user_card_id del propio usuario
      const trade = await executeQuerySingle<any>(
        'SELECT id FROM card_trades WHERE user_card_id = ? AND seller_id = ? AND status = "ACTIVE"',
        [user_card_id, auth.id]
      );
      trade_id = trade?.id || null;
    }

    if (!trade_id) {
      return new Response(JSON.stringify({ success: false, error: 'No se encontró el listado activo' }), { status: 404 });
    }

    const result = await removeCardFromSale(auth.id, trade_id);
    if (!result.success) {
      return new Response(JSON.stringify({ success: false, error: result.error || 'No se pudo quitar de venta' }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};