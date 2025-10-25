import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuery, executeQuerySingle, executeTransaction } from '@/lib/mysql';

// GET: Obtener las cartas destacadas del usuario
export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const featuredCards = await executeQuery<any>(
      `SELECT 
        ufc.id,
        ufc.position,
        uc.id as user_card_id,
        c.id as card_id,
        c.image_path,
        c.special_type,
        c.rarity,
        p.name as player_name,
        p.fifa_rating
      FROM user_featured_cards ufc
      JOIN user_cards uc ON ufc.user_card_id = uc.id
      JOIN cards c ON uc.card_id = c.id
      JOIN players p ON c.player_id = p.id
      WHERE ufc.user_id = ?
      ORDER BY ufc.position ASC`,
      [auth.id]
    );

    return new Response(JSON.stringify({ 
      success: true, 
      featured: featuredCards 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error getting featured cards:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: Actualizar las cartas destacadas (recibe array de 1-3 user_card_ids)
export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const userCardIds = body.user_card_ids || [];

    // Validar que sean máximo 3 cartas
    if (userCardIds.length > 3) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Máximo 3 cartas destacadas' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validar que todas las cartas pertenezcan al usuario
    if (userCardIds.length > 0) {
      const userCards = await executeQuery<any>(
        `SELECT id FROM user_cards WHERE user_id = ? AND id IN (${userCardIds.map(() => '?').join(',')})`,
        [auth.id, ...userCardIds]
      );

      if (userCards.length !== userCardIds.length) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Alguna carta no te pertenece' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Actualizar en transacción
    await executeTransaction(async (conn) => {
      // Eliminar cartas destacadas actuales
      await conn.execute(
        'DELETE FROM user_featured_cards WHERE user_id = ?',
        [auth.id]
      );

      // Insertar nuevas cartas destacadas
      for (let i = 0; i < userCardIds.length; i++) {
        await conn.execute(
          'INSERT INTO user_featured_cards (user_id, user_card_id, position) VALUES (?, ?, ?)',
          [auth.id, userCardIds[i], i + 1]
        );
      }
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Cartas destacadas actualizadas'
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error updating featured cards:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno',
      details: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
