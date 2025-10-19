import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuery, executeQuerySingle } from '@/lib/mysql';

export const runtime = 'node';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });

    // Obtener información del usuario
    const user = await executeQuerySingle<any>('SELECT id, username, email, coins FROM users WHERE id = ?', [auth.id]);
    
    // Obtener las últimas 20 transacciones
    const transactions = await executeQuery<any>(
      'SELECT * FROM coin_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', 
      [auth.id]
    );

    // Obtener progreso de quiz de hoy
    const { currentQuizDate, getUserQuizProgress } = await import('@/lib/quiz');
    const today = currentQuizDate();
    const quizProgress = await getUserQuizProgress(auth.id, today);

    // Obtener respuestas de quiz de hoy
    const todayAnswers = await executeQuery<any>(
      `SELECT dqa.*, dqq.question_number, dqq.correct_answer, dqq.stat_name 
       FROM daily_quiz_answers dqa
       JOIN daily_quiz_questions dqq ON dqa.question_id = dqq.id
       WHERE dqa.user_id = ? AND dqq.date = ?
       ORDER BY dqq.question_number`,
      [auth.id, today]
    );

    return new Response(JSON.stringify({
      success: true,
      user,
      transactions,
      quiz: {
        today,
        progress: quizProgress,
        answers: todayAnswers
      },
      debug: {
        totalTransactionAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
        quizTransactions: transactions.filter(t => t.type === 'DAILY_QUIZ' || t.type === 'DAILY_QUIZ_BONUS'),
        lastQuizTransaction: transactions.find(t => t.type === 'DAILY_QUIZ' || t.type === 'DAILY_QUIZ_BONUS')
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Debug user coins error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
