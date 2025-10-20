import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuery } from '@/lib/mysql';

export const runtime = 'node';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });

    console.log('Debug SBC - Starting...');

    // Test 1: Check if we can query sbc_challenges at all
    let basicQuery;
    try {
      basicQuery = await executeQuery('SELECT id, code, title FROM sbc_challenges LIMIT 5');
      console.log('Debug SBC - Basic query successful:', basicQuery.length, 'challenges found');
    } catch (error: any) {
      console.error('Debug SBC - Basic query failed:', error.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Basic query failed', 
        details: error.message 
      }), { status: 500 });
    }

    // Test 2: Check if repeatable column exists
    let repeatableTest;
    try {
      repeatableTest = await executeQuery('SELECT id, code, repeatable FROM sbc_challenges LIMIT 1');
      console.log('Debug SBC - Repeatable column exists');
    } catch (error: any) {
      console.log('Debug SBC - Repeatable column does not exist:', error.message);
      repeatableTest = null;
    }

    // Test 3: Check specific challenge
    let specificChallenge;
    try {
      specificChallenge = await executeQuery("SELECT * FROM sbc_challenges WHERE code = 'MEJORA_84_PLUS'");
      console.log('Debug SBC - MEJORA_84_PLUS found:', specificChallenge.length > 0);
    } catch (error: any) {
      console.error('Debug SBC - Specific challenge query failed:', error.message);
      specificChallenge = null;
    }

    // Test 4: Check active challenges
    let activeQuery;
    try {
      activeQuery = await executeQuery('SELECT id, code, title, start_at, end_at FROM sbc_challenges WHERE start_at <= NOW() AND end_at >= NOW()');
      console.log('Debug SBC - Active challenges:', activeQuery.length, 'found');
    } catch (error: any) {
      console.error('Debug SBC - Active challenges query failed:', error.message);
      activeQuery = null;
    }

    return new Response(JSON.stringify({ 
      success: true,
      debug: {
        basicQuery: basicQuery.map(c => ({ id: c.id, code: c.code, title: c.title })),
        repeatableColumnExists: repeatableTest !== null,
        mejora84PlusExists: specificChallenge && specificChallenge.length > 0,
        mejora84PlusDetails: specificChallenge && specificChallenge.length > 0 ? specificChallenge[0] : null,
        activeChallenges: activeQuery ? activeQuery.map(c => ({ 
          id: c.id, 
          code: c.code, 
          title: c.title,
          start_at: c.start_at,
          end_at: c.end_at
        })) : null,
        userId: auth.id
      }
    }), { status: 200 });

  } catch (e: any) {
    console.error('Debug SBC - Fatal error:', e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Debug failed', 
      details: e?.message || String(e),
      stack: e?.stack
    }), { status: 500 });
  }
};