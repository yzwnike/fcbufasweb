import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuery } from '@/lib/mysql';

export const runtime = 'node';

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });

    const { challenge_id, user_card_ids } = await request.json();
    console.log('Debug Submit - Starting with:', { challenge_id, user_card_ids, userId: auth.id });

    // Test 1: Check the challenge exists
    let challenge;
    try {
      challenge = await executeQuery('SELECT * FROM sbc_challenges WHERE id = ?', [challenge_id]);
      console.log('Debug Submit - Challenge found:', challenge.length > 0 ? 'YES' : 'NO');
      if (challenge.length > 0) {
        console.log('Challenge details:', challenge[0]);
      }
    } catch (error: any) {
      console.error('Debug Submit - Challenge query failed:', error.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Challenge query failed', 
        details: error.message 
      }), { status: 500 });
    }

    // Test 2: Check the rewards
    let rewards;
    try {
      rewards = await executeQuery('SELECT * FROM sbc_rewards WHERE challenge_id = ?', [challenge_id]);
      console.log('Debug Submit - Rewards found:', rewards.length);
      console.log('Reward details:', rewards);
    } catch (error: any) {
      console.error('Debug Submit - Rewards query failed:', error.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Rewards query failed', 
        details: error.message 
      }), { status: 500 });
    }

    // Test 3: Check user cards
    let userCards;
    try {
      const placeholders = user_card_ids.map(() => '?').join(',');
      userCards = await executeQuery(
        `SELECT uc.id, uc.user_id, uc.card_id, p.name, p.fifa_rating, c.special_type
         FROM user_cards uc
         JOIN cards c ON uc.card_id = c.id
         JOIN players p ON c.player_id = p.id
         WHERE uc.user_id = ? AND uc.id IN (${placeholders})`,
        [auth.id, ...user_card_ids]
      );
      console.log('Debug Submit - User cards found:', userCards.length);
      console.log('User cards details:', userCards);
    } catch (error: any) {
      console.error('Debug Submit - User cards query failed:', error.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User cards query failed', 
        details: error.message 
      }), { status: 500 });
    }

    // Test 4: Check if we can create a pack entry (simulation)
    try {
      const reward = rewards[0];
      console.log('Debug Submit - Would create pack with type:', reward.pack_type);
      
      // Just test the query structure, don't actually insert
      console.log('Debug Submit - Pack creation query would be:');
      console.log('INSERT INTO packs (user_id, type, cost, opened) VALUES (?, ?, 0, 0)');
      console.log('Parameters:', [auth.id, reward.pack_type]);
    } catch (error: any) {
      console.error('Debug Submit - Pack simulation failed:', error.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Pack simulation failed', 
        details: error.message 
      }), { status: 500 });
    }

    return new Response(JSON.stringify({ 
      success: true,
      debug: {
        challenge: challenge[0] || null,
        rewards: rewards,
        userCards: userCards,
        simulation: 'All queries would work'
      }
    }), { status: 200 });

  } catch (e: any) {
    console.error('Debug Submit - Fatal error:', e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Debug failed', 
      details: e?.message || String(e),
      stack: e?.stack
    }), { status: 500 });
  }
};