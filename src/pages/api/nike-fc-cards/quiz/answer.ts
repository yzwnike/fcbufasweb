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
    const { questionId, selectedAnswer } = body;

    // Validar datos de entrada
    if (!questionId || selectedAnswer === undefined) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Datos requeridos: questionId y selectedAnswer' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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

    // Procesar respuesta
    const result = await answerQuizQuestion(userId, questionId, selectedAnswer);

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