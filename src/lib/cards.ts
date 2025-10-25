import type { Card, Player, UserCard, CoinTransaction } from './mysql';
import { executeQuery, executeQuerySingle, executeTransaction } from './mysql';

// Tipos extendidos para cartas con información del jugador
export interface CardWithPlayer extends Card {
  player: Player;
}

export interface UserCardWithDetails extends UserCard {
  card: CardWithPlayer;
}

// Configuración de packs importada desde economy
import { ECONOMY_CONFIG } from './economy';

// Probabilidades de rareza en los sobres (legacy - mantenemos para compatibilidad)
export const RARITY_PROBABILITIES = {
  Bronze: 0.50,    // 50%
  Silver: 0.30,    // 30%
  Gold: 0.15,      // 15%
  Elite: 0.04,     // 4%
  Legend: 0.01     // 1%
};

// Precios de sobres (actualizados según nueva economía)
export const PACK_PRICES = {
  FREE_DAILY: ECONOMY_CONFIG.PACKS.BASIC.cost,
  PREMIUM: ECONOMY_CONFIG.PACKS.PREMIUM.cost,
  SPECIAL: ECONOMY_CONFIG.PACKS.SPECIAL.cost
};

// Obtener todos los jugadores
export async function getAllPlayers(): Promise<Player[]> {
  // Preferir jugadores elegibles para quiz si existe la columna
  return await executeQuery<Player>(
    "SELECT * FROM players WHERE (eligible_for_quiz IS NULL OR eligible_for_quiz = true) ORDER BY fifa_rating DESC, name ASC"
  );
}

// Obtener jugador por ID
export async function getPlayerById(playerId: number): Promise<Player | null> {
  return await executeQuerySingle<Player>('SELECT * FROM players WHERE id = ?', [playerId]);
}

// Obtener cartas por jugador
export async function getCardsByPlayer(playerId: number): Promise<Card[]> {
  return await executeQuery<Card>(
    'SELECT * FROM cards WHERE player_id = ? ORDER BY rarity DESC, special_type DESC',
    [playerId]
  );
}

// Obtener carta con información del jugador (con stats efectivos por carta)
export async function getCardWithPlayer(cardId: number): Promise<CardWithPlayer | null> {
  const result = await executeQuerySingle<any>(
    `SELECT 
       c.*, 
       p.*, 
       c.image_path AS card_image_path,
       COALESCE(c.position1_override, p.position1) AS eff_position1,
       COALESCE(c.position2_override, p.position2) AS eff_position2,
       LEAST(99, COALESCE(c.fifa_rating_override, p.fifa_rating + CASE c.special_type
         WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
         WHEN 'PLAYER_OF_THE_MONTH' THEN 4
         WHEN 'RATING_RELOAD' THEN 2
         WHEN 'ASSIST_ENGINE' THEN 2
         WHEN 'MARKET_MASTER' THEN 2
         WHEN 'COMEBACK_HERO' THEN 3
         ELSE 0 END)) AS eff_fifa_rating,
       LEAST(99, COALESCE(c.pace_override, p.pace + CASE c.special_type
         WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
         WHEN 'PLAYER_OF_THE_MONTH' THEN 3
         WHEN 'RATING_RELOAD' THEN 2
         WHEN 'ASSIST_ENGINE' THEN 1
         WHEN 'MARKET_MASTER' THEN 1
         WHEN 'COMEBACK_HERO' THEN 2
         ELSE 0 END)) AS eff_pace,
       LEAST(99, COALESCE(c.shooting_override, p.shooting + CASE c.special_type
         WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
         WHEN 'PLAYER_OF_THE_MONTH' THEN 3
         WHEN 'RATING_RELOAD' THEN 3
         WHEN 'ASSIST_ENGINE' THEN 1
         WHEN 'MARKET_MASTER' THEN 1
         WHEN 'COMEBACK_HERO' THEN 1
         ELSE 0 END)) AS eff_shooting,
       LEAST(99, COALESCE(c.passing_override, p.passing + CASE c.special_type
         WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
         WHEN 'PLAYER_OF_THE_MONTH' THEN 3
         WHEN 'RATING_RELOAD' THEN 1
         WHEN 'ASSIST_ENGINE' THEN 3
         WHEN 'MARKET_MASTER' THEN 2
         WHEN 'COMEBACK_HERO' THEN 1
         ELSE 0 END)) AS eff_passing,
       LEAST(99, COALESCE(c.dribbling_override, p.dribbling + CASE c.special_type
         WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
         WHEN 'PLAYER_OF_THE_MONTH' THEN 3
         WHEN 'RATING_RELOAD' THEN 1
         WHEN 'ASSIST_ENGINE' THEN 2
         WHEN 'MARKET_MASTER' THEN 1
         WHEN 'COMEBACK_HERO' THEN 2
         ELSE 0 END)) AS eff_dribbling,
       LEAST(99, COALESCE(c.defending_override, p.defending + CASE c.special_type
         WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
         WHEN 'PLAYER_OF_THE_MONTH' THEN 2
         WHEN 'RATING_RELOAD' THEN 0
         WHEN 'ASSIST_ENGINE' THEN 0
         WHEN 'MARKET_MASTER' THEN 1
         WHEN 'COMEBACK_HERO' THEN 2
         ELSE 0 END)) AS eff_defending,
       LEAST(99, COALESCE(c.physical_override, p.physical + CASE c.special_type
         WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
         WHEN 'PLAYER_OF_THE_MONTH' THEN 3
         WHEN 'RATING_RELOAD' THEN 1
         WHEN 'ASSIST_ENGINE' THEN 1
         WHEN 'MARKET_MASTER' THEN 2
         WHEN 'COMEBACK_HERO' THEN 2
         ELSE 0 END)) AS eff_physical
     FROM cards c 
     JOIN players p ON c.player_id = p.id 
     WHERE c.id = ?`,
    [cardId]
  );

  if (!result) return null;

  return {
    id: result.id,
    player_id: result.player_id,
    rarity: result.rarity,
    special_type: result.special_type,
    special_month: result.special_month,
    base_price: result.base_price,
    image_path: result.card_image_path || result.image_path,
    created_at: result.created_at,
    player: {
      id: result.player_id,
      name: result.name,
      team: result.team,
      position1: result.eff_position1,
      position2: result.eff_position2,
      pace: result.eff_pace,
      shooting: result.eff_shooting,
      passing: result.eff_passing,
      dribbling: result.eff_dribbling,
      defending: result.eff_defending,
      physical: result.eff_physical,
      fifa_rating: result.eff_fifa_rating,
      market_value: result.market_value,
      fantasy_points: result.fantasy_points,
      image_url: result.image_url,
      created_at: result.created_at
    }
  };
}

// Obtener todas las cartas de un usuario (stats efectivos por carta)
export async function getUserCards(userId: number): Promise<UserCardWithDetails[]> {
  const results = await executeQuery<any>(
    `SELECT 
            uc.*, 
            uc.id AS user_card_id,
            c.*, 
            p.*, 
            c.image_path AS card_image_path,
            COALESCE(c.position1_override, p.position1) AS eff_position1,
            COALESCE(c.position2_override, p.position2) AS eff_position2,
            LEAST(99, COALESCE(c.fifa_rating_override, p.fifa_rating + CASE c.special_type
              WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
              WHEN 'PLAYER_OF_THE_MONTH' THEN 4
              WHEN 'RATING_RELOAD' THEN 2
              WHEN 'ASSIST_ENGINE' THEN 2
              WHEN 'MARKET_MASTER' THEN 2
              WHEN 'COMEBACK_HERO' THEN 3
              ELSE 0 END)) AS eff_fifa_rating,
            LEAST(99, COALESCE(c.pace_override, p.pace + CASE c.special_type
              WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
              WHEN 'PLAYER_OF_THE_MONTH' THEN 3
              WHEN 'RATING_RELOAD' THEN 2
              WHEN 'ASSIST_ENGINE' THEN 1
              WHEN 'MARKET_MASTER' THEN 1
              WHEN 'COMEBACK_HERO' THEN 2
              ELSE 0 END)) AS eff_pace,
            LEAST(99, COALESCE(c.shooting_override, p.shooting + CASE c.special_type
              WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
              WHEN 'PLAYER_OF_THE_MONTH' THEN 3
              WHEN 'RATING_RELOAD' THEN 3
              WHEN 'ASSIST_ENGINE' THEN 1
              WHEN 'MARKET_MASTER' THEN 1
              WHEN 'COMEBACK_HERO' THEN 1
              ELSE 0 END)) AS eff_shooting,
            LEAST(99, COALESCE(c.passing_override, p.passing + CASE c.special_type
              WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
              WHEN 'PLAYER_OF_THE_MONTH' THEN 3
              WHEN 'RATING_RELOAD' THEN 1
              WHEN 'ASSIST_ENGINE' THEN 3
              WHEN 'MARKET_MASTER' THEN 2
              WHEN 'COMEBACK_HERO' THEN 1
              ELSE 0 END)) AS eff_passing,
            LEAST(99, COALESCE(c.dribbling_override, p.dribbling + CASE c.special_type
              WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
              WHEN 'PLAYER_OF_THE_MONTH' THEN 3
              WHEN 'RATING_RELOAD' THEN 1
              WHEN 'ASSIST_ENGINE' THEN 2
              WHEN 'MARKET_MASTER' THEN 1
              WHEN 'COMEBACK_HERO' THEN 2
              ELSE 0 END)) AS eff_dribbling,
            LEAST(99, COALESCE(c.defending_override, p.defending + CASE c.special_type
              WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
              WHEN 'PLAYER_OF_THE_MONTH' THEN 2
              WHEN 'RATING_RELOAD' THEN 0
              WHEN 'ASSIST_ENGINE' THEN 0
              WHEN 'MARKET_MASTER' THEN 1
              WHEN 'COMEBACK_HERO' THEN 2
              ELSE 0 END)) AS eff_defending,
            LEAST(99, COALESCE(c.physical_override, p.physical + CASE c.special_type
              WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
              WHEN 'PLAYER_OF_THE_MONTH' THEN 3
              WHEN 'RATING_RELOAD' THEN 1
              WHEN 'ASSIST_ENGINE' THEN 1
              WHEN 'MARKET_MASTER' THEN 2
              WHEN 'COMEBACK_HERO' THEN 2
              ELSE 0 END)) AS eff_physical
     FROM user_cards uc
     JOIN cards c ON uc.card_id = c.id
     JOIN players p ON c.player_id = p.id
     WHERE uc.user_id = ?
     ORDER BY c.rarity DESC, eff_fifa_rating DESC`,
    [userId]
  );

  return results.map(result => ({
    id: result.user_card_id,
    user_id: result.user_id,
    card_id: result.card_id,
    obtained_at: result.obtained_at,
    is_for_sale: result.is_for_sale,
    sale_price: result.sale_price,
    card: {
      id: result.card_id,
      player_id: result.player_id,
      rarity: result.rarity,
      special_type: result.special_type,
      special_month: result.special_month,
      base_price: result.base_price,
      image_path: result.card_image_path,
      created_at: result.created_at,
      player: {
        id: result.player_id,
        name: result.name,
        team: result.team,
        position1: result.eff_position1,
        position2: result.eff_position2,
        pace: result.eff_pace,
        shooting: result.eff_shooting,
        passing: result.eff_passing,
        dribbling: result.eff_dribbling,
        defending: result.eff_defending,
        physical: result.eff_physical,
        fifa_rating: result.eff_fifa_rating,
        market_value: result.market_value,
        fantasy_points: result.fantasy_points,
        image_url: result.image_url,
        created_at: result.created_at
      }
    }
  }));
}

// Filtrar cartas de usuario (usando stats efectivos)
export async function getUserCardsFiltered(
  userId: number,
  filters: {
    rarity?: string;
    position?: string;
    minRating?: number;
    forSale?: boolean;
  }
): Promise<UserCardWithDetails[]> {
  let query = `
    SELECT 
           uc.*, 
           uc.id AS user_card_id,
           c.*, 
           p.*, 
           c.image_path AS card_image_path,
           COALESCE(c.position1_override, p.position1) AS eff_position1,
           COALESCE(c.position2_override, p.position2) AS eff_position2,
           LEAST(99, COALESCE(c.fifa_rating_override, p.fifa_rating + CASE c.special_type
             WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
             WHEN 'PLAYER_OF_THE_MONTH' THEN 4
             WHEN 'RATING_RELOAD' THEN 2
             WHEN 'ASSIST_ENGINE' THEN 2
             WHEN 'MARKET_MASTER' THEN 2
             WHEN 'COMEBACK_HERO' THEN 3
             ELSE 0 END)) AS eff_fifa_rating,
           LEAST(99, COALESCE(c.pace_override, p.pace + CASE c.special_type
             WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
             WHEN 'PLAYER_OF_THE_MONTH' THEN 3
             WHEN 'RATING_RELOAD' THEN 2
             WHEN 'ASSIST_ENGINE' THEN 1
             WHEN 'MARKET_MASTER' THEN 1
             WHEN 'COMEBACK_HERO' THEN 2
             ELSE 0 END)) AS eff_pace,
           LEAST(99, COALESCE(c.shooting_override, p.shooting + CASE c.special_type
             WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
             WHEN 'PLAYER_OF_THE_MONTH' THEN 3
             WHEN 'RATING_RELOAD' THEN 3
             WHEN 'ASSIST_ENGINE' THEN 1
             WHEN 'MARKET_MASTER' THEN 1
             WHEN 'COMEBACK_HERO' THEN 1
             ELSE 0 END)) AS eff_shooting,
           LEAST(99, COALESCE(c.passing_override, p.passing + CASE c.special_type
             WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
             WHEN 'PLAYER_OF_THE_MONTH' THEN 3
             WHEN 'RATING_RELOAD' THEN 1
             WHEN 'ASSIST_ENGINE' THEN 3
             WHEN 'MARKET_MASTER' THEN 2
             WHEN 'COMEBACK_HERO' THEN 1
             ELSE 0 END)) AS eff_passing,
           LEAST(99, COALESCE(c.dribbling_override, p.dribbling + CASE c.special_type
             WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
             WHEN 'PLAYER_OF_THE_MONTH' THEN 3
             WHEN 'RATING_RELOAD' THEN 1
             WHEN 'ASSIST_ENGINE' THEN 2
             WHEN 'MARKET_MASTER' THEN 1
             WHEN 'COMEBACK_HERO' THEN 2
             ELSE 0 END)) AS eff_dribbling,
           LEAST(99, COALESCE(c.defending_override, p.defending + CASE c.special_type
             WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
             WHEN 'PLAYER_OF_THE_MONTH' THEN 2
             WHEN 'RATING_RELOAD' THEN 0
             WHEN 'ASSIST_ENGINE' THEN 0
             WHEN 'MARKET_MASTER' THEN 1
             WHEN 'COMEBACK_HERO' THEN 2
             ELSE 0 END)) AS eff_defending,
           LEAST(99, COALESCE(c.physical_override, p.physical + CASE c.special_type
             WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
             WHEN 'PLAYER_OF_THE_MONTH' THEN 3
             WHEN 'RATING_RELOAD' THEN 1
             WHEN 'ASSIST_ENGINE' THEN 1
             WHEN 'MARKET_MASTER' THEN 2
             WHEN 'COMEBACK_HERO' THEN 2
             ELSE 0 END)) AS eff_physical
    FROM user_cards uc
    JOIN cards c ON uc.card_id = c.id
    JOIN players p ON c.player_id = p.id
    WHERE uc.user_id = ?
  `;

  const params: any[] = [userId];

  if (filters.rarity) {
    query += ' AND c.rarity = ?';
    params.push(filters.rarity);
  }

  if (filters.position) {
    query += ' AND (COALESCE(c.position1_override, p.position1) = ? OR COALESCE(c.position2_override, p.position2) = ?)';
    params.push(filters.position, filters.position);
  }

  if (filters.minRating) {
    query += ' AND LEAST(99, COALESCE(c.fifa_rating_override, p.fifa_rating + CASE c.special_type\
             WHEN \"TEAM_OF_THE_WEEK\" THEN 2\
             WHEN \"PLAYER_OF_THE_MONTH\" THEN 4\
             WHEN \"RATING_RELOAD\" THEN 2\
             WHEN \"ASSIST_ENGINE\" THEN 2\
             WHEN \"MARKET_MASTER\" THEN 2\
             WHEN \"COMEBACK_HERO\" THEN 3\
             ELSE 0 END)) >= ?';
    params.push(filters.minRating);
  }

  if (filters.forSale !== undefined) {
    query += ' AND uc.is_for_sale = ?';
    params.push(filters.forSale);
  }

  query += ' ORDER BY c.rarity DESC, eff_fifa_rating DESC';

  const results = await executeQuery<any>(query, params);

  return results.map(result => ({
    id: result.user_card_id,
    user_id: result.user_id,
    card_id: result.card_id,
    obtained_at: result.obtained_at,
    is_for_sale: result.is_for_sale,
    sale_price: result.sale_price,
    card: {
      id: result.card_id,
      player_id: result.player_id,
      rarity: result.rarity,
      special_type: result.special_type,
      special_month: result.special_month,
      base_price: result.base_price,
      created_at: result.created_at,
      player: {
        id: result.player_id,
        name: result.name,
        team: result.team,
        position1: result.eff_position1,
        position2: result.eff_position2,
        pace: result.eff_pace,
        shooting: result.eff_shooting,
        passing: result.eff_passing,
        dribbling: result.eff_dribbling,
        defending: result.eff_defending,
        physical: result.eff_physical,
        fifa_rating: result.eff_fifa_rating,
        market_value: result.market_value,
        fantasy_points: result.fantasy_points,
        image_url: result.image_url,
        created_at: result.created_at
      }
    }
  }));
}

// Función para determinar la rareza basada en probabilidades
export function determineCardRarity(): Card['rarity'] {
  const random = Math.random();
  let cumulative = 0;

  for (const [rarity, probability] of Object.entries(RARITY_PROBABILITIES)) {
    cumulative += probability;
    if (random <= cumulative) {
      return rarity as Card['rarity'];
    }
  }

  return 'Bronze'; // Fallback
}

// Obtener cartas disponibles para una rareza específica
export async function getCardsForRarity(rarity: Card['rarity']): Promise<Card[]> {
  return await executeQuery<Card>(
'SELECT * FROM cards WHERE rarity = ? ORDER BY RANDOM()',
    [rarity]
  );
}

// Dar carta a usuario
export async function giveCardToUser(userId: number, cardId: number): Promise<boolean> {
  try {
    await executeQuery(
      'INSERT INTO user_cards (user_id, card_id) VALUES (?, ?)',
      [userId, cardId]
    );
    return true;
  } catch (error) {
    console.error('Error giving card to user:', error);
    return false;
  }
}

// Abrir sobre de cartas
export async function openCardPack(
  userId: number,
  packType: 'FREE_DAILY' | 'PREMIUM' | 'SPECIAL' | 'MEDIA_84_PLUS' = 'FREE_DAILY',
  existingConnection?: any
): Promise<{
  success: boolean;
  cards?: CardWithPlayer[];
  error?: string;
}> {
  try {
    const numCards = 1; // Todos los sobres entregan 1 carta
    const openedCards: CardWithPlayer[] = [];

    // helper: pick a random card id by special group
    async function pickRandomCardIdByGroup(conn: any, group: 'BASE_OG' | 'LEGEND' | 'RARE' | 'ELITE'): Promise<Card | null> {
      async function pick(sql: string): Promise<Card | null> {
        const [rows] = await conn.execute(sql);
        if (Array.isArray(rows) && rows.length > 0) return rows[0] as Card;
        return null;
      }
      // Primary pick
      if (group === 'BASE_OG') {
        const c = await pick("SELECT * FROM cards WHERE special_type IN ('Regular','OLD_GENERATION') ORDER BY RANDOM() LIMIT 1");
        if (c) return c;
      }
      if (group === 'LEGEND') {
        // Solo POTM cuenta como legendaria
        const c = await pick("SELECT * FROM cards WHERE special_type = 'PLAYER_OF_THE_MONTH' ORDER BY RANDOM() LIMIT 1");
        if (c) return c;
        // Fallbacks si no hay POTM en la BD (excluir jorgeCH)
const c2 = await pick(`SELECT c.* FROM cards c JOIN players p ON c.player_id = p.id WHERE c.special_type IN ('ASSIST_ENGINE','RATING_RELOAD','MARKET_MASTER','COMEBACK_HERO','TEAM_OF_THE_WEEK','NOM_POTM') AND NOT (p.card_asset_basename = 'jorge' AND c.special_type = 'COMEBACK_HERO') ORDER BY RANDOM() LIMIT 1`);
        if (c2) return c2;
        const c3 = await pick("SELECT * FROM cards WHERE special_type IN ('Regular','OLD_GENERATION') ORDER BY RANDOM() LIMIT 1");
        return c3;
      }
      if (group === 'ELITE') {
        // Elite: MARKET_MASTER, RATING_RELOAD, ASSIST_ENGINE
        // COMEBACK_HERO (Jorge) NUNCA sale en sobres normales (solo EVENTO/ELITE de logros/SBC)
        const c = await pick(`SELECT c.* FROM cards c JOIN players p ON c.player_id = p.id WHERE c.special_type IN ('MARKET_MASTER','RATING_RELOAD','ASSIST_ENGINE') AND NOT (p.card_asset_basename = 'jorge' AND c.special_type = 'COMEBACK_HERO') ORDER BY RANDOM() LIMIT 1`);
        if (c) return c;
        // Fallbacks seguros
        const c2 = await pick("SELECT * FROM cards WHERE special_type IN ('TEAM_OF_THE_WEEK','NOM_POTM') ORDER BY RANDOM() LIMIT 1");
        if (c2) return c2;
        const c3 = await pick("SELECT * FROM cards WHERE special_type IN ('Regular','OLD_GENERATION') ORDER BY RANDOM() LIMIT 1");
        return c3;
      }
      if (group === 'RARE') {
        // Especial: TEAM_OF_THE_WEEK y NOM_POTM (categoría ESPECIAL)
        const c = await pick("SELECT * FROM cards WHERE special_type IN ('TEAM_OF_THE_WEEK','NOM_POTM') ORDER BY RANDOM() LIMIT 1");
        if (c) return c;
        // Fallbacks seguros
        const c2 = await pick("SELECT * FROM cards WHERE special_type IN ('Regular','OLD_GENERATION') ORDER BY RANDOM() LIMIT 1");
        return c2;
      }
      // Last safety
      const any = await pick("SELECT * FROM cards ORDER BY RANDOM() LIMIT 1");
      return any;
    }

    const runWithConnection = async (connection: any) => {
      for (let i = 0; i < numCards; i++) {
        let selectedCard: Card | null = null;
        
        // Lógica especial para MEDIA_84_PLUS
        if (packType === 'MEDIA_84_PLUS') {
          // Seleccionar carta con FIFA rating >= 84 usando el rating efectivo
          const [rows] = await connection.execute(`
            SELECT c.* FROM cards c 
            JOIN players p ON c.player_id = p.id 
            WHERE LEAST(99, COALESCE(c.fifa_rating_override, p.fifa_rating + CASE c.special_type
              WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
              WHEN 'PLAYER_OF_THE_MONTH' THEN 4
              WHEN 'RATING_RELOAD' THEN 2
              WHEN 'ASSIST_ENGINE' THEN 2
              WHEN 'MARKET_MASTER' THEN 2
              WHEN 'COMEBACK_HERO' THEN 3
              ELSE 0 END)) >= 84
            ORDER BY RANDOM() LIMIT 1
          `);
          
          if (Array.isArray(rows) && rows.length > 0) {
            selectedCard = rows[0] as Card;
          }
        } else {
          // Lógica normal para otros tipos de packs
          let group: 'BASE_OG' | 'LEGEND' | 'RARE' | 'ELITE';
          const r = Math.random();
          
          // Usar las nuevas odds de economy.ts
          if (packType === 'SPECIAL') {
            const odds = ECONOMY_CONFIG.PACKS.SPECIAL.odds;
            if (r < odds.ESPECIAL) group = 'RARE';
            else if (r < odds.ESPECIAL + odds.ELITE) group = 'ELITE';
            else group = 'LEGEND';
          } else if (packType === 'PREMIUM') {
            const odds = ECONOMY_CONFIG.PACKS.PREMIUM.odds;
            if (r < odds.NORMAL) group = 'BASE_OG';
            else if (r < odds.NORMAL + odds.ESPECIAL) group = 'RARE';
            else if (r < odds.NORMAL + odds.ESPECIAL + odds.ELITE) group = 'ELITE';
            else group = 'LEGEND';
          } else {
            // FREE_DAILY
            const odds = ECONOMY_CONFIG.PACKS.BASIC.odds;
            if (r < odds.NORMAL) group = 'BASE_OG';
            else if (r < odds.NORMAL + odds.ESPECIAL) group = 'RARE';
            else if (r < odds.NORMAL + odds.ESPECIAL + odds.ELITE) group = 'ELITE';
            else group = 'LEGEND';
          }
          
          selectedCard = await pickRandomCardIdByGroup(connection, group);
        }
        
        if (!selectedCard) continue;

        // Dar la carta al usuario
        await connection.execute(
          'INSERT INTO user_cards (user_id, card_id) VALUES (?, ?)',
          [userId, selectedCard.id]
        );

        // Obtener información completa de la carta
        const cardWithPlayer = await getCardWithPlayer(selectedCard.id);
        if (cardWithPlayer) {
          openedCards.push(cardWithPlayer);
        }
      }

      // Actualizar contador de sobres abiertos
      await connection.execute(
        'UPDATE users SET total_cards_opened = total_cards_opened + ? WHERE id = ?',
        [numCards, userId]
      );
    };

    if (existingConnection) {
      await runWithConnection(existingConnection);
    } else {
      await executeTransaction(async (connection) => {
        await runWithConnection(connection);
      });
    }

    return { success: true, cards: openedCards };
  } catch (error) {
    console.error('Error opening card pack:', error);
    return { success: false, error: 'Error al abrir el sobre' };
  }
}

// Obtener precio de una carta directamente desde base_price
// Los precios son fijos y se manejan manualmente en la base de datos
export function calculateCardSellPrice(card: CardWithPlayer): number {
  // Usar directamente el precio base de la carta sin multiplicadores
  // Los precios se actualizan manualmente en la base de datos
  return Math.max(card.base_price || 50, 50); // Mínimo 50 monedas
}

// Función legacy para cálculo automático (mantenida para referencia)
export function calculateCardSellPriceLegacy(card: CardWithPlayer): number {
  const basePrice = card.base_price;
  const rarityMultiplier = {
    Bronze: 1,
    Silver: 1.5,
    Gold: 2.5,
    Elite: 4,
    Legend: 6
  } as const;

  const specialTypeMultiplier: Record<string, number> = {
    Regular: 1,
    PLAYER_OF_THE_MONTH: 2,
    RATING_RELOAD: 1.8,
    ASSIST_ENGINE: 1.6,
    MARKET_MASTER: 1.7,
    COMEBACK_HERO: 1.9,
    TEAM_OF_THE_WEEK: 1.8,
    OLD_GENERATION: 1.1,
  };

  const typeMult = specialTypeMultiplier[card.special_type] ?? 1;

  const finalPrice = Math.floor(
    basePrice * 
    rarityMultiplier[card.rarity] * 
    typeMult * 
    (card.player.fifa_rating / 80) // Factor basado en rating FIFA
  );

  return Math.max(finalPrice, 50); // Precio mínimo de 50 monedas
}

// Obtener estadísticas de la colección del usuario
export async function getUserCollectionStats(userId: number): Promise<{
  totalCards: number;
  cardsByRarity: Record<string, number>;
  totalValue: number;
  uniquePlayers: number;
}> {
  const stats = await executeQuerySingle<any>(
    `SELECT 
      COUNT(*) as total_cards,
      SUM(c.base_price) as total_value,
      COUNT(DISTINCT c.player_id) as unique_players,
      SUM(CASE WHEN c.rarity = 'Bronze' THEN 1 ELSE 0 END) as bronze_cards,
      SUM(CASE WHEN c.rarity = 'Silver' THEN 1 ELSE 0 END) as silver_cards,
      SUM(CASE WHEN c.rarity = 'Gold' THEN 1 ELSE 0 END) as gold_cards,
      SUM(CASE WHEN c.rarity = 'Elite' THEN 1 ELSE 0 END) as elite_cards,
      SUM(CASE WHEN c.rarity = 'Legend' THEN 1 ELSE 0 END) as legend_cards
     FROM user_cards uc
     JOIN cards c ON uc.card_id = c.id
     WHERE uc.user_id = ?`,
    [userId]
  );

  if (!stats) {
    return {
      totalCards: 0,
      cardsByRarity: { Bronze: 0, Silver: 0, Gold: 0, Elite: 0, Legend: 0 },
      totalValue: 0,
      uniquePlayers: 0
    };
  }

  return {
    totalCards: stats.total_cards || 0,
    cardsByRarity: {
      Bronze: stats.bronze_cards || 0,
      Silver: stats.silver_cards || 0,
      Gold: stats.gold_cards || 0,
      Elite: stats.elite_cards || 0,
      Legend: stats.legend_cards || 0
    },
    totalValue: stats.total_value || 0,
    uniquePlayers: stats.unique_players || 0
  };
}
