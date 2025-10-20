import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getActiveChallenges } from '@/lib/sbc';
import { executeQuery } from '@/lib/mysql';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });

    const challenges = await getActiveChallenges();
    // Mark completed challenges for this user (only for non-repeatable challenges)
    const rows = await executeQuery<any>(
      'SELECT sc.id as challenge_id, sc.repeatable FROM sbc_challenges sc LEFT JOIN sbc_submissions ss ON sc.id = ss.challenge_id AND ss.user_id = ? WHERE sc.start_at <= NOW() AND sc.end_at >= NOW()',
      [auth.id]
    );
    const completedSet = new Set(rows.filter((r: any) => r.repeatable === 0 && r.challenge_id).map((r: any) => r.challenge_id));
    const enriched = challenges.map(ch => ({ 
      ...ch, 
      completed: ch.repeatable ? false : completedSet.has(ch.id),
      repeatable: Boolean(ch.repeatable)
    }));

    return new Response(JSON.stringify({ success: true, challenges: enriched }), { status: 200 });
  } catch (e: any) {
    console.error('SBC list error:', e);
    return new Response(JSON.stringify({ success: false, error: 'Error interno', details: e?.message || String(e) }), { status: 500 });
  }
};
