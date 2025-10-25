import type { APIRoute } from 'astro';
import { executeQuerySingle } from '@/lib/mysql';

// GET: Obtener información de una carta recién obtenida
export const GET: APIRoute = async ({ url }) => {
  try {
    const userCardId = url.searchParams.get('user_card_id');
    
    if (!userCardId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'user_card_id requerido' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener información completa de la carta y usuario
    const cardInfo = await executeQuerySingle<any>(
      `SELECT 
        u.id as user_id,
        u.username,
        p.name as player_name,
        c.image_path,
        c.rarity,
        c.special_type,
        uc.obtained_at
      FROM user_cards uc
      JOIN users u ON uc.user_id = u.id
      JOIN cards c ON uc.card_id = c.id
      JOIN players p ON c.player_id = p.id
      WHERE uc.id = ?`,
      [userCardId]
    );

    if (!cardInfo) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Carta no encontrada' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      cardInfo 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error obteniendo info de carta:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
