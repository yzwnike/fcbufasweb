import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuerySingle, executeQuery } from '@/lib/mysql';

export const runtime = 'node';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });

    const uid = auth.id;

    // Obtener métricas actuales
    const [jRows, totCards, distinctCards, sbcCount, buys, sells, packsOpened, quizRight] = await Promise.all([
      executeQuerySingle<any>('SELECT COUNT(DISTINCT jornada) AS n FROM fantasy_rush WHERE user_id = ? AND jornada IS NOT NULL', [uid]),
      executeQuerySingle<any>('SELECT COUNT(*) AS n FROM user_cards WHERE user_id = ?', [uid]),
      executeQuerySingle<any>('SELECT COUNT(DISTINCT card_id) AS n FROM user_cards WHERE user_id = ?', [uid]),
      executeQuerySingle<any>('SELECT COUNT(*) AS n FROM sbc_submissions WHERE user_id = ?', [uid]).catch(()=>({ n:0 } as any)),
      executeQuerySingle<any>("SELECT COUNT(*) AS n FROM card_trades WHERE buyer_id = ? AND status = 'SOLD'", [uid]),
      executeQuerySingle<any>("SELECT COUNT(*) AS n FROM card_trades WHERE seller_id = ? AND status = 'SOLD'", [uid]),
      executeQuerySingle<any>('SELECT COUNT(*) AS n FROM packs WHERE user_id = ? AND opened = true', [uid]),
      executeQuerySingle<any>('SELECT COUNT(*) AS n FROM daily_quiz_answers WHERE user_id = ? AND is_correct = true', [uid]),
    ]);

    // Obtener todas las transacciones de logros
    const claimedTransactions = await executeQuery<any>(
      "SELECT description, amount, created_at FROM coin_transactions WHERE user_id = ? AND description LIKE 'ACHV:%' ORDER BY created_at DESC", 
      [uid]
    );

    // Obtener monedas actuales del usuario
    const userInfo = await executeQuerySingle<any>('SELECT coins FROM users WHERE id = ?', [uid]);

    const current = {
      fantasy_jornadas: Number(jRows?.n || 0),
      cartas_totales: Number(totCards?.n || 0),
      cartas_distintas: Number(distinctCards?.n || 0),
      sbc_completados: Number(sbcCount?.n || 0),
      mercado_compras: Number(buys?.n || 0),
      mercado_ventas: Number(sells?.n || 0),
      sobres_abiertos: Number(packsOpened?.n || 0),
      quiz_aciertos: Number(quizRight?.n || 0),
    };

    // Definir umbrales
    const ACHIEVEMENTS = [
      { key: 'fantasy_jornadas', title: 'Jornadas Fantasy jugadas', thresholds: [3,5,10,15,20] },
      { key: 'cartas_totales', title: 'Cartas acumuladas', thresholds: [5,10,20,30,40,50,75,100] },
      { key: 'cartas_distintas', title: 'Cartas diferentes', thresholds: [5,10,15,20,30,40,50] },
      { key: 'sbc_completados', title: 'SBC completados', thresholds: [1,3,5,10] },
      { key: 'mercado_compras', title: 'Compras en mercado', thresholds: [3,5,10,20] },
      { key: 'mercado_ventas', title: 'Ventas en mercado', thresholds: [3,5,10,20] },
      { key: 'sobres_abiertos', title: 'Sobres abiertos', thresholds: [5,10,20,30,40,50] },
      { key: 'quiz_aciertos', title: 'Aciertos en Quiz', thresholds: [10,20,30,40,50,75,100] },
    ];

    const claimed = new Set<string>((claimedTransactions || []).map((r: any) => r.description));

    const analysis = ACHIEVEMENTS.map(def => {
      const curr = current[def.key as keyof typeof current];
      const completedThresholds = def.thresholds.filter(t => curr >= t);
      const claimedThresholds = def.thresholds.filter(t => claimed.has(`ACHV:${def.key}:${t}`));
      const claimableThresholds = completedThresholds.filter(t => !claimed.has(`ACHV:${def.key}:${t}`));
      
      return {
        key: def.key,
        title: def.title,
        currentValue: curr,
        allThresholds: def.thresholds,
        completedThresholds,
        claimedThresholds,
        claimableThresholds,
        nextTarget: def.thresholds.find(t => curr < t) || null,
        maxReached: curr >= Math.max(...def.thresholds)
      };
    });

    return new Response(JSON.stringify({ 
      success: true, 
      userId: uid,
      userCoins: userInfo?.coins || 0,
      currentMetrics: current,
      claimedTransactions: claimedTransactions || [],
      achievementAnalysis: analysis
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error('Debug achievements error:', e);
    return new Response(JSON.stringify({ success: false, error: 'Error interno', details: e.message }), { status: 500 });
  }
};
