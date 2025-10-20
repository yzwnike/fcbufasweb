import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import { getUserQuizProgress } from '@/lib/quiz';

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
    const { currentQuizDate, getUserQuizProgress, getDailyQuestions } = await import('@/lib/quiz');
    const today = currentQuizDate();

    // Obtener progreso del usuario
    const progress = await getUserQuizProgress(userId, today);

    // Usar la MISMA lógica que /quiz/daily para determinar si hay quiz disponible
    if (!progress.canPlayToday) {
      // Si no puede jugar hoy, no hay quiz disponible
      return new Response(JSON.stringify({
        success: true,
        canPlay: false,
        reason: 'cannot_play_today'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Intentar obtener preguntas del día (igual que /quiz/daily)
    const questions = await getDailyQuestions(userId, today);
    
    if (questions.length === 0) {
      // Si no hay preguntas, no hay quiz disponible
      return new Response(JSON.stringify({
        success: true,
        canPlay: false,
        reason: 'no_questions'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Filtrar preguntas ya respondidas (igual que /quiz/daily)
    const unansweredQuestions = questions.filter(q => 
      !progress.answeredQuestions.includes(q.question_number)
    );

    // Hay quiz disponible solo si hay preguntas sin responder
    const canPlay = unansweredQuestions.length > 0;

    return new Response(JSON.stringify({
      success: true,
      canPlay: canPlay,
      questionsAnswered: progress.questionsAnswered,
      unansweredQuestions: unansweredQuestions.length,
      reason: canPlay ? 'has_questions' : 'all_answered'
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