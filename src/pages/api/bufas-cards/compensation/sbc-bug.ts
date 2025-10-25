import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuerySingle, executeTransaction } from '@/lib/mysql';

const AFFECTED_USERS = ['PermaGOD', 'joan', 'BANCO_NACIONAL'];
const COMPENSATION_TYPE = 'SBC_84_BUG_2025';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar si el usuario está en la lista de afectados
    if (!AFFECTED_USERS.includes(auth.username)) {
      return new Response(JSON.stringify({ 
        success: true, 
        eligible: false 
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar si ya reclamó la compensación
    const claimed = await executeQuerySingle<any>(
      'SELECT id FROM bug_compensations WHERE user_id = ? AND compensation_type = ?',
      [auth.id, COMPENSATION_TYPE]
    );

    return new Response(JSON.stringify({ 
      success: true, 
      eligible: !claimed,
      alreadyClaimed: !!claimed
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error checking compensation:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar si el usuario está en la lista de afectados
    if (!AFFECTED_USERS.includes(auth.username)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No eres elegible para esta compensación' 
      }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar si ya reclamó
    const claimed = await executeQuerySingle<any>(
      'SELECT id FROM bug_compensations WHERE user_id = ? AND compensation_type = ?',
      [auth.id, COMPENSATION_TYPE]
    );

    if (claimed) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Ya reclamaste esta compensación' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Dar el sobre y marcar como reclamado en una transacción
    const packId = await executeTransaction(async (conn) => {
      // Crear el sobre
      const [packResult] = await conn.execute(
        'INSERT INTO packs (user_id, type, cost, opened) VALUES (?, ?, 0, FALSE)',
        [auth.id, 'MEDIA_84_PLUS']
      );
      
      const newPackId = (packResult as any).insertId;

      // Marcar compensación como reclamada
      await conn.execute(
        'INSERT INTO bug_compensations (user_id, compensation_type) VALUES (?, ?)',
        [auth.id, COMPENSATION_TYPE]
      );

      return newPackId;
    });

    console.log(`✅ Compensación entregada a ${auth.username} (pack ID: ${packId})`);

    return new Response(JSON.stringify({ 
      success: true,
      packId: packId
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error claiming compensation:', error);
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
