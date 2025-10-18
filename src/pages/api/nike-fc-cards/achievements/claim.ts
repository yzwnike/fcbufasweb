import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuerySingle, executeTransaction } from '@/lib/mysql';

function rewardCoins(key: string, threshold: number): number {
  switch (key) {
    case 'fantasy_jornadas': return threshold * 20;
    case 'cartas_totales': return threshold * 5;
    case 'cartas_distintas': return threshold * 10;
    case 'sbc_completados': return threshold * 30;
    case 'mercado_compras': return threshold * 20;
    case 'mercado_ventas': return threshold * 20;
    case 'sobres_abiertos': return threshold * 10;
    case 'quiz_aciertos': return threshold * 5;
    default: return 10;
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    const { key, threshold } = await request.json().catch(()=>({}));
    if (!key || typeof threshold !== 'number') {
      return new Response(JSON.stringify({ success: false, error: 'Parámetros inválidos' }), { status: 400 });
    }

    // Verificar progreso actual según key
    let curr = 0;
    switch (key) {
      case 'fantasy_jornadas': {
        const r = await executeQuerySingle<any>('SELECT COUNT(DISTINCT jornada) AS n FROM fantasy_rush WHERE user_id = ?', [auth.id]);
        curr = Number(r?.n || 0); break;
      }
      case 'cartas_totales': {
        const r = await executeQuerySingle<any>('SELECT COUNT(*) AS n FROM user_cards WHERE user_id = ?', [auth.id]);
        curr = Number(r?.n || 0); break;
      }
      case 'cartas_distintas': {
        const r = await executeQuerySingle<any>('SELECT COUNT(DISTINCT card_id) AS n FROM user_cards WHERE user_id = ?', [auth.id]);
        curr = Number(r?.n || 0); break;
      }
      case 'sbc_completados': {
        const r = await executeQuerySingle<any>('SELECT COUNT(*) AS n FROM sbc_submissions WHERE user_id = ?', [auth.id]).catch(()=>({ n:0 } as any));
        curr = Number(r?.n || 0); break;
      }
      case 'mercado_compras': {
        const r = await executeQuerySingle<any>("SELECT COUNT(*) AS n FROM card_trades WHERE buyer_id = ? AND status = 'SOLD'", [auth.id]);
        curr = Number(r?.n || 0); break;
      }
      case 'mercado_ventas': {
        const r = await executeQuerySingle<any>("SELECT COUNT(*) AS n FROM card_trades WHERE seller_id = ? AND status = 'SOLD'", [auth.id]);
        curr = Number(r?.n || 0); break;
      }
      case 'sobres_abiertos': {
        const r = await executeQuerySingle<any>('SELECT COUNT(*) AS n FROM packs WHERE user_id = ? AND opened = 1', [auth.id]);
        curr = Number(r?.n || 0); break;
      }
      case 'quiz_aciertos': {
        const r = await executeQuerySingle<any>('SELECT COUNT(*) AS n FROM daily_quiz_answers WHERE user_id = ? AND is_correct = 1', [auth.id]);
        curr = Number(r?.n || 0); break;
      }
      default:
        return new Response(JSON.stringify({ success: false, error: 'Logro desconocido' }), { status: 400 });
    }

    if (curr < threshold) {
      return new Response(JSON.stringify({ success: false, error: 'Aún no has alcanzado este umbral' }), { status: 400 });
    }

    const desc = `ACHV:${key}:${threshold}`;
    // Idempotente: si ya existe transacción con esa description, devolver ok
    const exists = await executeQuerySingle<any>('SELECT id FROM coin_transactions WHERE user_id = ? AND description = ? LIMIT 1', [auth.id, desc]);
    if (exists) {
      return new Response(JSON.stringify({ success: true, alreadyClaimed: true, coins: 0 }), { status: 200 });
    }

    const coins = rewardCoins(key, threshold);

    await executeTransaction(async (conn) => {
      await conn.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [coins, auth.id]);
      await conn.execute(
        "INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, 'INITIAL_BONUS', ?)",
        [auth.id, coins, desc]
      );
    });

    return new Response(JSON.stringify({ success: true, coins }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};