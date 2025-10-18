import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import { getFreePackCooldown, calculateSpeedupCost } from '@/lib/packs';

export const runtime = 'node';

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

    // Obtener estado del sobre gratuito
    const freePackCooldown = await getFreePackCooldown(userId);
    
    let speedupCost = 0;
    if (!freePackCooldown.canClaimFree) {
      speedupCost = calculateSpeedupCost(
        freePackCooldown.hoursRemaining, 
        freePackCooldown.minutesRemaining
      );
    }

    return new Response(JSON.stringify({
      success: true,
      freePackStatus: {
        canClaim: freePackCooldown.canClaimFree,
        nextFreePackTime: freePackCooldown.nextFreePackTime,
        hoursRemaining: freePackCooldown.hoursRemaining,
        minutesRemaining: freePackCooldown.minutesRemaining,
        speedupCost
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Pack status API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};