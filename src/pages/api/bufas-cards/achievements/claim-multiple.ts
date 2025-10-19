import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuery, executeQuerySingle, executeTransaction } from '@/lib/mysql';

export const runtime = 'node';

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
    
    const { key } = await request.json().catch(()=>({}));
    if (!key) {
      return new Response(JSON.stringify({ success: false, error: 'Parámetros inválidos' }), { status: 400 });
    }

    // Verificar progreso actual según key
    let curr = 0;
    switch (key) {
      case 'fantasy_jornadas': {
        const r = await executeQuerySingle<any>('SELECT COUNT(DISTINCT week_start) AS n FROM fantasy_rush WHERE user_id = ?', [auth.id]).catch(() => ({ n: 0 } as any));
        curr = Number(r?.n || 0); break;
      }
      case 'cartas_totales': {
        const r = await executeQuerySingle<any>('SELECT COUNT(*) AS n FROM user_cards WHERE user_id = ?', [auth.id]).catch(() => ({ n: 0 } as any));
        curr = Number(r?.n || 0); break;
      }
      case 'cartas_distintas': {
        const r = await executeQuerySingle<any>('SELECT COUNT(DISTINCT card_id) AS n FROM user_cards WHERE user_id = ?', [auth.id]).catch(() => ({ n: 0 } as any));
        curr = Number(r?.n || 0); break;
      }
      case 'sbc_completados': {
        const r = await executeQuerySingle<any>('SELECT COUNT(*) AS n FROM sbc_submissions WHERE user_id = ?', [auth.id]).catch(()=>({ n:0 } as any));
        curr = Number(r?.n || 0); break;
      }
      case 'mercado_compras': {
        const r = await executeQuerySingle<any>("SELECT COUNT(*) AS n FROM card_trades WHERE buyer_id = ? AND status = 'SOLD'", [auth.id]).catch(() => ({ n: 0 } as any));
        curr = Number(r?.n || 0); break;
      }
      case 'mercado_ventas': {
        const r = await executeQuerySingle<any>("SELECT COUNT(*) AS n FROM card_trades WHERE seller_id = ? AND status = 'SOLD'", [auth.id]).catch(() => ({ n: 0 } as any));
        curr = Number(r?.n || 0); break;
      }
      case 'sobres_abiertos': {
        const r = await executeQuerySingle<any>('SELECT COUNT(*) AS n FROM packs WHERE user_id = ? AND opened = true', [auth.id]).catch(() => ({ n: 0 } as any));
        curr = Number(r?.n || 0); break;
      }
      case 'quiz_aciertos': {
        const r = await executeQuerySingle<any>('SELECT COUNT(*) AS n FROM daily_quiz_answers WHERE user_id = ? AND is_correct = true', [auth.id]).catch(() => ({ n: 0 } as any));
        curr = Number(r?.n || 0); break;
      }
      default:
        return new Response(JSON.stringify({ success: false, error: 'Logro desconocido' }), { status: 400 });
    }

    // Obtener los umbrales definidos para este logro
    const ACHIEVEMENT_THRESHOLDS: Record<string, number[]> = {
      'fantasy_jornadas': [3,5,10,15,20],
      'cartas_totales': [5,10,20,30,40,50,75,100],
      'cartas_distintas': [5,10,15,20,30,40,50],
      'sbc_completados': [1,3,5,10],
      'mercado_compras': [3,5,10,20],
      'mercado_ventas': [3,5,10,20],
      'sobres_abiertos': [5,10,20,30,40,50],
      'quiz_aciertos': [10,20,30,40,50,75,100],
    };

    const thresholds = ACHIEVEMENT_THRESHOLDS[key];
    if (!thresholds) {
      return new Response(JSON.stringify({ success: false, error: 'Logro desconocido' }), { status: 400 });
    }

    // Encontrar todos los umbrales que cumple y que no ha reclamado aún
    const eligibleThresholds = thresholds.filter(t => curr >= t);
    
    if (eligibleThresholds.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No tienes logros elegibles para reclamar' }), { status: 400 });
    }

    // Verificar cuáles ya han sido reclamados - método más robusto
    const existingClaimsRows = await executeQuery<any>(
      "SELECT description FROM coin_transactions WHERE user_id = ? AND description LIKE ?", 
      [auth.id, `ACHV:${key}:%`]
    ).catch(() => []);
    
    const claimedThresholds = (existingClaimsRows || []).map((row: any) => {
      const parts = row.description.split(':');
      return Number(parts[parts.length - 1]);
    }).filter(n => !isNaN(n));

    // Filtrar solo los umbrales no reclamados
    const unclaimedThresholds = eligibleThresholds.filter(t => !claimedThresholds.includes(t));
    
    console.log(`[ACHIEVEMENT CLAIM] User ${auth.id}, Key: ${key}, Current: ${curr}, Eligible: [${eligibleThresholds.join(',')}], Claimed: [${claimedThresholds.join(',')}], Unclaimed: [${unclaimedThresholds.join(',')}]`);
    
    if (unclaimedThresholds.length === 0) {
      return new Response(JSON.stringify({ success: true, alreadyClaimed: true, coins: 0, debug: { curr, eligibleThresholds, claimedThresholds } }), { status: 200 });
    }

    // Calcular monedas totales a reclamar
    const totalCoins = unclaimedThresholds.reduce((sum, threshold) => sum + rewardCoins(key, threshold), 0);

    // Ejecutar todas las transacciones en una sola transacción de base de datos
    await executeTransaction(async (conn) => {
      // Actualizar monedas del usuario
      await conn.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [totalCoins, auth.id]);
      
      // Insertar todas las transacciones de logros
      for (const threshold of unclaimedThresholds) {
        const desc = `ACHV:${key}:${threshold}`;
        const coins = rewardCoins(key, threshold);
        await conn.execute(
          "INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, 'INITIAL_BONUS', ?)",
          [auth.id, coins, desc]
        );
      }
    });

    console.log(`[ACHIEVEMENT CLAIM SUCCESS] User ${auth.id} claimed ${unclaimedThresholds.length} achievements for ${totalCoins} coins`);

    return new Response(JSON.stringify({ 
      success: true, 
      coins: totalCoins, 
      claimedCount: unclaimedThresholds.length,
      claimedThresholds: unclaimedThresholds 
    }), { status: 200 });
  } catch (e) {
    console.error('Error en claim-multiple:', e);
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};
