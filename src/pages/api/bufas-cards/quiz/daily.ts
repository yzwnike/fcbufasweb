import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import { getDailyQuestions, getUserQuizProgress } from '@/lib/quiz';

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
    const { currentQuizDate } = await import('@/lib/quiz');
    const today = currentQuizDate();

    // Obtener progreso del usuario
    const progress = await getUserQuizProgress(userId, today);

    if (!progress.canPlayToday) {
      return new Response(JSON.stringify({
        success: true,
        alreadyCompleted: true,
        progress: {
          questionsAnswered: progress.questionsAnswered,
          correctAnswers: progress.correctAnswers,
          totalCoinsEarned: progress.totalCoinsEarned
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener preguntas del día
    const questions = await getDailyQuestions(userId, today);

    if (questions.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No se pudieron generar las preguntas del día' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Filtrar preguntas ya respondidas
    const unansweredQuestions = questions.filter(q => 
      !progress.answeredQuestions.includes(q.question_number)
    );

    return new Response(JSON.stringify({
      success: true,
      alreadyCompleted: false,
      questions: unansweredQuestions,
      progress: {
        questionsAnswered: progress.questionsAnswered,
        correctAnswers: progress.correctAnswers,
        totalCoinsEarned: progress.totalCoinsEarned
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Quiz daily API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
