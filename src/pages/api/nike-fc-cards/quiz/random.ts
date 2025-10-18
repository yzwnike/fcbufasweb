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
  // Options must be within ±2 of correct
  const alt1 = clampStat(correct - 2);
  const alt2 = clampStat(correct + 2);
  const unique: number[] = [];
  [correct, alt1, alt2].forEach(v => { if (!unique.includes(v)) unique.push(v); });
  // Fill missing with ±1 if clamping caused duplicates
  const candidates = [clampStat(correct - 1), clampStat(correct + 1)];
  for (const c of candidates) {
    if (unique.length >= 3) break;
    if (!unique.includes(c)) unique.push(c);
  }
  // As last resort, nudge by ±2 the other way
  while (unique.length < 3) {
    const n = clampStat(correct + (Math.random() < 0.5 ? -2 : 2));
    if (!unique.includes(n)) unique.push(n);
  }
  // Shuffle
  unique.sort(() => Math.random() - 0.5);
  return { a: unique[0], b: unique[1], c: unique[2] };
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

    // Load progress for this window (compute window in SQL to avoid TZ mismatches)
    const prog = await executeQuery<any>(
      `SELECT answered_count, correct_count FROM daily_quiz_progress 
       WHERE user_id = ? AND window_start = (
         CASE WHEN (now()::time >= time '12:00:00')
              THEN date_trunc('day', now()) + interval '12 hours'
              ELSE date_trunc('day', now()) - interval '12 hours'
         END
       )
       LIMIT 1`,
      [decoded.userId]
    );
    const answeredSoFar = prog.length ? Number(prog[0].answered_count) : 0;
    const correctSoFar = prog.length ? Number(prog[0].correct_count) : 0;
    const remaining = Math.max(0, 5 - answeredSoFar);
    if (remaining <= 0) {
      return new Response(JSON.stringify({ success: true, alreadyCompleted: true, progress: { answered: answeredSoFar, correct: correctSoFar } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Pick random cards joined with players eligible for quiz
    const cards = await executeQuery<any>(
      `SELECT c.id AS card_id
            , c.image_path AS card_image_path
            , c.special_type, c.rarity
            , p.id AS player_id, p.name, p.team, p.position1, p.position2
       FROM cards c
       JOIN players p ON c.player_id = p.id
       WHERE (p.eligible_for_quiz IS NULL OR p.eligible_for_quiz = true)
         AND c.special_type IN ('Regular','OLD_GENERATION')
         AND c.image_path IS NOT NULL
       ORDER BY RANDOM()
       LIMIT ?`,
      [count * 3] // oversample a bit more with filters
    );

    const selected = cards.slice(0, remaining);

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