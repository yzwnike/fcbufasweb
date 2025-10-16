import type { Pack, User } from './mysql';
import { executeQuery, executeQuerySingle, executeTransaction } from './mysql';
import { openCardPack, PACK_PRICES, type CardWithPlayer } from './cards';

// Configuración de sobres
export const PACK_CONFIG = {
  FREE_PACK_COOLDOWN_HOURS: 24,
  SPEEDUP_COST_PER_HOUR: 10,
  MAX_SPEEDUP_COST: 240 // Máximo 24 horas * 10 monedas
};

// Obtener tiempo restante para el próximo sobre gratuito
export async function getFreePackCooldown(userId: number): Promise<{
  canClaimFree: boolean;
  nextFreePackTime: Date | null;
  hoursRemaining: number;
  minutesRemaining: number;
}> {
  try {
    const user = await executeQuerySingle<any>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return {
        canClaimFree: false,
        nextFreePackTime: null,
        hoursRemaining: 0,
        minutesRemaining: 0
      };
    }

    // Buscar el último sobre gratuito reclamado
    const lastFreePack = await executeQuerySingle<Pack>(
      'SELECT * FROM packs WHERE user_id = ? AND type = "FREE_DAILY" ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (!lastFreePack) {
      // Nunca ha reclamado un sobre gratuito
      return {
        canClaimFree: true,
        nextFreePackTime: null,
        hoursRemaining: 0,
        minutesRemaining: 0
      };
    }

    const lastPackTime = new Date(lastFreePack.created_at);
    const now = new Date();
    const cooldownEndTime = new Date(lastPackTime.getTime() + (PACK_CONFIG.FREE_PACK_COOLDOWN_HOURS * 60 * 60 * 1000));

    if (now >= cooldownEndTime) {
      return {
        canClaimFree: true,
        nextFreePackTime: null,
        hoursRemaining: 0,
        minutesRemaining: 0
      };
    }

    const timeRemaining = cooldownEndTime.getTime() - now.getTime();
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    return {
      canClaimFree: false,
      nextFreePackTime: cooldownEndTime,
      hoursRemaining,
      minutesRemaining
    };
  } catch (error) {
    console.error('Error getting free pack cooldown:', error);
    return {
      canClaimFree: false,
      nextFreePackTime: null,
      hoursRemaining: 0,
      minutesRemaining: 0
    };
  }
}

// Calcular costo de acelerar el sobre gratuito
export function calculateSpeedupCost(hoursRemaining: number, minutesRemaining: number): number {
  const totalMinutesRemaining = (hoursRemaining * 60) + minutesRemaining;
  const totalHoursRemaining = Math.ceil(totalMinutesRemaining / 60);
  
  const cost = Math.min(
    totalHoursRemaining * PACK_CONFIG.SPEEDUP_COST_PER_HOUR,
    PACK_CONFIG.MAX_SPEEDUP_COST
  );
  
  return Math.max(cost, PACK_CONFIG.SPEEDUP_COST_PER_HOUR); // Mínimo 1 hora
}

// Reclamar sobre gratuito
export async function claimFreePack(userId: number): Promise<{
  success: boolean;
  cards?: CardWithPlayer[];
  error?: string;
}> {
  try {
    const cooldown = await getFreePackCooldown(userId);
    
    if (!cooldown.canClaimFree) {
      return {
        success: false,
        error: `Debes esperar ${cooldown.hoursRemaining}h ${cooldown.minutesRemaining}m para el próximo sobre gratuito`
      };
    }

    // Abrir sobre gratuito
    const result = await openCardPack(userId, 'FREE_DAILY');
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Error al abrir el sobre'
      };
    }

    // Registrar el sobre en la tabla de packs
    await executeQuery(
      'INSERT INTO packs (user_id, type, cost, opened) VALUES (?, ?, ?, ?)',
      [userId, 'FREE_DAILY', 0, true]
    );

    return {
      success: true,
      cards: result.cards
    };
  } catch (error) {
    console.error('Error claiming free pack:', error);
    return {
      success: false,
      error: 'Error interno del servidor'
    };
  }
}

// Acelerar sobre gratuito con monedas
export async function speedupFreePack(userId: number): Promise<{
  success: boolean;
  cards?: CardWithPlayer[];
  coinsSpent: number;
  error?: string;
}> {
  try {
    const cooldown = await getFreePackCooldown(userId);
    
    if (cooldown.canClaimFree) {
      return {
        success: false,
        coinsSpent: 0,
        error: 'Ya puedes reclamar un sobre gratuito'
      };
    }

    const speedupCost = calculateSpeedupCost(cooldown.hoursRemaining, cooldown.minutesRemaining);

    // Verificar que el usuario tiene suficientes monedas
    const user = await executeQuerySingle<User>(
      'SELECT coins FROM users WHERE id = ?',
      [userId]
    );

    if (!user || user.coins < speedupCost) {
      return {
        success: false,
        coinsSpent: 0,
        error: 'No tienes suficientes monedas'
      };
    }

    // Procesar en una transacción
    const result = await executeTransaction(async (connection) => {
      // Descontar monedas
      await connection.execute(
        'UPDATE users SET coins = coins - ? WHERE id = ?',
        [speedupCost, userId]
      );

      // Registrar transacción
      await connection.execute(
        'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
        [userId, -speedupCost, 'PACK_SPEEDUP', `Acelerar sobre gratuito (${cooldown.hoursRemaining}h ${cooldown.minutesRemaining}m)`]
      );

      // Abrir el sobre
      const packResult = await openCardPack(userId, 'FREE_DAILY');
      
      if (!packResult.success) {
        throw new Error(packResult.error || 'Error al abrir el sobre');
      }

      // Registrar el sobre
      await connection.execute(
        'INSERT INTO packs (user_id, type, cost, opened) VALUES (?, ?, ?, ?)',
        [userId, 'FREE_DAILY', speedupCost, true]
      );

      return packResult.cards;
    });

    return {
      success: true,
      cards: result,
      coinsSpent: speedupCost
    };
  } catch (error) {
    console.error('Error speeding up free pack:', error);
    return {
      success: false,
      coinsSpent: 0,
      error: 'Error interno del servidor'
    };
  }
}

// Comprar sobre premium
export async function buyPremiumPack(userId: number): Promise<{
  success: boolean;
  cards?: CardWithPlayer[];
  coinsSpent: number;
  error?: string;
}> {
  try {
    const cost = PACK_PRICES.PREMIUM;

    // Verificar que el usuario tiene suficientes monedas
    const user = await executeQuerySingle<User>(
      'SELECT coins FROM users WHERE id = ?',
      [userId]
    );

    if (!user || user.coins < cost) {
      return {
        success: false,
        coinsSpent: 0,
        error: 'No tienes suficientes monedas'
      };
    }

    // Procesar en una transacción
    const result = await executeTransaction(async (connection) => {
      // Descontar monedas
      await connection.execute(
        'UPDATE users SET coins = coins - ? WHERE id = ?',
        [cost, userId]
      );

      // Registrar transacción
      await connection.execute(
        'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
        [userId, -cost, 'PACK_PURCHASE', 'Compra de sobre premium']
      );

      // Abrir el sobre
      const packResult = await openCardPack(userId, 'PREMIUM');
      
      if (!packResult.success) {
        throw new Error(packResult.error || 'Error al abrir el sobre');
      }

      // Registrar el sobre
      await connection.execute(
        'INSERT INTO packs (user_id, type, cost, opened) VALUES (?, ?, ?, ?)',
        [userId, 'PREMIUM', cost, true]
      );

      return packResult.cards;
    });

    return {
      success: true,
      cards: result,
      coinsSpent: cost
    };
  } catch (error) {
    console.error('Error buying premium pack:', error);
    return {
      success: false,
      coinsSpent: 0,
      error: 'Error interno del servidor'
    };
  }
}

// Comprar sobre especial
export async function buySpecialPack(userId: number): Promise<{
  success: boolean;
  cards?: CardWithPlayer[];
  coinsSpent: number;
  error?: string;
}> {
  try {
    const cost = PACK_PRICES.SPECIAL;

    // Verificar que el usuario tiene suficientes monedas
    const user = await executeQuerySingle<User>(
      'SELECT coins FROM users WHERE id = ?',
      [userId]
    );

    if (!user || user.coins < cost) {
      return {
        success: false,
        coinsSpent: 0,
        error: 'No tienes suficientes monedas'
      };
    }

    // Procesar en una transacción
    const result = await executeTransaction(async (connection) => {
      // Descontar monedas
      await connection.execute(
        'UPDATE users SET coins = coins - ? WHERE id = ?',
        [cost, userId]
      );

      // Registrar transacción
      await connection.execute(
        'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
        [userId, -cost, 'PACK_PURCHASE', 'Compra de sobre especial']
      );

      // Abrir el sobre
      const packResult = await openCardPack(userId, 'SPECIAL');
      
      if (!packResult.success) {
        throw new Error(packResult.error || 'Error al abrir el sobre');
      }

      // Registrar el sobre
      await connection.execute(
        'INSERT INTO packs (user_id, type, cost, opened) VALUES (?, ?, ?, ?)',
        [userId, 'SPECIAL', cost, true]
      );

      return packResult.cards;
    });

    return {
      success: true,
      cards: result,
      coinsSpent: cost
    };
  } catch (error) {
    console.error('Error buying special pack:', error);
    return {
      success: false,
      coinsSpent: 0,
      error: 'Error interno del servidor'
    };
  }
}

// Obtener historial de sobres del usuario
export async function getUserPackHistory(userId: number, limit: number = 20): Promise<{
  id: number;
  type: 'FREE_DAILY' | 'PREMIUM' | 'SPECIAL';
  cost: number;
  opened: boolean;
  created_at: string;
  opened_at: string | null;
}[]> {
  try {
    return await executeQuery<any>(
      'SELECT * FROM packs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
  } catch (error) {
    console.error('Error getting pack history:', error);
    return [];
  }
}

// Obtener estadísticas de sobres del usuario
export async function getUserPackStats(userId: number): Promise<{
  totalPacksOpened: number;
  freePacksOpened: number;
  premiumPacksOpened: number;
  specialPacksOpened: number;
  totalCoinsSpent: number;
}> {
  try {
    const stats = await executeQuerySingle<any>(
      `SELECT 
        COUNT(*) as total_packs_opened,
        SUM(CASE WHEN type = 'FREE_DAILY' THEN 1 ELSE 0 END) as free_packs_opened,
        SUM(CASE WHEN type = 'PREMIUM' THEN 1 ELSE 0 END) as premium_packs_opened,
        SUM(CASE WHEN type = 'SPECIAL' THEN 1 ELSE 0 END) as special_packs_opened,
        SUM(cost) as total_coins_spent
       FROM packs WHERE user_id = ? AND opened = true`,
      [userId]
    );

    return {
      totalPacksOpened: stats?.total_packs_opened || 0,
      freePacksOpened: stats?.free_packs_opened || 0,
      premiumPacksOpened: stats?.premium_packs_opened || 0,
      specialPacksOpened: stats?.special_packs_opened || 0,
      totalCoinsSpent: stats?.total_coins_spent || 0
    };
  } catch (error) {
    console.error('Error getting pack stats:', error);
    return {
      totalPacksOpened: 0,
      freePacksOpened: 0,
      premiumPacksOpened: 0,
      specialPacksOpened: 0,
      totalCoinsSpent: 0
    };
  }
}