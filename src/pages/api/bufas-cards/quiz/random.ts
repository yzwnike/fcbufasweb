import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import { getCardWithPlayer } from '@/lib/cards';
import { executeQuery } from '@/lib/mysql';
import { AVAILABLE_STATS, type StatName } from '@/lib/quiz';

export const runtime = 'node';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clampStat(val: number): number {
  // Ensure stats stay within 1..99
  return Math.max(1, Math.min(99, Math.round(val)));
}

function generateOptions(correct: number): { a: number; b: number; c: number } {
  // Create all possible options within ±3 range, excluding the correct answer
  const possibleOffsets = [-3, -2, -1, 1, 2, 3];
  const possibleOptions: number[] = [];
  
  // Generate all valid options
  for (const offset of possibleOffsets) {
    const candidate = clampStat(correct + offset);
    if (candidate !== correct && !possibleOptions.includes(candidate)) {
      possibleOptions.push(candidate);
    }
  }
  
  // If we don't have enough options (edge cases), expand the range
  if (possibleOptions.length < 2) {
    const expandedOffsets = [-5, -4, 4, 5];
    for (const offset of expandedOffsets) {
      if (possibleOptions.length >= 2) break;
      const candidate = clampStat(correct + offset);
      if (candidate !== correct && !possibleOptions.includes(candidate)) {
        possibleOptions.push(candidate);
      }
    }
  }
  
  // Fisher-Yates shuffle for better randomness
  function fisherYatesShuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  // Randomly select 2 wrong answers from available options
  const wrongAnswers: number[] = [];
  const shuffledOptions = fisherYatesShuffle(possibleOptions);
  
  for (let i = 0; i < Math.min(2, shuffledOptions.length); i++) {
    wrongAnswers.push(shuffledOptions[i]);
  }
  
  // Create final array with correct answer + wrong answers
  const allOptions = [correct, ...wrongAnswers];
  
  // Shuffle final options so correct answer position is random
  const shuffledFinal = fisherYatesShuffle(allOptions);
  
  // Debug logging
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Quiz options for correct=${correct}: possibleOptions=[${possibleOptions.join(',')}], selected=[${shuffledFinal.join(',')}]`);
  
  return { 
    a: shuffledFinal[0], 
    b: shuffledFinal[1], 
    c: shuffledFinal[2] || shuffledFinal[0] // fallback in extreme cases
  };
}

function currentWindowStart(): string {
  // 12:00:00 local server time window start
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const start = now >= today ? today : new Date(today.getTime() - 24*60*60*1000);
  return start.toISOString().slice(0,19).replace('T',' ');
}

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    // No ejecutar DDL aquí; la tabla debe existir por migración
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Token requerido' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const countParam = url.searchParams.get('count');
    const count = Math.max(1, Math.min(10, Number(countParam) || 5));

    // Cargar progreso de esta ventana (calculada en servidor con zona Madrid)
    const { getQuizWindowBoundsStrings } = await import('@/lib/quiz');
    const { start } = getQuizWindowBoundsStrings();
    const progRow = await executeQuery<any>(
      `SELECT answered_count, correct_count FROM daily_quiz_progress WHERE user_id = ? AND window_start = ? LIMIT 1`,
      [decoded.userId, start]
    );
    const answeredSoFar = progRow.length ? Number(progRow[0].answered_count) : 0;
    const correctSoFar = progRow.length ? Number(progRow[0].correct_count) : 0;
    const remaining = Math.max(0, 5 - answeredSoFar);
    if (remaining <= 0) {
      return new Response(JSON.stringify({ success: true, alreadyCompleted: true, progress: { answered: answeredSoFar, correct: correctSoFar } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const fetchCount = remaining;

    // Pick random cards (excluding Nico Vehi)
    const cards = await executeQuery<any>(
      `SELECT c.id AS card_id
            , c.image_path AS card_image_path
            , c.special_type, c.rarity
            , p.id AS player_id, p.name, p.team, p.position1, p.position2
       FROM cards c
       JOIN players p ON c.player_id = p.id
       WHERE c.special_type IN ('Regular','OLD_GENERATION')
       AND p.name NOT LIKE '%Nico Vehi%'
       ORDER BY RANDOM()
       LIMIT ?`,
      [fetchCount]
    );

    const selected = cards;

    const questions = [] as any[];
    // Use only substats (exclude fifa_rating)
    const subStats = AVAILABLE_STATS.filter(s => s !== 'fifa_rating') as StatName[];
    for (const row of selected) {
      // Compute effective stats directly from DB (cards + players + overrides)
      const eff = await executeQuery<any>(
        `SELECT 
           c.id as card_id,
           c.image_path,
           p.id as player_id,
           p.name,
           COALESCE(c.position1_override, p.position1) AS eff_position1,
           COALESCE(c.position2_override, p.position2) AS eff_position2,
           LEAST(99, COALESCE(c.pace_override, p.pace)) AS eff_pace,
           LEAST(99, COALESCE(c.shooting_override, p.shooting)) AS eff_shooting,
           LEAST(99, COALESCE(c.passing_override, p.passing)) AS eff_passing,
           LEAST(99, COALESCE(c.dribbling_override, p.dribbling)) AS eff_dribbling,
           LEAST(99, COALESCE(c.defending_override, p.defending)) AS eff_defending,
           LEAST(99, COALESCE(c.physical_override, p.physical)) AS eff_physical
         FROM cards c
         JOIN players p ON c.player_id = p.id
         WHERE c.id = ?
         LIMIT 1`,
        [row.card_id]
      );
      if (!eff.length) continue;
      const e = eff[0];

      const stat: StatName = pickRandom(subStats);
      const valueMap: Record<string, number> = {
        pace: e.eff_pace,
        shooting: e.eff_shooting,
        passing: e.eff_passing,
        dribbling: e.eff_dribbling,
        defending: e.eff_defending,
        physical: e.eff_physical,
      };
      const correct = clampStat(valueMap[stat]);
      const options = generateOptions(correct);
      questions.push({
        id: `${e.card_id}-${stat}`,
        cardId: e.card_id,
        stat_name: stat,
        correct_answer: correct,
        options,
        player: {
          id: e.player_id,
          name: e.name,
          position1: e.eff_position1,
          position2: e.eff_position2,
        },
        image_path: e.image_path || null,
      });
    }

    return new Response(JSON.stringify({ success: true, questions, progress: { answered: answeredSoFar, correct: correctSoFar } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Quiz random API error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Error interno del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
