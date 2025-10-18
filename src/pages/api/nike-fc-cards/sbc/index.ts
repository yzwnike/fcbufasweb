import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getActiveChallenges } from '@/lib/sbc';
import { executeQuery } from '@/lib/mysql';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });

    const challenges = await getActiveChallenges();
    // Mark completed challenges for this user
    const rows = await executeQuery<any>(
      'SELECT challenge_id FROM sbc_submissions WHERE user_id = ?',
      [auth.id]
    );
    const completedSet = new Set(rows.map((r: any) => r.challenge_id));
    const enriched = challenges.map(ch => ({ ...ch, completed: completedSet.has(ch.id) }));

    return new Response(JSON.stringify({ success: true, challenges: enriched }), { status: 200 });
  } catch (e: any) {
    console.error('SBC list error:', e);
    return new Response(JSON.stringify({ success: false, error: 'Error interno', details: e?.message || String(e) }), { status: 500 });
  }
};
