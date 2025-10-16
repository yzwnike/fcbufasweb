import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import { createFantasySelection, updateFantasySelection, getUserFantasySelection } from '@/lib/fantasy';

export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Token requerido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = decoded.userId;
    
    // Obtener la selección actual del usuario
    const selection = await getUserFantasySelection(userId);

    return new Response(JSON.stringify({
      success: true,
      selection
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fantasy selection GET API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Token requerido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { forwardPlayerId, midfielderPlayerId, defenderPlayerId } = body;

    // Validar datos de entrada
    if (!forwardPlayerId || !midfielderPlayerId || !defenderPlayerId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Se requieren forwardPlayerId, midfielderPlayerId y defenderPlayerId' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = decoded.userId;

    // Crear nueva selección
    const result = await createFantasySelection(userId, {
      forwardPlayerId,
      midfielderPlayerId,
      defenderPlayerId
    });

    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      fantasyRushId: result.fantasyRushId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fantasy selection POST API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Token requerido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { fantasyRushId, forwardPlayerId, midfielderPlayerId, defenderPlayerId } = body;

    // Validar datos de entrada
    if (!fantasyRushId || !forwardPlayerId || !midfielderPlayerId || !defenderPlayerId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Se requieren fantasyRushId, forwardPlayerId, midfielderPlayerId y defenderPlayerId' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = decoded.userId;

    // Actualizar selección existente
    const result = await updateFantasySelection(userId, fantasyRushId, {
      forwardPlayerId,
      midfielderPlayerId,
      defenderPlayerId
    });

    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fantasy selection PUT API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};