import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import { buyPremiumPack, buySpecialPack } from '@/lib/packs';

export const runtime = 'node';

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
    const { packType } = body;

    if (!packType || !['premium', 'special'].includes(packType)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Tipo de sobre requerido: premium o special' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = decoded.userId;

    let result;
    if (packType === 'premium') {
      result = await buyPremiumPack(userId);
    } else {
      result = await buySpecialPack(userId);
    }

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
      cards: result.cards,
      coinsSpent: result.coinsSpent
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Buy pack API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
