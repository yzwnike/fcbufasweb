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
      const { executeQuerySingle: q1, executeQuery: q } = await import('@/lib/mysql');
      const { getQuizWindowBoundsStrings } = await import('@/lib/quiz');
      const { start } = getQuizWindowBoundsStrings();

      // Asegurar tabla en Postgres (idempotente)
      await q(`
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
      // Garantizar índice único si la tabla existe con esquema antiguo
      await q(`CREATE UNIQUE INDEX IF NOT EXISTS dqp_uniq ON daily_quiz_progress(user_id, window_start)`);
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

      // Persistencia mínima para random: sumar progreso y monedas en ventana diaria (20:00)
      try {
        const { executeTransaction, executeQuery } = await import('@/lib/mysql');
        const { QUIZ_CONFIG, getQuizWindowBoundsStrings } = await import('@/lib/quiz');
        const { start } = getQuizWindowBoundsStrings();
        // Intento 1: transacción atómica
        try {
          await executeTransaction(async (conn: any) => {
            // UPSERT progreso
            await conn.execute(
              `INSERT INTO daily_quiz_progress (user_id, window_start, answered_count, correct_count, completed)
               VALUES (?, ?, 1, ?, false)
               ON CONFLICT (user_id, window_start)
               DO UPDATE SET 
                 answered_count = daily_quiz_progress.answered_count + 1,
                 correct_count  = daily_quiz_progress.correct_count + EXCLUDED.correct_count,
                 completed      = daily_quiz_progress.completed OR (daily_quiz_progress.answered_count + EXCLUDED.answered_count) >= 5
               RETURNING user_id AS id`,
              [Number(userId), start, isCorrect ? 1 : 0]
            );
            if (isCorrect) {
              // Monedas y transacción (tolerante a fallos)
              try {
                await conn.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [QUIZ_CONFIG.COINS_PER_CORRECT_ANSWER, Number(userId)]);
                await conn.execute(
                  'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
                  [Number(userId), QUIZ_CONFIG.COINS_PER_CORRECT_ANSWER, 'DAILY_QUIZ', 'Respuesta correcta en quiz (random)']
                );
              } catch (coinErr) {
                console.error('Coin award failed (TX path), continuing without coins:', coinErr);
              }
            }
          });
        } catch (txErr) {
          console.error('TX failed, retrying non-transactional path:', txErr);
          // Intento 2: sin transacción, de forma secuencial
          await executeQuery(
            `INSERT INTO daily_quiz_progress (user_id, window_start, answered_count, correct_count, completed)
             VALUES (?, ?, 1, ?, false)
             ON CONFLICT (user_id, window_start)
             DO UPDATE SET 
               answered_count = daily_quiz_progress.answered_count + 1,
               correct_count  = daily_quiz_progress.correct_count + EXCLUDED.correct_count,
               completed      = daily_quiz_progress.completed OR (daily_quiz_progress.answered_count + EXCLUDED.answered_count) >= 5`,
            [Number(userId), start, isCorrect ? 1 : 0]
          );
          if (isCorrect) {
            try {
              await executeQuery('UPDATE users SET coins = coins + ? WHERE id = ?', [QUIZ_CONFIG.COINS_PER_CORRECT_ANSWER, Number(userId)]);
              await executeQuery(
                'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
                [Number(userId), QUIZ_CONFIG.COINS_PER_CORRECT_ANSWER, 'DAILY_QUIZ', 'Respuesta correcta en quiz (random)']
              );
            } catch (coinErr2) {
              console.error('Coin award failed (non-TX path), continuing without coins:', coinErr2);
            }
          }
        }
      } catch (error) {
        console.error('Error updating quiz progress and coins (final):', error);
        // No bloquear el flujo: devolver respuesta correcta/incorrecta sin monedas
        const coinsEarned = isCorrect ? 0 : 0;
        return new Response(JSON.stringify({ 
          success: true,
          isCorrect,
          correctAnswer,
          coinsEarned,
          warning: 'persist_failed'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
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
