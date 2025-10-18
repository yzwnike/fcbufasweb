import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import { answerQuizQuestion } from '@/lib/quiz';

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
      return new Response(JSON.stringify({ success: true, isCorrect: result.isCorrect, correctAnswer: result.correctAnswer, coinsEarned: result.coinsEarned }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Ruta 2: compatibilidad con flujo random (cardId + statName)
    if (cardId && statName) {
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
      // Sin persistencia en random: respondemos resultado sin tocar monedas/diario
      return new Response(JSON.stringify({ success: true, isCorrect, correctAnswer, coinsEarned: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Faltan parámetros
    return new Response(JSON.stringify({ success: false, error: 'Datos requeridos: questionId y selectedAnswer' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

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
      isCorrect: result.isCorrect,
      correctAnswer: result.correctAnswer,
      coinsEarned: result.coinsEarned
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

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