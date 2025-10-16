import type { Card, Player, UserCard, CoinTransaction } from './mysql';
import { executeQuery, executeQuerySingle, executeTransaction } from './mysql';

// Tipos extendidos para cartas con información del jugador
export interface CardWithPlayer extends Card {
  player: Player;
}

export interface UserCardWithDetails extends UserCard {
  card: CardWithPlayer;
}

// Probabilidades de rareza en los sobres
export const RARITY_PROBABILITIES = {
  Bronze: 0.50,    // 50%
  Silver: 0.30,    // 30%
  Gold: 0.15,      // 15%
  Elite: 0.04,     // 4%
  Legend: 0.01     // 1%
};

// Precios de sobres
export const PACK_PRICES = {
  FREE_DAILY: 0,
  PREMIUM: 500,
  SPECIAL: 1000
};

// Obtener todos los jugadores
export async function getAllPlayers(): Promise<Player[]> {
  return await executeQuery<Player>('SELECT * FROM players ORDER BY fifa_rating DESC, name ASC');
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

// Obtener carta con información del jugador
export async function getCardWithPlayer(cardId: number): Promise<CardWithPlayer | null> {
  const result = await executeQuerySingle<any>(
    `SELECT c.*, p.* FROM cards c 
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
    created_at: result.created_at,
    player: {
      id: result.player_id,
      name: result.name,
      team: result.team,
      position1: result.position1,
      position2: result.position2,
      pace: result.pace,
      shooting: result.shooting,
      passing: result.passing,
      defending: result.defending,
      physical: result.physical,
      fifa_rating: result.fifa_rating,
      market_value: result.market_value,
      fantasy_points: result.fantasy_points,
      image_url: result.image_url,
      created_at: result.created_at
    }
  };
}

// Obtener todas las cartas de un usuario
export async function getUserCards(userId: number): Promise<UserCardWithDetails[]> {
  const results = await executeQuery<any>(
    `SELECT uc.*, c.*, p.* FROM user_cards uc
     JOIN cards c ON uc.card_id = c.id
     JOIN players p ON c.player_id = p.id
     WHERE uc.user_id = ?
     ORDER BY c.rarity DESC, p.fifa_rating DESC`,
    [userId]
  );

  return results.map(result => ({
    id: result.id,
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
        position1: result.position1,
        position2: result.position2,
        pace: result.pace,
        shooting: result.shooting,
        passing: result.passing,
        defending: result.defending,
        physical: result.physical,
        fifa_rating: result.fifa_rating,
        market_value: result.market_value,
        fantasy_points: result.fantasy_points,
        image_url: result.image_url,
        created_at: result.created_at
      }
    }
  }));
}

// Filtrar cartas de usuario
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
    SELECT uc.*, c.*, p.* FROM user_cards uc
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
    query += ' AND (p.position1 = ? OR p.position2 = ?)';
    params.push(filters.position, filters.position);
  }

  if (filters.minRating) {
    query += ' AND p.fifa_rating >= ?';
    params.push(filters.minRating);
  }

  if (filters.forSale !== undefined) {
    query += ' AND uc.is_for_sale = ?';
    params.push(filters.forSale);
  }

  query += ' ORDER BY c.rarity DESC, p.fifa_rating DESC';

  const results = await executeQuery<any>(query, params);

  return results.map(result => ({
    id: result.id,
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
        position1: result.position1,
        position2: result.position2,
        pace: result.pace,
        shooting: result.shooting,
        passing: result.passing,
        defending: result.defending,
        physical: result.physical,
        fifa_rating: result.fifa_rating,
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
    'SELECT * FROM cards WHERE rarity = ? ORDER BY RAND()',
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
export async function openCardPack(userId: number, packType: 'FREE_DAILY' | 'PREMIUM' | 'SPECIAL' = 'FREE_DAILY'): Promise<{
  success: boolean;
  cards?: CardWithPlayer[];
  error?: string;
}> {
  try {
    const numCards = packType === 'SPECIAL' ? 5 : packType === 'PREMIUM' ? 3 : 1;
    const openedCards: CardWithPlayer[] = [];

    await executeTransaction(async (connection) => {
      for (let i = 0; i < numCards; i++) {
        // Determinar rareza
        let rarity = determineCardRarity();
        
        // Para sobres especiales, garantizar al menos una carta Elite o Legend
        if (packType === 'SPECIAL' && i === 0) {
          rarity = Math.random() < 0.3 ? 'Legend' : 'Elite';
        }

        // Obtener cartas disponibles para esa rareza
        const [availableCards] = await connection.execute(
          'SELECT * FROM cards WHERE rarity = ? ORDER BY RAND() LIMIT 1',
          [rarity]
        );

        if (Array.isArray(availableCards) && availableCards.length > 0) {
          const selectedCard = availableCards[0] as Card;

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
      }

      // Actualizar contador de sobres abiertos
      await connection.execute(
        'UPDATE users SET total_cards_opened = total_cards_opened + ? WHERE id = ?',
        [numCards, userId]
      );
    });

    return { success: true, cards: openedCards };
  } catch (error) {
    console.error('Error opening card pack:', error);
    return { success: false, error: 'Error al abrir el sobre' };
  }
}

// Calcular precio de venta de una carta basado en rareza y stats
export function calculateCardSellPrice(card: CardWithPlayer): number {
  const basePrice = card.base_price;
  const rarityMultiplier = {
    Bronze: 1,
    Silver: 1.5,
    Gold: 2.5,
    Elite: 4,
    Legend: 6
  };

  const specialTypeMultiplier = {
    Regular: 1,
    PLAYER_OF_THE_MONTH: 2,
    RATING_RELOAD: 1.8,
    ASSIST_ENGINE: 1.6,
    MARKET_MASTER: 1.7,
    COMEBACK_HERO: 1.9
  };

  const finalPrice = Math.floor(
    basePrice * 
    rarityMultiplier[card.rarity] * 
    specialTypeMultiplier[card.special_type] * 
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