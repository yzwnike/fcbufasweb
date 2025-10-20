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
  // Recompensas específicas para fantasy_jornadas
  if (key === 'fantasy_jornadas') {
    switch (threshold) {
      case 3:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 100,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 5:
        return {
          threshold,
          reward_type: 'CARD' as const,
          coins: 0,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any, // Se llenará con la carta de Aznar 83 OG
          card_image_path: '/cards/OG/aznarOG.png', // Ruta correcta
          player_name: 'Aznar 83 OG',
        };
      case 10:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 250,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 15:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'SPECIAL_85',
          pack_label: 'Sobre carta media 85+',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
      case 20:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 500,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
    }
  }
  
  // Recompensas específicas para cartas_totales
  if (key === 'cartas_totales') {
    switch (threshold) {
      case 5:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 100,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 10:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'MEDIA_81_85',
          pack_label: 'Sobre 1x carta media 81-85',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
      case 20:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 150,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 30:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'MEDIA_83_87',
          pack_label: 'Sobre 1x carta media 83-87',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
      case 40:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 250,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 50:
        return {
          threshold,
          reward_type: 'CARD' as const,
          coins: 0,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/cards/TOTW/marcosTOTW2.png',
          player_name: 'Marcos TOTW JORNADA 2',
        };
      case 75:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 500,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 100:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'ELITE_RANDOM',
          pack_label: 'Sobre 1x carta ELITE aleatorio',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
    }
  }
  
  // Recompensas específicas para cartas_distintas
  if (key === 'cartas_distintas') {
    switch (threshold) {
      case 5:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'OG_81_87',
          pack_label: 'Sobre carta OG media 81-87',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
      case 10:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 200,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 15:
        return {
          threshold,
          reward_type: 'CARD' as const,
          coins: 0,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/cards/BASE/elvei.png',
          player_name: 'Elvei BASE',
        };
      case 20:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'ESPECIAL',
          pack_label: 'Sobre 1x carta ESPECIAL',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
      case 30:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 500,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 40:
        return {
          threshold,
          reward_type: 'CARD' as const,
          coins: 0,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/cards/TOTW/misterTOTW2.png',
          player_name: 'Mister TOTW JORNADA 2',
        };
      case 50:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'EVENTO',
          pack_label: 'Sobre de EVENTO media +90',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
    }
  }
  
  // Recompensas específicas para sbc_completados
  if (key === 'sbc_completados') {
    switch (threshold) {
      case 1:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 150,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 3:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'SPECIAL_85_PLUS',
          pack_label: 'Sobre 85+',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
      case 5:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 400,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 10:
        return {
          threshold,
          reward_type: 'CARD' as const,
          coins: 0,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/cards/TOTW/marioTOTW3.png',
          player_name: 'Mario TOTW JORNADA 3',
        };
    }
  }
  
  // Recompensas específicas para mercado_compras
  if (key === 'mercado_compras') {
    switch (threshold) {
      case 3:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 150,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 5:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'MEDIA_84_88',
          pack_label: 'Sobre 1x carta media 84-88',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
      case 10:
        return {
          threshold,
          reward_type: 'CHOICE' as const,
          coins: 0,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/cards/OG/jorgeOG.png,/cards/OG/bustosOG.png,/cards/OG/manuOG.png,/cards/OG/juaneteOG.png',
          player_name: '1x elección de carta OG media 87',
        };
      case 20:
        return {
          threshold,
          reward_type: 'CARD' as const,
          coins: 0,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/cards/BASE/nicou.png',
          player_name: 'Nico Uriburu BASE',
        };
    }
  }
  
  // Recompensas específicas para mercado_ventas
  if (key === 'mercado_ventas') {
    switch (threshold) {
      case 3:
        return {
          threshold,
          reward_type: 'CARD' as const,
          coins: 0,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/cards/OG/alainOG.png',
          player_name: 'Joan Alain OG',
        };
      case 5:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 200,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 10:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'BASE_85_89',
          pack_label: 'Sobre carta BASE 85-89',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
      case 20:
        return {
          threshold,
          reward_type: 'CHOICE' as const,
          coins: 0,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/cards/BASE/mario.png,/cards/BASE/mister.png',
          player_name: '1x elección Mario BASE o Mister BASE',
        };
    }
  }
  
  // Recompensas específicas para sobres_abiertos
  if (key === 'sobres_abiertos') {
    switch (threshold) {
      case 5:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 150,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 10:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'MEDIA_81_85',
          pack_label: 'Sobre media 81-85',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
      case 20:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 300,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 30:
        return {
          threshold,
          reward_type: 'CARD' as const,
          coins: 0,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/cards/OG/hugoOG.png',
          player_name: 'Hugo OG',
        };
      case 40:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 600,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 50:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'EVENTO_90_PLUS',
          pack_label: 'Sobre evento media 90+',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
    }
  }
  
  // Recompensas específicas para quiz_aciertos
  if (key === 'quiz_aciertos') {
    switch (threshold) {
      case 10:
        return {
          threshold,
          reward_type: 'CHOICE' as const,
          coins: 0,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/cards/BASE/albert.png,/cards/BASE/elvei.png,/cards/BASE/yazawa.png',
          player_name: '1x elección Albert BASE, Elvei BASE o Yazawa BASE',
        };
      case 20:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 200,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 30:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'MEDIA_86_89',
          pack_label: 'Sobre media 86-89',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
      case 40:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 400,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 50:
        return {
          threshold,
          reward_type: 'COINS' as const,
          coins: 500,
          pack_type: null as any,
          pack_label: null as any,
          card_id: null as any,
          card_image_path: '/icons/monedaicono.png',
          player_name: null as any,
        };
      case 75:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'ESPECIAL',
          pack_label: 'Sobre 1 carta ESPECIAL',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
      case 100:
        return {
          threshold,
          reward_type: 'PACK' as const,
          coins: 0,
          pack_type: 'ELITE',
          pack_label: 'Sobre ELITE',
          card_id: null as any,
          card_image_path: '/icons/logrossobre.png',
          player_name: null as any,
        };
    }
  }
  
  // Recompensas por defecto para otros logros
  return {
    threshold,
    reward_type: 'COINS' as const,
    coins: rewardCoins(key, threshold),
    pack_type: null as any,
    pack_label: null as any,
    card_id: null as any,
    card_image_path: '/icons/monedaicono.png',
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
      executeQuerySingle<any>('SELECT COUNT(DISTINCT week_start) AS n FROM fantasy_rush WHERE user_id = ?', [uid]).catch(() => ({ n: 0 } as any)),
      executeQuerySingle<any>('SELECT COUNT(*) AS n FROM user_cards WHERE user_id = ?', [uid]),
      executeQuerySingle<any>('SELECT COUNT(DISTINCT card_id) AS n FROM user_cards WHERE user_id = ?', [uid]),
      executeQuerySingle<any>('SELECT COUNT(*) AS n FROM sbc_submissions WHERE user_id = ?', [uid]).catch(()=>({ n:0 } as any)),
      executeQuerySingle<any>("SELECT COUNT(*) AS n FROM card_trades WHERE buyer_id = ? AND status = 'SOLD'", [uid]),
      executeQuerySingle<any>("SELECT COUNT(*) AS n FROM card_trades WHERE seller_id = ? AND status = 'SOLD'", [uid]),
      executeQuerySingle<any>('SELECT COUNT(*) AS n FROM packs WHERE user_id = ? AND opened = true', [uid]),
      executeQuerySingle<any>('SELECT COUNT(*) AS n FROM daily_quiz_answers WHERE user_id = ? AND is_correct = true', [uid]),
      executeQuery<any>("SELECT description FROM coin_transactions WHERE user_id = ? AND description LIKE 'A:%'", [uid])
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
      const claimable = def.thresholds.filter(t => curr >= t && !claimed.has(`A:${def.key}:${t}`))
        .map(t => ({ threshold: t, coins: rewardCoins(def.key, t) }));
      const claimedThresholds = def.thresholds.filter(t => claimed.has(`A:${def.key}:${t}`));
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
    console.error('Error en achievements index:', e);
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};
