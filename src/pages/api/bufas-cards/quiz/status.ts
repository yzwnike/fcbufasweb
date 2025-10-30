import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import { executeQuerySingle } from '@/lib/mysql';

export const runtime = 'node';

export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const { nextQuizResetTime, QUIZ_CONFIG, getQuizWindowBoundsStrings, currentQuizDate } = await import('@/lib/quiz');

    // Fallback anónimo si no hay token o es inválido (evitar 401 en dashboard)
    let userId: number | null = null;
    let decoded: any = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      decoded = verifyToken(token);
      if (decoded && decoded.userId) {
        userId = decoded.userId;
      }
    }

    const { start } = getQuizWindowBoundsStrings();

    // Leer progreso de la ventana diaria desde Postgres
    let answered = 0;
    let correct = 0;
    let completed = false;
    try {
      if (userId != null) {
        const row = await executeQuerySingle<any>(
          'SELECT answered_count, correct_count, completed FROM daily_quiz_progress WHERE user_id = ? AND window_start = ? LIMIT 1',
          [userId, start]
        );
        answered = Number(row?.answered_count || 0);
        correct = Number(row?.correct_count || 0);
        completed = Boolean(row?.completed || false);

        // Fallback: si no hay fila, usar users.last_daily_quiz == currentQuizDate
        if (!row) {
          const userRow = await executeQuerySingle<any>('SELECT last_daily_quiz FROM users WHERE id = ? LIMIT 1', [userId]);
          const todayStr = currentQuizDate();
          if (userRow?.last_daily_quiz && String(userRow.last_daily_quiz).startsWith(todayStr)) {
            completed = true;
            answered = 5;
          }
        }
      }
    } catch {}

    // Si no hay userId (sin token), no mostrar disponibilidad para evitar falsos "!"
    const canPlay = userId == null ? false : (!completed && (answered < QUIZ_CONFIG.QUESTIONS_PER_DAY));

    // Calcular próxima disponibilidad si no puede jugar
    let nextAvailableAt: string | null = null;
    let secondsRemaining: number | null = null;

    if (!canPlay) {
      const nextReset = nextQuizResetTime();
      nextAvailableAt = nextReset.toISOString();
      secondsRemaining = Math.max(0, Math.floor((nextReset.getTime() - Date.now()) / 1000));
    }

    return new Response(JSON.stringify({
      success: true,
      canPlay,
      questionsAnswered: answered,
      unansweredQuestions: Math.max(0, QUIZ_CONFIG.QUESTIONS_PER_DAY - answered),
      reason: canPlay ? 'has_questions' : 'all_answered',
      completed,
      nextAvailableAt,
      secondsRemaining
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Quiz status API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
