import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/mysql';
import { generateDailyQuestions, currentQuizDate } from '@/lib/quiz';

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

    // Only allow admins to reset (you can modify this check)
    // For now, allowing any authenticated user for testing
    
    const today = currentQuizDate();
    
    // First get question IDs that will be deleted
    const questionIds = await executeQuery<any>(
      'SELECT id FROM daily_quiz_questions WHERE date = ?',
      [today]
    );
    
    // Delete existing answers for today
    if (questionIds.length > 0) {
      const ids = questionIds.map(q => q.id);
      const placeholders = ids.map(() => '?').join(',');
      await executeQuery(
        `DELETE FROM daily_quiz_answers WHERE question_id IN (${placeholders})`,
        ids
      );
    }
    
    // Delete existing questions for today
    await executeQuery(
      'DELETE FROM daily_quiz_questions WHERE date = ?',
      [today]
    );
    
    // Generate new questions
    const generated = await generateDailyQuestions(today);
    
    if (!generated) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No se pudieron generar nuevas preguntas' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Preguntas del quiz reseteadas para ${today}` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Quiz reset API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};