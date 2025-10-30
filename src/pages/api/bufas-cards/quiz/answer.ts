import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import { answerQuizQuestion, getUserQuizProgress, processDailyQuizPayout, QUIZ_CONFIG } from '@/lib/quiz';

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
    const { questionId, selectedAnswer, cardId, statName } = body || {};

    if (typeof selectedAnswer !== 'number') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'selectedAnswer debe ser un número' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = decoded.userId;

    // Ruta 1: flujo diario con questionId
    if (questionId) {
      const result = await answerQuizQuestion(userId, questionId, selectedAnswer);
      if (!result.success) {
        return new Response(JSON.stringify({ success: false, error: result.error }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      
      // Verificar si completó todas las preguntas del día para calcular payout final
      const { currentQuizDate } = await import('@/lib/quiz');
      const today = currentQuizDate();
      const progress = await getUserQuizProgress(userId, today);
      
      // El payout de esta respuesta específica (ya se otorgó en answerQuizQuestion)
      let thisQuestionCoins = result.coinsEarned;
      let bonusInfo = null;
      
      // Si completó las 5 preguntas, procesar bonificaciones
      if (progress.questionsAnswered === QUIZ_CONFIG.QUESTIONS_PER_DAY) {
        console.log(`User ${userId} completed all ${QUIZ_CONFIG.QUESTIONS_PER_DAY} questions, processing bonuses`);
        
        // Procesar las bonificaciones adicionales
        const payoutResult = await processDailyQuizPayout(userId, today);
        
        // Calcular bonificaciones que se aplicaron
        const { calculateDailyQuizPayout } = await import('@/lib/quiz');
        const payoutData = await calculateDailyQuizPayout(userId, today);
        
        console.log(`Payout data:`, payoutData);
        
        bonusInfo = {
          perfectBonus: payoutData.perfectBonus,
          streakBonus: payoutData.streakBonus,
          totalQuestions: QUIZ_CONFIG.QUESTIONS_PER_DAY,
          correctAnswers: progress.correctAnswers,
          completed: true,
          totalEarnedToday: payoutData.totalPayout
        };
        
        // Solo mostrar las bonificaciones en la respuesta (no sumar al payout base)
        // Las monedas ya se otorgaron en processDailyQuizPayout
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        isCorrect: result.isCorrect, 
        correctAnswer: result.correctAnswer, 
        coinsEarned: thisQuestionCoins,
        progress: {
          questionsAnswered: progress.questionsAnswered,
          correctAnswers: progress.correctAnswers,
          totalQuestions: QUIZ_CONFIG.QUESTIONS_PER_DAY
        },
        bonus: bonusInfo
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Ruta 2: compatibilidad con flujo random (cardId + statName)
    if (cardId && statName) {
      const { executeQuerySingle: q1, executeQuery: q, executeTransaction } = await import('@/lib/mysql');
      const { getQuizWindowBoundsStrings, QUIZ_CONFIG } = await import('@/lib/quiz');
      const { start } = getQuizWindowBoundsStrings();

      // Asegurar tabla (idempotente y compatible)
      await q(`
        CREATE TABLE IF NOT EXISTS daily_quiz_progress (
          user_id BIGINT NOT NULL,
          window_start timestamp NOT NULL,
          answered_count INT NOT NULL DEFAULT 0,
          correct_count INT NOT NULL DEFAULT 0,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          created_at timestamp DEFAULT NOW(),
          PRIMARY KEY (user_id, window_start)
        )
      `);
      // Asegurar columna completed en esquemas antiguos
      await q(`ALTER TABLE daily_quiz_progress ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT FALSE`);

      // Gate: si ya completó 5 en la ventana actual (20:00 Madrid), bloquear
      const progRow = await q1<any>(
        `SELECT answered_count, completed FROM daily_quiz_progress WHERE user_id = ? AND window_start = ? LIMIT 1`,
        [Number(userId), start]
      );
      const alreadyAnswered = Number(progRow?.answered_count || 0);
      const alreadyCompleted = Boolean(progRow?.completed || false);
      if (alreadyCompleted || alreadyAnswered >= 5) {
        return new Response(JSON.stringify({ success: false, error: 'Quiz ya completado hasta las 20:00' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // Obtener stat desde la carta/jugador
      const row = await (await import('@/lib/mysql')).executeQuerySingle<any>(
        `SELECT 
           COALESCE(c.pace_override, p.pace) AS pace,
           COALESCE(c.shooting_override, p.shooting) AS shooting,
           COALESCE(c.passing_override, p.passing) AS passing,
           COALESCE(c.dribbling_override, p.dribbling) AS dribbling,
           COALESCE(c.defending_override, p.defending) AS defending,
           COALESCE(c.physical_override, p.physical) AS physical,
           COALESCE(c.fifa_rating_override, p.fifa_rating) AS fifa_rating
         FROM cards c
         JOIN players p ON p.id = c.player_id
         WHERE c.id = ?
         LIMIT 1`,
        [Number(cardId)]
      );
      if (!row) {
        return new Response(JSON.stringify({ success: false, error: 'Carta no encontrada' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const val = Number(row[String(statName)] ?? NaN);
      if (Number.isNaN(val)) {
        return new Response(JSON.stringify({ success: false, error: 'Stat inválida' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const clamp = (n: number) => Math.max(1, Math.min(99, Math.round(n)));
      const correctAnswer = clamp(val);
      const isCorrect = Number(selectedAnswer) === correctAnswer;

      // Persistencia: SELECT FOR UPDATE y luego INSERT/UPDATE manual para compatibilidad
      try {
        await executeTransaction(async (conn: any) => {
          // Lock row if exists
          const [rows] = await conn.execute(
            'SELECT answered_count, correct_count, completed FROM daily_quiz_progress WHERE user_id = ? AND window_start = ? FOR UPDATE',
            [Number(userId), start]
          );
          const hasRow = Array.isArray(rows) && rows.length > 0;
          if (hasRow) {
            await conn.execute(
              'UPDATE daily_quiz_progress SET answered_count = answered_count + 1, correct_count = correct_count + ?, completed = (answered_count + 1) >= 5 OR completed WHERE user_id = ? AND window_start = ?'
              , [isCorrect ? 1 : 0, Number(userId), start]
            );
          } else {
            await conn.execute(
              'INSERT INTO daily_quiz_progress (user_id, window_start, answered_count, correct_count, completed) VALUES (?, ?, 1, ?, FALSE)'
              , [Number(userId), start, isCorrect ? 1 : 0]
            );
          }

          if (isCorrect) {
            await conn.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [QUIZ_CONFIG.COINS_PER_CORRECT_ANSWER, Number(userId)]);
            try {
              await conn.execute(
                'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
                [Number(userId), QUIZ_CONFIG.COINS_PER_CORRECT_ANSWER, 'DAILY_QUIZ', 'Respuesta correcta en quiz (random)']
              );
            } catch (e) {
              console.warn('coin_transactions insert failed (random flow), continuing:', (e as any)?.message);
            }
          }
        });
      } catch (error) {
        console.error('Error updating quiz progress and coins (compat path):', error);
        const coinsEarned = 0;
        return new Response(JSON.stringify({ success: true, isCorrect, correctAnswer, coinsEarned, warning: 'persist_failed' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      const coinsEarned = isCorrect ? QUIZ_CONFIG.COINS_PER_CORRECT_ANSWER : 0;
      return new Response(JSON.stringify({ success: true, isCorrect, correctAnswer, coinsEarned }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Faltan parámetros
    return new Response(JSON.stringify({ success: false, error: 'Datos requeridos: questionId y selectedAnswer' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Quiz answer API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
