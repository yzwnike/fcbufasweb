import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuerySingle, executeTransaction } from '@/lib/mysql';
import { openAchievementPack, getSpecificCard, type AchievementPackType } from '@/lib/achievement-packs';
import { getCardWithPlayer, giveCardToUser } from '@/lib/cards';

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
  let auth = null;
  try {
    auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    
    const body = await request.json().catch(()=>({}));
    const { key, threshold, rewardType, packType, cardImagePath, coins: specificCoins } = body;
    
    console.log('Claim request:', { key, threshold, rewardType, packType, specificCoins, userId: auth.id });
    
    if (!key || typeof threshold !== 'number') {
      console.error('Invalid parameters:', { key, threshold, rewardType });
      return new Response(JSON.stringify({ success: false, error: 'Parámetros inválidos' }), { status: 400 });
    }

    // Verificar progreso actual según key
    let curr = 0;
    try {
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
    } catch (queryError) {
      console.error('Error en query de progreso:', queryError);
      return new Response(JSON.stringify({ success: false, error: 'Error al verificar progreso' }), { status: 500 });
    }

    if (curr < threshold) {
      return new Response(JSON.stringify({ success: false, error: 'Aún no has alcanzado este umbral' }), { status: 400 });
    }

    const desc = `A:${key}:${threshold}`;
    // Idempotente: si ya existe transacción con esa description, devolver ok
    try {
      const exists = await executeQuerySingle<any>('SELECT id FROM coin_transactions WHERE user_id = ? AND description = ? LIMIT 1', [auth.id, desc]);
      if (exists) {
        return new Response(JSON.stringify({ success: true, alreadyClaimed: true, coins: 0 }), { status: 200 });
      }
    } catch (duplicateError) {
      console.error('Error verificando duplicados:', duplicateError);
      return new Response(JSON.stringify({ success: false, error: 'Error verificando historial' }), { status: 500 });
    }

    // Manejar diferentes tipos de recompensas
    if (rewardType === 'COINS' || !rewardType) {
      try {
        // Usar cantidad específica de monedas si se proporciona, sino usar fórmula de fallback
        const coins = specificCoins || rewardCoins(key, threshold);
        
        console.log('Processing COINS reward:', { specificCoins, calculated: rewardCoins(key, threshold), final: coins });
        
        await executeTransaction(async (conn) => {
          await conn.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [coins, auth.id]);
          await conn.execute(
            "INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)",
            [auth.id, coins, 'DAILY_QUIZ', desc]
          );
        });
        
        console.log('COINS reward processed successfully:', coins);
        
        return new Response(JSON.stringify({ 
          success: true, 
          rewardType: 'COINS',
          coins 
        }), { status: 200 });
      } catch (coinsError) {
        console.error('Error procesando recompensa de monedas:', coinsError);
        return new Response(JSON.stringify({ success: false, error: 'Error procesando monedas: ' + coinsError.message }), { status: 500 });
      }
      
    } else if (rewardType === 'CARD') {
      try {
        // Dar carta específica
        const specificCard = await getSpecificCard(cardImagePath);
        if (!specificCard) {
          return new Response(JSON.stringify({ success: false, error: 'Carta no encontrada' }), { status: 400 });
        }
        
        await executeTransaction(async (conn) => {
          // Dar carta al usuario
          await conn.execute(
            'INSERT INTO user_cards (user_id, card_id) VALUES (?, ?)',
            [auth.id, specificCard.id]
          );
          
          // Registrar transacción para evitar duplicados
          await conn.execute(
            "INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)",
            [auth.id, 0, 'DAILY_QUIZ', desc]
          );
        });
        
        const cardWithPlayer = await getCardWithPlayer(specificCard.id);
        
        return new Response(JSON.stringify({ 
          success: true, 
          rewardType: 'CARD',
          card: cardWithPlayer
        }), { status: 200 });
      } catch (cardError) {
        console.error('Error procesando recompensa de carta:', cardError);
        return new Response(JSON.stringify({ success: false, error: 'Error procesando carta: ' + cardError.message }), { status: 500 });
      }
      
    } else if (rewardType === 'PACK') {
      try {
        // Abrir sobre de logro
        const packResult = await openAchievementPack(auth.id, packType as AchievementPackType);
        
        if (!packResult.success) {
          return new Response(JSON.stringify({ success: false, error: packResult.error }), { status: 400 });
        }
        
        // Registrar transacción para evitar duplicados
        await executeTransaction(async (conn) => {
          await conn.execute(
            "INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)",
            [auth.id, 0, 'DAILY_QUIZ', desc]
          );
        });
        
        return new Response(JSON.stringify({ 
          success: true, 
          rewardType: 'PACK',
          card: packResult.card,
          compensation: packResult.compensation || 0,
          packType
        }), { status: 200 });
      } catch (packError) {
        console.error('Error procesando recompensa de sobre:', packError);
        return new Response(JSON.stringify({ success: false, error: 'Error procesando sobre: ' + packError.message }), { status: 500 });
      }
      
    } else {
      try {
        // Fallback a monedas
        const coins = specificCoins || rewardCoins(key, threshold);
        
        console.log('Processing fallback COINS reward:', { specificCoins, calculated: rewardCoins(key, threshold), final: coins });
        
        await executeTransaction(async (conn) => {
          await conn.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [coins, auth.id]);
          await conn.execute(
            "INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)",
            [auth.id, coins, 'DAILY_QUIZ', desc]
          );
        });
        
        console.log('Fallback COINS reward processed successfully:', coins);
        
        return new Response(JSON.stringify({ 
          success: true, 
          rewardType: 'COINS',
          coins 
        }), { status: 200 });
      } catch (fallbackError) {
        console.error('Error procesando fallback de monedas:', fallbackError);
        return new Response(JSON.stringify({ success: false, error: 'Error en fallback: ' + fallbackError.message }), { status: 500 });
      }
    }
  } catch (e) {
    console.error('Error en claim achievement:', {
      error: e,
      message: e?.message,
      stack: e?.stack,
      userId: auth?.id
    });
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno: ' + (e?.message || 'Unknown error')
    }), { status: 500 });
  }
};
