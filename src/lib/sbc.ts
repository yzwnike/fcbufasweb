import { executeQuery, executeQuerySingle, executeTransaction, type SbcChallenge, type SbcReward } from './mysql';

export interface ActiveSbc extends SbcChallenge {
  rewards: SbcReward[];
}

export async function getActiveChallenges(now = new Date()): Promise<ActiveSbc[]> {
  // Use DB timezone for windowing to avoid JS/DB TZ mismatches
  // Handle case where repeatable column might not exist
  let challenges: any[] = [];
  try {
    challenges = await executeQuery<SbcChallenge>(
      'SELECT *, COALESCE(repeatable, FALSE) as repeatable FROM sbc_challenges WHERE start_at <= NOW() AND end_at >= NOW() ORDER BY start_at ASC'
    );
  } catch (error: any) {
    if (error.message.includes('repeatable') || error.message.includes('Unknown column')) {
      console.warn('SBC repeatable column not found in getActiveChallenges, using fallback');
      challenges = await executeQuery<any>(
        'SELECT *, FALSE as repeatable FROM sbc_challenges WHERE start_at <= NOW() AND end_at >= NOW() ORDER BY start_at ASC'
      );
    } else {
      throw error;
    }
  }
  if (!challenges || challenges.length === 0) {
    return [];
  }
  // Fetch rewards with a safe IN clause
  const ids = challenges.map(c => c.id);
  let rewards: SbcReward[] = [];
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    rewards = await executeQuery<SbcReward>(
      `SELECT * FROM sbc_rewards WHERE challenge_id IN (${placeholders})`,
      ids as any
    );
  }
  // Enrich CARD rewards with card image/player name for preview
  const cardIds = rewards.filter(r => r.reward_type === 'CARD' && r.card_id).map(r => r.card_id!) as number[];
  let cardMap: Record<number, { image_path: string | null; player_name: string | null }> = {};
  if (cardIds.length) {
    const ph = cardIds.map(() => '?').join(',');
    const rows = await executeQuery<any>(
      `SELECT c.id, c.image_path, p.name AS player_name
       FROM cards c JOIN players p ON p.id = c.player_id
       WHERE c.id IN (${ph})`,
      cardIds as any
    );
    for (const r of rows) cardMap[r.id] = { image_path: r.image_path || null, player_name: r.player_name || null };
  }
  const grouped: Record<number, SbcReward[]> = {};
  for (const r of rewards) {
    if (r.reward_type === 'CARD' && r.card_id && cardMap[r.card_id]) {
      (r as any).card_image_path = cardMap[r.card_id].image_path;
      (r as any).player_name = cardMap[r.card_id].player_name;
    }
    grouped[r.challenge_id] = grouped[r.challenge_id] || [];
    grouped[r.challenge_id].push(r);
  }
  // Normalize requirements in case JSON is returned as string
  return challenges.map((c) => {
    let req: any = c.requirements;
    // Handle different JSON formats (MySQL string vs PostgreSQL object)
    if (typeof req === 'string') {
      try { 
        req = JSON.parse(req); 
      } catch (error) { 
        console.warn('Failed to parse requirements JSON for challenge', c.id, ':', req);
        req = {}; 
      }
    } else if (req === null || req === undefined) {
      req = {};
    }
    // Ensure req is an object
    if (typeof req !== 'object') {
      console.warn('Requirements is not an object for challenge', c.id, ':', req);
      req = {};
    }
    return { ...c, requirements: req, rewards: grouped[c.id] || [] };
  });
}

export async function validateSubmission(
  userId: number,
  challengeId: number,
  userCardIds: number[]
): Promise<{ ok: boolean; reasons: string[]; stats?: { count: number; avg: number; specials: number } } > {
  const challenge = await executeQuerySingle<SbcChallenge>('SELECT * FROM sbc_challenges WHERE id = ?', [challengeId]);
  if (!challenge) return { ok: false, reasons: ['Desafío no encontrado'] };
  
  // Parse requirements JSON if it's a string (PostgreSQL returns JSON as string)
  let req: any = challenge.requirements || {};
  if (typeof req === 'string') {
    try {
      req = JSON.parse(req);
    } catch (error) {
      console.warn('Failed to parse requirements JSON in validateSubmission:', req);
      req = {};
    }
  }
  const min = (req.min_players ?? 1);
  const max = (req.max_players ?? 7);
  const minAvg = (req.min_avg_rating ?? 0);
  const minSpecial = (req.min_special_cards ?? 0);

  const ids = Array.from(new Set(userCardIds)).filter(n => Number.isFinite(n));
  if (ids.length < min || ids.length > max) {
    return { ok: false, reasons: [`Número de cartas: ${ids.length} (debe ser entre ${min}-${max})`] };
  }

  // Fetch selected cards with player rating, special_type, and card_asset_basename
  const rows = await executeQuery<any>(
    `SELECT uc.id as user_card_id, p.fifa_rating, c.special_type, p.card_asset_basename
       FROM user_cards uc
       JOIN cards c ON uc.card_id = c.id
       JOIN players p ON c.player_id = p.id
      WHERE uc.user_id = ? AND uc.id IN (${ids.map(() => '?').join(',')})`,
    [userId, ...ids]
  );
  if (rows.length !== ids.length) return { ok: false, reasons: ['Alguna carta no existe o no es tuya'] };

  const count = rows.length;
  const avg = Math.round(rows.reduce((a, r) => a + r.fifa_rating, 0) / count);
  const specials = rows.filter(r => r.special_type !== 'Regular' && r.special_type !== 'OLD_GENERATION').length;

  const reasons: string[] = [];
  if (avg < minAvg) reasons.push(`Media ${avg} < mínima ${minAvg}`);
  if (specials < minSpecial) reasons.push(`Especiales ${specials} < mínimo ${minSpecial}`);

  // Check required_players if specified
  const requiredPlayers = req.required_players || [];
  if (Array.isArray(requiredPlayers) && requiredPlayers.length > 0) {
    for (const reqPlayer of requiredPlayers) {
      const basename = reqPlayer.card_asset_basename;
      const minCount = reqPlayer.min_count || 1;
      const requiredSpecialType = reqPlayer.special_type || null;
      
      // Count cards matching this player requirement
      const matchingCards = rows.filter((r: any) => {
        const basenameMatch = r.card_asset_basename === basename;
        const specialMatch = !requiredSpecialType || r.special_type === requiredSpecialType;
        return basenameMatch && specialMatch;
      });
      
      if (matchingCards.length < minCount) {
        const specialDesc = requiredSpecialType ? ` (${requiredSpecialType})` : '';
        reasons.push(`Requiere mínimo ${minCount} carta(s) de ${basename}${specialDesc} (tienes ${matchingCards.length})`);
      }
    }
  }

  return { ok: reasons.length === 0, reasons, stats: { count, avg, specials } };
}

export async function submitChallenge(
  userId: number,
  challengeId: number,
  userCardIds: number[]
): Promise<{ success: boolean; error?: string } > {
  // Check if challenge is repeatable - handle missing column
  let challenge: any = null;
  try {
    challenge = await executeQuerySingle<any>(
      'SELECT COALESCE(repeatable, FALSE) as repeatable FROM sbc_challenges WHERE id = ?',
      [challengeId]
    );
  } catch (error: any) {
    if (error.message.includes('repeatable') || error.message.includes('Unknown column')) {
      console.warn('SBC repeatable column not found in submitChallenge, assuming non-repeatable');
      challenge = await executeQuerySingle<any>(
        'SELECT id, FALSE as repeatable FROM sbc_challenges WHERE id = ?',
        [challengeId]
      );
    } else {
      throw error;
    }
  }
  if (!challenge) return { success: false, error: 'Desafío no encontrado' };
  
  // Check already submitted only for non-repeatable challenges
  if (!challenge.repeatable) {
    const exists = await executeQuerySingle<any>(
      'SELECT id FROM sbc_submissions WHERE challenge_id = ? AND user_id = ?',
      [challengeId, userId]
    );
    if (exists) return { success: false, error: 'Ya completado' };
  }

  const validation = await validateSubmission(userId, challengeId, userCardIds);
  if (!validation.ok) return { success: false, error: validation.reasons.join('; ') };

  await executeTransaction(async (conn) => {
    // Create submission
    const [subRes] = await conn.execute(
      'INSERT INTO sbc_submissions (challenge_id, user_id) VALUES (?, ?)',
      [challengeId, userId]
    );
    const submissionId = (subRes as any).insertId;

    // Store items
    for (const ucId of Array.from(new Set(userCardIds))) {
      await conn.execute(
        'INSERT INTO sbc_submission_items (submission_id, user_card_id) VALUES (?, ?)',
        [submissionId, ucId]
      );
      // Consume card: remove from user inventory
      await conn.execute('DELETE FROM user_cards WHERE id = ? AND user_id = ?', [ucId, userId]);
    }

    // Rewards
    const rewards = await executeQuery<SbcReward>('SELECT * FROM sbc_rewards WHERE challenge_id = ?', [challengeId]);
    for (const r of rewards) {
      if (r.reward_type === 'PACK' && r.pack_type) {
        for (let i = 0; i < (r.amount || 1); i++) {
          await conn.execute('INSERT INTO packs (user_id, type, cost, opened) VALUES (?, ?, 0, FALSE)', [userId, r.pack_type]);
        }
      } else if (r.reward_type === 'CARD' && r.card_id) {
        for (let i = 0; i < (r.amount || 1); i++) {
          await conn.execute('INSERT INTO user_cards (user_id, card_id) VALUES (?, ?)', [userId, r.card_id]);
        }
      }
    }
  });

  return { success: true };
}