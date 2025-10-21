import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuerySingle, executeTransaction } from '@/lib/mysql';
import { getSpecificCard } from '@/lib/achievement-packs';
import { getCardWithPlayer } from '@/lib/cards';

export const runtime = 'node';

export const POST: APIRoute = async ({ request }) => {
  let auth = null;
  try {
    auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    
    const body = await request.json().catch(() => ({}));
    const { key, threshold, selectedCardPath } = body;
    
    console.log('Choice confirmation request:', { key, threshold, selectedCardPath, userId: auth.id });
    
    if (!key || typeof threshold !== 'number' || !selectedCardPath) {
      return new Response(JSON.stringify({ success: false, error: 'Parámetros inválidos' }), { status: 400 });
    }

    // Verificar que hay un reclamo pendiente
    const pendingDesc = `PENDING_CHOICE:${key}:${threshold}`;
    const pending = await executeQuerySingle<any>(
      'SELECT id FROM coin_transactions WHERE user_id = ? AND description = ? LIMIT 1',
      [auth.id, pendingDesc]
    );

    if (!pending) {
      return new Response(JSON.stringify({ success: false, error: 'No hay selección pendiente' }), { status: 400 });
    }

    // Verificar que ya no se completó este logro
    const completedDesc = `A:${key}:${threshold}`;
    const completed = await executeQuerySingle<any>(
      'SELECT id FROM coin_transactions WHERE user_id = ? AND description = ? LIMIT 1',
      [auth.id, completedDesc]
    );

    if (completed) {
      return new Response(JSON.stringify({ success: false, error: 'Logro ya reclamado' }), { status: 400 });
    }

    // Obtener la carta específica
    const specificCard = await getSpecificCard(selectedCardPath);
    if (!specificCard) {
      return new Response(JSON.stringify({ success: false, error: 'Carta no encontrada' }), { status: 400 });
    }

    // Procesar la selección
    await executeTransaction(async (conn) => {
      // Dar la carta seleccionada al usuario
      await conn.execute(
        'INSERT INTO user_cards (user_id, card_id) VALUES (?, ?)',
        [auth.id, specificCard.id]
      );
      
      // Registrar la transacción final (reemplazando el estado pendiente)
      await conn.execute(
        "INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)",
        [auth.id, 0, 'ACHIEVEMENT_CHOICE', completedDesc]
      );
      
      // Limpiar el estado pendiente
      await conn.execute(
        'DELETE FROM coin_transactions WHERE user_id = ? AND description = ?',
        [auth.id, pendingDesc]
      );
    });

    const cardWithPlayer = await getCardWithPlayer(specificCard.id);
    
    return new Response(JSON.stringify({ 
      success: true, 
      rewardType: 'CHOICE_CONFIRMED',
      card: cardWithPlayer
    }), { status: 200 });

  } catch (error) {
    console.error('Error en choice confirmation:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno: ' + (error?.message || 'Unknown error')
    }), { status: 500 });
  }
};