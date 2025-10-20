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
      // Gate: si ya completó 5 en la ventana actual (20:00), bloquear
      const progRow = await q1<any>(
        `SELECT COALESCE(SUM(answered_count),0) AS answered_count
           FROM daily_quiz_progress 
          WHERE user_id = ? AND window_start = (
            CASE WHEN (now()::time >= time '20:00:00')
                 THEN date_trunc('day', now()) + interval '20 hours'
                 ELSE date_trunc('day', now()) - interval '4 hours'
            END
          )`,
        [Number(userId)]
      );
      const alreadyAnswered = Number(progRow?.answered_count || 0);
      if (alreadyAnswered >= 5) {
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
        const { executeTransaction } = await import('@/lib/mysql');
        const { QUIZ_CONFIG } = await import('@/lib/quiz');
        await executeTransaction(async (conn: any) => {
          // Upsert progreso
          await conn.execute(
            `WITH target AS (
               SELECT CASE WHEN (now()::time >= time '20:00:00')
                           THEN date_trunc('day', now()) + interval '20 hours'
                           ELSE date_trunc('day', now()) - interval '4 hours'
                      END AS ws
             ), up AS (
               UPDATE daily_quiz_progress dqp
                  SET answered_count = answered_count + 1,
                      correct_count  = correct_count  + CASE WHEN ? THEN 1 ELSE 0 END
                 FROM target
                WHERE dqp.user_id = ? AND dqp.window_start = (SELECT ws FROM target)
                RETURNING 1
             )
             INSERT INTO daily_quiz_progress (user_id, window_start, answered_count, correct_count)
             SELECT ?, (SELECT ws FROM target), 1, CASE WHEN ? THEN 1 ELSE 0 END
             WHERE NOT EXISTS (SELECT 1 FROM up)`,
            [
              isCorrect,
              Number(userId),
              Number(userId),
              isCorrect
            ]
          );
          if (isCorrect) {
            // Update coins + transaction
            console.log(`Quiz: Awarding ${QUIZ_CONFIG.COINS_PER_CORRECT_ANSWER} coins to user ${userId}`);
            const updateResult = await conn.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [QUIZ_CONFIG.COINS_PER_CORRECT_ANSWER, Number(userId)]);
            console.log('Quiz: Coins update result:', updateResult);
            
            await conn.execute(
              'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
              [Number(userId), QUIZ_CONFIG.COINS_PER_CORRECT_ANSWER, 'DAILY_QUIZ', 'Respuesta correcta en quiz (random)']
            );
            console.log(`Quiz: Transaction logged for user ${userId}`);
          }
        });
      } catch (error) {
        console.error('Error updating quiz progress and coins:', error);
        console.error('Error details:', {
          userId: userId,
          isCorrect: isCorrect,
          coinsToAward: isCorrect ? QUIZ_CONFIG.COINS_PER_CORRECT_ANSWER : 0,
          error: error.message || error
        });
        // Retornar error porque las monedas no se guardaron
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Error al guardar progreso y monedas. Inténtalo de nuevo.' 
        }), {
          status: 500,
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
