import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuerySingle, executeQuery } from '@/lib/mysql';

export const runtime = 'node';

// Catálogo simple de logros y umbrales
const ACHIEVEMENTS = [
  { key: 'fantasy_jornadas', title: 'Jornadas Fantasy jugadas', thresholds: [3,5,10,15,20] },
  { key: 'cartas_totales', title: 'Cartas acumuladas', thresholds: [5,10,20,30,40,50,75,100] },
  { key: 'cartas_distintas', title: 'Cartas diferentes', thresholds: [5,10,15,20,30,40,50] },
  { key: 'sbc_completados', title: 'SBC completados', thresholds: [1,3,5,10] },
  { key: 'mercado_compras', title: 'Compras en mercado', thresholds: [3,5,10,20] },
  { key: 'mercado_ventas', title: 'Ventas en mercado', thresholds: [3,5,10,20] },
  { key: 'sobres_abiertos', title: 'Sobres abiertos', thresholds: [5,10,20,30,40,50] },
  { key: 'quiz_aciertos', title: 'Aciertos en Quiz', thresholds: [10,20,30,40,50,75,100] },
] as const;

type AchvKey = typeof ACHIEVEMENTS[number]['key'];

function rewardCoins(key: AchvKey, threshold: number): number {
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

// Construye la recompensa por nivel. Por defecto: monedas.
function buildReward(key: AchvKey, threshold: number) {
  return {
    threshold,
    reward_type: 'COINS' as const,
    coins: rewardCoins(key, threshold),
    pack_type: null as any,
    pack_label: null as any,
    card_id: null as any,
    card_image_path: null as any,
    player_name: null as any,
  };
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    const uid = auth.id;

    // Métricas
    const [jRows, totCards, distinctCards, sbcCount, buys, sells, packsOpened, quizRight, claimedRows] = await Promise.all([
      executeQuerySingle<any>('SELECT COUNT(DISTINCT jornada) AS n FROM fantasy_rush WHERE user_id = ? AND jornada IS NOT NULL', [uid]),
      executeQuerySingle<any>('SELECT COUNT(*) AS n FROM user_cards WHERE user_id = ?', [uid]),
      executeQuerySingle<any>('SELECT COUNT(DISTINCT card_id) AS n FROM user_cards WHERE user_id = ?', [uid]),
      executeQuerySingle<any>('SELECT COUNT(*) AS n FROM sbc_submissions WHERE user_id = ?', [uid]).catch(()=>({ n:0 } as any)),
      executeQuerySingle<any>("SELECT COUNT(*) AS n FROM card_trades WHERE buyer_id = ? AND status = 'SOLD'", [uid]),
      executeQuerySingle<any>("SELECT COUNT(*) AS n FROM card_trades WHERE seller_id = ? AND status = 'SOLD'", [uid]),
      executeQuerySingle<any>('SELECT COUNT(*) AS n FROM packs WHERE user_id = ? AND opened = true', [uid]),
      executeQuerySingle<any>('SELECT COUNT(*) AS n FROM daily_quiz_answers WHERE user_id = ? AND is_correct = true', [uid]),
      executeQuery<any>("SELECT description FROM coin_transactions WHERE user_id = ? AND description LIKE 'ACHV:%'", [uid])
    ]);

    const current: Record<AchvKey, number> = {
      fantasy_jornadas: Number(jRows?.n || 0),
      cartas_totales: Number(totCards?.n || 0),
      cartas_distintas: Number(distinctCards?.n || 0),
      sbc_completados: Number(sbcCount?.n || 0),
      mercado_compras: Number(buys?.n || 0),
      mercado_ventas: Number(sells?.n || 0),
      sobres_abiertos: Number(packsOpened?.n || 0),
      quiz_aciertos: Number(quizRight?.n || 0),
    } as any;

    const claimed = new Set<string>((claimedRows || []).map((r: any) => r.description));

    const list = ACHIEVEMENTS.map(def => {
      const curr = current[def.key];
      const completedCount = def.thresholds.filter(t => curr >= t).length;
      const nextTarget = def.thresholds.find(t => curr < t) || null;
      const claimable = def.thresholds.filter(t => curr >= t && !claimed.has(`ACHV:${def.key}:${t}`))
        .map(t => ({ threshold: t, coins: rewardCoins(def.key, t) }));
      const claimedThresholds = def.thresholds.filter(t => claimed.has(`ACHV:${def.key}:${t}`));
      const rewards = def.thresholds.map(t => buildReward(def.key, t));
      return {
        key: def.key,
        title: def.title,
        thresholds: def.thresholds,
        rewards,
        currentValue: curr,
        completedCount,
        nextTarget,
        claimable,
        claimedThresholds,
      };
    });

    return new Response(JSON.stringify({ success: true, achievements: list }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};