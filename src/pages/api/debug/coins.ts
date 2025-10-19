import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuery } from '@/lib/mysql';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    }

    // Obtener información actual del usuario
    const user = await executeQuery<any>('SELECT id, username, coins FROM users WHERE id = ?', [auth.id]);
    
    // Obtener últimas transacciones de monedas
    const transactions = await executeQuery<any>(
      `SELECT amount, type, description, created_at 
       FROM coin_transactions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [auth.id]
    );

    // Obtener progreso del quiz diario
    const quizProgress = await executeQuery<any>(
      `SELECT answered_count, correct_count, window_start 
       FROM daily_quiz_progress 
       WHERE user_id = ? 
       ORDER BY window_start DESC 
       LIMIT 3`,
      [auth.id]
    );

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      user: user[0] || null,
      recentTransactions: transactions,
      quizProgress: quizProgress,
      debug: {
        userId: auth.id,
        currentHour: new Date().getHours(),
        isAfter20: new Date().getHours() >= 20
      }
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Debug coins error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};