import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { debugOptionDistribution, type StatName } from '@/lib/quiz';

export const runtime = 'node';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Solo para usuarios autenticados (por seguridad)
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });

    // Obtener parámetros de la URL
    const searchParams = url.searchParams;
    const correctAnswer = parseInt(searchParams.get('answer') || '80');
    const statName = (searchParams.get('stat') || 'fifa_rating') as StatName;
    const iterations = parseInt(searchParams.get('iterations') || '1000');

    // Validar parámetros
    if (isNaN(correctAnswer) || correctAnswer < 1 || correctAnswer > 99) {
      return new Response(JSON.stringify({ success: false, error: 'Respuesta correcta debe estar entre 1 y 99' }), { status: 400 });
    }

    if (iterations < 10 || iterations > 10000) {
      return new Response(JSON.stringify({ success: false, error: 'Iteraciones debe estar entre 10 y 10000' }), { status: 400 });
    }

    // Ejecutar test de distribución
    const results = debugOptionDistribution(correctAnswer, statName, iterations);
    
    // Calcular porcentajes de distribución
    const total = results.positionDistribution.a + results.positionDistribution.b + results.positionDistribution.c;
    const percentages = {
      a: Math.round((results.positionDistribution.a / total) * 100 * 100) / 100,
      b: Math.round((results.positionDistribution.b / total) * 100 * 100) / 100,
      c: Math.round((results.positionDistribution.c / total) * 100 * 100) / 100
    };

    return new Response(JSON.stringify({
      success: true,
      testParams: {
        correctAnswer,
        statName,
        iterations
      },
      results: {
        positionDistribution: results.positionDistribution,
        positionPercentages: percentages,
        optionRanges: results.optionRanges,
        analysis: {
          isBalanced: Math.abs(percentages.a - 33.33) < 5 && Math.abs(percentages.b - 33.33) < 5 && Math.abs(percentages.c - 33.33) < 5,
          averageDistance: results.optionRanges.average,
          withinDesiredRange: results.optionRanges.max <= 6
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Debug options error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
