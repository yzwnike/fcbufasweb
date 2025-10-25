import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { executeQuery, executeQuerySingle, executeTransaction } from '@/lib/mysql';
import { openCardPack } from '@/lib/cards';
import { broadcastCardNotification } from '../notifications/stream';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.slice(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, import.meta.env.JWT_SECRET);
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = decoded.userId;
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'Usuario no encontrado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener pack_id del body
    const { pack_id } = await request.json();
    if (!pack_id) {
      return new Response(JSON.stringify({ success: false, error: 'pack_id requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar que el pack existe y pertenece al usuario
    const pack = await executeQuerySingle<any>(
      'SELECT * FROM packs WHERE id = ? AND user_id = ?',
      [pack_id, userId]
    );

    if (!pack) {
      return new Response(JSON.stringify({ success: false, error: 'Sobre no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar que el pack no esté ya abierto
    if (pack.opened) {
      return new Response(JSON.stringify({ success: false, error: 'Este sobre ya ha sido abierto' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener username para notificación
    const user = await executeQuerySingle<any>(
      'SELECT username FROM users WHERE id = ?',
      [userId]
    );
    
    // Abrir el pack usando una transacción
    const result = await executeTransaction(async (connection) => {
      // Marcar el pack como abierto
      await connection.execute(
        'UPDATE packs SET opened = TRUE, opened_at = NOW() WHERE id = ? AND user_id = ?',
        [pack_id, userId]
      );

      // Generar y asignar las cartas usando el tipo de pack
      const packResult = await openCardPack(userId, pack.type, connection);
      
      if (!packResult.success) {
        throw new Error(packResult.error || 'Error al generar cartas del sobre');
      }

      return packResult.cards;
    });
    
    // Broadcast notification for each card obtained (only for Elite+ rarities)
    if (result && result.length > 0 && user) {
      for (const card of result) {
        // Solo notificar cartas Elite o superiores
        const specialType = card.special_type || card.card?.special_type;
        const isSpecial = specialType && !['Regular', 'OLD_GENERATION'].includes(specialType);
        
        if (isSpecial) {
          try {
            broadcastCardNotification(user.username, card);
          } catch (e) {
            console.error('Error broadcasting notification:', e);
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      cards: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error opening pack:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};