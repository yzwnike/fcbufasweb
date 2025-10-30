import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/mysql';

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

    const body = await request.json().catch(() => ({}));
    const answered = Math.max(0, Number(body?.answered ?? 5));
    const correct = Math.max(0, Number(body?.correct ?? 0));

    const { getQuizWindowBoundsStrings } = await import('@/lib/quiz');
    const { start } = getQuizWindowBoundsStrings();

    // Asegurar tabla
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS daily_quiz_progress (
        user_id BIGINT NOT NULL,
        window_start timestamptz NOT NULL,
        answered_count INT NOT NULL DEFAULT 0,
        correct_count INT NOT NULL DEFAULT 0,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at timestamptz DEFAULT NOW(),
        PRIMARY KEY (user_id, window_start)
      )
    `);
    await executeQuery(`ALTER TABLE daily_quiz_progress ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT FALSE`);

    // Marcar completado (usar GREATEST para no reducir valores)
    await executeQuery(
      `INSERT INTO daily_quiz_progress (user_id, window_start, answered_count, correct_count, completed)
       VALUES (?, ?, ?, ?, TRUE)
       ON CONFLICT (user_id, window_start)
       DO UPDATE SET 
         answered_count = GREATEST(daily_quiz_progress.answered_count, EXCLUDED.answered_count),
         correct_count  = GREATEST(daily_quiz_progress.correct_count, EXCLUDED.correct_count),
         completed      = TRUE`,
      [decoded.userId, start, Math.max(5, answered), correct]
    );

    // También marcar en tabla users para fallback
    const { currentQuizDate } = await import('@/lib/quiz');
    const quizDate = currentQuizDate();
    await executeQuery('UPDATE users SET last_daily_quiz = ? WHERE id = ?', [quizDate, decoded.userId]);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('mark-complete error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};