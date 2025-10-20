import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';

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

    const userId = decoded.userId;
    const { executeQuery } = await import('@/lib/mysql');

    // Consultar progreso directo de la BD
    const directProgress = await executeQuery(
      'SELECT * FROM daily_quiz_progress WHERE user_id = ? ORDER BY window_start DESC LIMIT 5',
      [userId]
    );

    // Calcular window_start actual
    const windowStartQuery = `
      SELECT CASE WHEN (EXTRACT(HOUR FROM NOW()) >= 20)
                 THEN DATE_TRUNC('day', NOW()) + INTERVAL '20 hours'
                 ELSE DATE_TRUNC('day', NOW()) + INTERVAL '20 hours' - INTERVAL '1 day'
             END AS current_window_start
    `;
    const currentWindow = await executeQuery(windowStartQuery);

    // Consultar progreso para la ventana actual específicamente
    const todayProgress = await executeQuery(
      `SELECT * FROM daily_quiz_progress 
       WHERE user_id = ? AND window_start = (
         CASE WHEN (EXTRACT(HOUR FROM NOW()) >= 20)
              THEN DATE_TRUNC('day', NOW()) + INTERVAL '20 hours'
              ELSE DATE_TRUNC('day', NOW()) + INTERVAL '20 hours' - INTERVAL '1 day'
         END
       )`,
      [userId]
    );

    // También probar getUserQuizProgress
    let progressFunctionResult;
    try {
      const { getUserQuizProgress, currentQuizDate } = await import('@/lib/quiz');
      const today = currentQuizDate();
      progressFunctionResult = await getUserQuizProgress(userId, today);
    } catch (error) {
      progressFunctionResult = { error: error.message };
    }

    return new Response(JSON.stringify({
      success: true,
      debug: {
        userId,
        directProgress,
        currentWindow: currentWindow[0],
        todayProgress,
        progressFunctionResult,
        now: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Quiz debug progress API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor',
      debugError: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};