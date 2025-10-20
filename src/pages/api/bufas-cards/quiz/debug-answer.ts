import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';

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
    const userId = decoded.userId;

    // Debug info
    const debugInfo = {
      userId,
      questionId,
      selectedAnswer,
      cardId,
      statName,
      hasQuestionId: !!questionId,
      hasCardId: !!cardId,
      hasStatName: !!statName,
      bodyReceived: body
    };

    console.log('Quiz debug info:', debugInfo);

    // Test database connection
    try {
      const { executeQuerySingle } = await import('@/lib/mysql');
      const testQuery = await executeQuerySingle('SELECT 1 as test');
      debugInfo.dbConnection = 'OK';
      debugInfo.testQuery = testQuery;
    } catch (dbError) {
      debugInfo.dbConnection = 'ERROR';
      debugInfo.dbError = dbError.message;
    }

    // If it's a daily quiz (questionId exists)
    if (questionId) {
      debugInfo.flow = 'daily';
      
      try {
        const { answerQuizQuestion } = await import('@/lib/quiz');
        console.log('About to call answerQuizQuestion with:', { userId, questionId, selectedAnswer });
        
        const result = await answerQuizQuestion(userId, questionId, selectedAnswer);
        console.log('answerQuizQuestion result:', result);
        
        debugInfo.answerResult = result;
        debugInfo.success = result.success;
        
      } catch (answerError) {
        console.error('Error in answerQuizQuestion:', answerError);
        debugInfo.answerError = answerError.message;
        debugInfo.answerErrorStack = answerError.stack;
      }
    }

    // If it's random quiz (cardId + statName)
    if (cardId && statName) {
      debugInfo.flow = 'random';
      
      try {
        // Test the window start calculation
        const { executeQuerySingle } = await import('@/lib/mysql');
        const windowStartQuery = `
          SELECT CASE WHEN (EXTRACT(HOUR FROM NOW()) >= 20)
                     THEN DATE_TRUNC('day', NOW()) + INTERVAL '20 hours'
                     ELSE DATE_TRUNC('day', NOW()) + INTERVAL '20 hours' - INTERVAL '1 day'
                 END AS window_start
        `;
        const wsResult = await executeQuerySingle(windowStartQuery);
        debugInfo.windowStart = wsResult;
        
        // Test full transaction simulation
        try {
          const { executeTransaction } = await import('@/lib/mysql');
          const isCorrect = true; // simulate correct answer
          
          await executeTransaction(async (conn: any) => {
            debugInfo.transactionStarted = true;
            
            // Test if conn.query exists
            debugInfo.connHasQuery = typeof conn.query === 'function';
            debugInfo.connHasExecute = typeof conn.execute === 'function';
            debugInfo.connKeys = Object.keys(conn);
            
            // Try the window start calculation inside transaction
            const wsResult2 = await conn.execute(windowStartQuery);
            debugInfo.transactionWindowStart = wsResult2[0][0];
            
            // Try a simple update test
            const testUpdate = await conn.execute(
              `UPDATE daily_quiz_progress 
               SET answered_count = answered_count + 1,
                   correct_count = correct_count + ?
               WHERE user_id = ? AND window_start = ?`,
              [1, Number(userId), wsResult2[0][0].window_start]
            );
            debugInfo.testUpdate = { rowCount: testUpdate[0].rowCount };
            debugInfo.transactionComplete = true;
          });
          
        } catch (transactionError) {
          debugInfo.transactionError = transactionError.message;
          debugInfo.transactionErrorStack = transactionError.stack;
        }

      } catch (randomError) {
        console.error('Error in random quiz flow:', randomError);
        debugInfo.randomError = randomError.message;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      debug: debugInfo
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Quiz debug API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor',
      debugError: error.message,
      debugStack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};