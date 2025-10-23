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
    // Handle case where repeatable column doesn't exist yet
    let completedSet = new Set<number>();
    try {
      const rows = await executeQuery<any>(
        'SELECT sc.id as challenge_id, COALESCE(sc.repeatable, FALSE) as repeatable, ss.id as submission_id FROM sbc_challenges sc LEFT JOIN sbc_submissions ss ON sc.id = ss.challenge_id AND ss.user_id = ? WHERE sc.start_at <= NOW() AND sc.end_at >= NOW()',
        [auth.id]
      );
      completedSet = new Set(rows.filter((r: any) => r.repeatable === false && r.submission_id !== null).map((r: any) => r.challenge_id));
    } catch (error: any) {
      // If repeatable column doesn't exist, fall back to old behavior
      if (error.message.includes('repeatable') || error.message.includes('Unknown column')) {
        console.warn('SBC repeatable column not found, using fallback query');
        const rows = await executeQuery<any>(
          'SELECT sc.id as challenge_id FROM sbc_challenges sc LEFT JOIN sbc_submissions ss ON sc.id = ss.challenge_id AND ss.user_id = ? WHERE sc.start_at <= NOW() AND sc.end_at >= NOW() AND ss.id IS NOT NULL',
          [auth.id]
        );
        completedSet = new Set(rows.map((r: any) => r.challenge_id));
      } else {
        throw error;
      }
    }
    
    const enriched = challenges.map(ch => ({ 
      ...ch, 
      completed: (ch as any).repeatable ? false : completedSet.has(ch.id),
      repeatable: Boolean((ch as any).repeatable || false)
    }));

    return new Response(JSON.stringify({ success: true, challenges: enriched }), { status: 200 });
  } catch (e: any) {
    console.error('SBC list error:', e);
    console.error('Error details:', {
      message: e?.message,
      stack: e?.stack,
      name: e?.name
    });
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno', 
      details: e?.message || String(e),
      errorType: e?.name || 'Unknown'
    }), { status: 500 });
  }
};
