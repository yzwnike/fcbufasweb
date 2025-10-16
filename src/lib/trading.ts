import type { CardTrade, UserCard } from './mysql';
import { executeQuery, executeQuerySingle, executeTransaction } from './mysql';
import { getUserCardsFiltered, calculateCardSellPrice, type UserCardWithDetails, type CardWithPlayer } from './cards';

// Filtros para el mercado de cartas
export interface MarketFilters {
  rarity?: string;
  position?: string;
  minRating?: number;
  maxPrice?: number;
  minPrice?: number;
  playerName?: string;
}

// Interfaz para carta en venta con detalles
export interface CardForSale {
  trade_id: number;
  seller_id: number;
  seller_username: string;
  user_card_id: number;
  price: number;
  created_at: string;
  card: CardWithPlayer;
}

// Poner carta en venta
export async function putCardForSale(
  userId: number,
  userCardId: number,
  price: number
): Promise<{
  success: boolean;
  tradeId?: number;
  error?: string;
}> {
  try {
    // Verificar que la carta pertenece al usuario y no está ya en venta
    const userCard = await executeQuerySingle<any>(
      `SELECT uc.*, c.*, p.* FROM user_cards uc
       JOIN cards c ON uc.card_id = c.id
       JOIN players p ON c.player_id = p.id
       WHERE uc.id = ? AND uc.user_id = ? AND uc.is_for_sale = false`,
      [userCardId, userId]
    );

    if (!userCard) {
      return {
        success: false,
        error: 'Carta no encontrada o ya está en venta'
      };
    }

    // Validar precio mínimo
    const minPrice = 50; // Precio mínimo de venta
    if (price < minPrice) {
      return {
        success: false,
        error: `El precio mínimo es ${minPrice} monedas`
      };
    }

    // Crear la entrada de intercambio en una transacción
    const tradeId = await executeTransaction(async (connection) => {
      // Marcar la carta como en venta
      await connection.execute(
        'UPDATE user_cards SET is_for_sale = true, sale_price = ? WHERE id = ?',
        [price, userCardId]
      );

      // Crear entrada en card_trades
      const [result] = await connection.execute(
        'INSERT INTO card_trades (seller_id, user_card_id, price, status) VALUES (?, ?, ?, ?)',
        [userId, userCardId, price, 'ACTIVE']
      );

      return (result as any).insertId;
    });

    return {
      success: true,
      tradeId
    };
  } catch (error) {
    console.error('Error putting card for sale:', error);
    return {
      success: false,
      error: 'Error interno del servidor'
    };
  }
}

// Quitar carta de la venta
export async function removeCardFromSale(
  userId: number,
  tradeId: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Verificar que el intercambio existe y pertenece al usuario
    const trade = await executeQuerySingle<CardTrade>(
      'SELECT * FROM card_trades WHERE id = ? AND seller_id = ? AND status = "ACTIVE"',
      [tradeId, userId]
    );

    if (!trade) {
      return {
        success: false,
        error: 'Intercambio no encontrado'
      };
    }

    // Quitar de venta en una transacción
    await executeTransaction(async (connection) => {
      // Actualizar el estado del intercambio
      await connection.execute(
        'UPDATE card_trades SET status = "CANCELLED" WHERE id = ?',
        [tradeId]
      );

      // Quitar la carta de venta
      await connection.execute(
        'UPDATE user_cards SET is_for_sale = false, sale_price = NULL WHERE id = ?',
        [trade.user_card_id]
      );
    });

    return {
      success: true
    };
  } catch (error) {
    console.error('Error removing card from sale:', error);
    return {
      success: false,
      error: 'Error interno del servidor'
    };
  }
}

// Comprar carta del mercado
export async function buyCard(
  buyerId: number,
  tradeId: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Verificar que el intercambio existe y está activo
    const trade = await executeQuerySingle<CardTrade>(
      'SELECT * FROM card_trades WHERE id = ? AND status = "ACTIVE"',
      [tradeId]
    );

    if (!trade) {
      return {
        success: false,
        error: 'Intercambio no encontrado o ya completado'
      };
    }

    // No permitir que el vendedor compre su propia carta
    if (trade.seller_id === buyerId) {
      return {
        success: false,
        error: 'No puedes comprar tu propia carta'
      };
    }

    // Verificar que el comprador tiene suficientes monedas
    const buyer = await executeQuerySingle<any>(
      'SELECT coins FROM users WHERE id = ?',
      [buyerId]
    );

    if (!buyer || buyer.coins < trade.price) {
      return {
        success: false,
        error: 'No tienes suficientes monedas'
      };
    }

    // Procesar la compra en una transacción
    await executeTransaction(async (connection) => {
      // Transferir monedas del comprador al vendedor
      await connection.execute(
        'UPDATE users SET coins = coins - ? WHERE id = ?',
        [trade.price, buyerId]
      );

      await connection.execute(
        'UPDATE users SET coins = coins + ? WHERE id = ?',
        [trade.price, trade.seller_id]
      );

      // Transferir la carta al comprador
      await connection.execute(
        'UPDATE user_cards SET user_id = ?, is_for_sale = false, sale_price = NULL WHERE id = ?',
        [buyerId, trade.user_card_id]
      );

      // Marcar el intercambio como completado
      await connection.execute(
        'UPDATE card_trades SET status = "SOLD", buyer_id = ?, completed_at = NOW() WHERE id = ?',
        [buyerId, tradeId]
      );

      // Registrar transacciones de monedas
      await connection.execute(
        'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
        [buyerId, -trade.price, 'CARD_PURCHASE', `Compra de carta en el mercado`]
      );

      await connection.execute(
        'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
        [trade.seller_id, trade.price, 'CARD_SALE', `Venta de carta en el mercado`]
      );
    });

    return {
      success: true
    };
  } catch (error) {
    console.error('Error buying card:', error);
    return {
      success: false,
      error: 'Error interno del servidor'
    };
  }
}

// Obtener cartas en venta con filtros
export async function getCardsForSale(
  filters: MarketFilters = {},
  limit: number = 20,
  offset: number = 0
): Promise<CardForSale[]> {
  try {
    let query = `
      SELECT 
        ct.id as trade_id,
        ct.seller_id,
        u.username as seller_username,
        ct.user_card_id,
        ct.price,
        ct.created_at,
        c.*,
        p.*
      FROM card_trades ct
      JOIN user_cards uc ON ct.user_card_id = uc.id
      JOIN cards c ON uc.card_id = c.id
      JOIN players p ON c.player_id = p.id
      JOIN users u ON ct.seller_id = u.id
      WHERE ct.status = 'ACTIVE'
    `;

    const params: any[] = [];

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

    if (filters.maxPrice) {
      query += ' AND ct.price <= ?';
      params.push(filters.maxPrice);
    }

    if (filters.minPrice) {
      query += ' AND ct.price >= ?';
      params.push(filters.minPrice);
    }

    if (filters.playerName) {
      query += ' AND p.name LIKE ?';
      params.push(`%${filters.playerName}%`);
    }

    query += ' ORDER BY ct.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const results = await executeQuery<any>(query, params);

    return results.map(result => ({
      trade_id: result.trade_id,
      seller_id: result.seller_id,
      seller_username: result.seller_username,
      user_card_id: result.user_card_id,
      price: result.price,
      created_at: result.created_at,
      card: {
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
      }
    }));
  } catch (error) {
    console.error('Error getting cards for sale:', error);
    return [];
  }
}

// Obtener cartas en venta del usuario
export async function getUserCardsForSale(userId: number): Promise<CardForSale[]> {
  try {
    const results = await executeQuery<any>(
      `SELECT 
        ct.id as trade_id,
        ct.seller_id,
        u.username as seller_username,
        ct.user_card_id,
        ct.price,
        ct.created_at,
        c.*,
        p.*
       FROM card_trades ct
       JOIN user_cards uc ON ct.user_card_id = uc.id
       JOIN cards c ON uc.card_id = c.id
       JOIN players p ON c.player_id = p.id
       JOIN users u ON ct.seller_id = u.id
       WHERE ct.seller_id = ? AND ct.status = 'ACTIVE'
       ORDER BY ct.created_at DESC`,
      [userId]
    );

    return results.map(result => ({
      trade_id: result.trade_id,
      seller_id: result.seller_id,
      seller_username: result.seller_username,
      user_card_id: result.user_card_id,
      price: result.price,
      created_at: result.created_at,
      card: {
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
      }
    }));
  } catch (error) {
    console.error('Error getting user cards for sale:', error);
    return [];
  }
}

// Obtener historial de intercambios del usuario
export async function getUserTradeHistory(userId: number, limit: number = 20): Promise<{
  id: number;
  seller_id: number;
  buyer_id: number | null;
  price: number;
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED';
  created_at: string;
  completed_at: string | null;
  type: 'SALE' | 'PURCHASE';
  card?: CardWithPlayer;
}[]> {
  try {
    const results = await executeQuery<any>(
      `SELECT 
        ct.*,
        CASE 
          WHEN ct.seller_id = ? THEN 'SALE'
          ELSE 'PURCHASE'
        END as type,
        c.*,
        p.*
       FROM card_trades ct
       LEFT JOIN user_cards uc ON ct.user_card_id = uc.id
       LEFT JOIN cards c ON uc.card_id = c.id
       LEFT JOIN players p ON c.player_id = p.id
       WHERE ct.seller_id = ? OR ct.buyer_id = ?
       ORDER BY ct.created_at DESC
       LIMIT ?`,
      [userId, userId, userId, limit]
    );

    return results.map(result => ({
      id: result.id,
      seller_id: result.seller_id,
      buyer_id: result.buyer_id,
      price: result.price,
      status: result.status,
      created_at: result.created_at,
      completed_at: result.completed_at,
      type: result.type,
      card: result.name ? {
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
      } : undefined
    }));
  } catch (error) {
    console.error('Error getting trade history:', error);
    return [];
  }
}

// Obtener estadísticas del mercado
export async function getMarketStats(): Promise<{
  totalActiveListings: number;
  averagePrice: number;
  cheapestCard: number;
  mostExpensiveCard: number;
  totalVolume: number;
}> {
  try {
    const activeStats = await executeQuerySingle<any>(
      `SELECT 
        COUNT(*) as total_active_listings,
        AVG(price) as average_price,
        MIN(price) as cheapest_card,
        MAX(price) as most_expensive_card
       FROM card_trades 
       WHERE status = 'ACTIVE'`
    );

    const volumeStats = await executeQuerySingle<any>(
      `SELECT SUM(price) as total_volume
       FROM card_trades 
       WHERE status = 'SOLD' AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    return {
      totalActiveListings: activeStats?.total_active_listings || 0,
      averagePrice: Math.round(activeStats?.average_price || 0),
      cheapestCard: activeStats?.cheapest_card || 0,
      mostExpensiveCard: activeStats?.most_expensive_card || 0,
      totalVolume: volumeStats?.total_volume || 0
    };
  } catch (error) {
    console.error('Error getting market stats:', error);
    return {
      totalActiveListings: 0,
      averagePrice: 0,
      cheapestCard: 0,
      mostExpensiveCard: 0,
      totalVolume: 0
    };
  }
}