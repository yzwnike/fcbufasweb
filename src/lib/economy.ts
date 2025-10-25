// Configuración económica del juego
export const ECONOMY_CONFIG = {
  // Quiz diario
  QUIZ: {
    COINS_PER_CORRECT_ANSWER: 80,
    PERFECT_BONUS: 50, // +50 si aciertas 5/5
    STREAK_BONUS: 20, // +20 si ayer también completaste 5/5 (no acumulativo)
    MAX_DAILY_PAYOUT: 550, // Cap máximo diario (80*5 + 50 + 20 = 470, redondeado a 550)
    QUESTIONS_PER_DAY: 5
  },
  
  // Fantasy Rush
  FANTASY: {
    POINTS_MULTIPLIER: 30, // puntos_totales * 30 (sin cap)
  },
  
  // Rangos de cartas (renombrados)
  CARD_TIERS: {
    NORMAL: { name: 'Normal', basePrice: 300 },         // era Silver
    ESPECIAL: { name: 'Especial', basePrice: 1200 },   // nuevo tier
    ELITE: { name: 'Elite', basePrice: 3000 },         // era Elite
    LEGENDARIA: { name: 'Legendaria', basePrice: 6000 } // era Legend
  },
  
  // Multiplicadores por tipo especial
  SPECIAL_TYPE_MULTIPLIERS: {
    // Team of the Week - 0.9x
    TEAM_OF_THE_WEEK: 0.9,
    
    // Rating Reload, Market Master, Assist Engine, Comeback Hero - 1.0-1.2x ajustable
    RATING_RELOAD: 1.0,
    MARKET_MASTER: 1.1,
    ASSIST_ENGINE: 1.1,
    COMEBACK_HERO: 1.2,
    
    // Player of the Month - 1.3x
    PLAYER_OF_THE_MONTH: 1.3,
    
    // Base cards
    Regular: 1.0,
    OLD_GENERATION: 1.0
  },
  
  // Configuración de packs
  PACKS: {
    BASIC: {
      type: 'FREE_DAILY',
      cost: 0,
      cooldownHours: 24,
      speedupCostPerHour: 10,
      odds: {
        NORMAL: 0.87,    // 87% Normal
        ESPECIAL: 0.09,  // 9% Especial
        ELITE: 0.03,     // 3% Elite
        LEGENDARIA: 0.01 // 1% Legendaria
      }
    },
    PREMIUM: {
      type: 'PREMIUM',
      cost: 600,
      odds: {
        NORMAL: 0.70,    // 70% Normal
        ESPECIAL: 0.20,  // 20% Especial
        ELITE: 0.07,     // 7% Elite
        LEGENDARIA: 0.03 // 3% Legendaria
      }
    },
    SPECIAL: {
      type: 'SPECIAL',
      cost: 1500,
      odds: {
        NORMAL: 0.00,    // 0% Normal
        ESPECIAL: 0.80,  // 80% Especial
        ELITE: 0.15,     // 15% Elite
        LEGENDARIA: 0.05 // 5% Legendaria
      }
    }
  },
  
  // Mercado
  MARKET: {
    TRANSACTION_FEE: 0, // Sin impuestos ni fees (0%)
    TAXES: 0
  },
  
  // Sistema de oferta/demanda
  DEMAND_SYSTEM: {
    // Coeficientes iniciales por tipo especial
    INITIAL_COEFFICIENTS: {
      TEAM_OF_THE_WEEK: 0.9,
      RATING_RELOAD: 1.0,
      MARKET_MASTER: 1.0,
      ASSIST_ENGINE: 1.0,
      COMEBACK_HERO: 1.0,
      PLAYER_OF_THE_MONTH: 1.3
    },
    
    // Límites para ajuste de coeficientes
    COEFFICIENT_LIMITS: {
      TEAM_OF_THE_WEEK: { min: 0.8, max: 1.0 },
      RATING_RELOAD: { min: 0.8, max: 1.2 },
      MARKET_MASTER: { min: 0.8, max: 1.2 },
      ASSIST_ENGINE: { min: 0.8, max: 1.2 },
      COMEBACK_HERO: { min: 0.8, max: 1.2 },
      PLAYER_OF_THE_MONTH: { min: 1.1, max: 1.5 }
    },
    
    // Configuración de ajuste semanal
    WEEKLY_ADJUSTMENT: {
      enabled: true,
      driftFactor: 0.05 // 5% de drift máximo por semana
    }
  }
};

// Helper functions para economía

/**
 * Calcula el payout del quiz diario con streak y bonificaciones
 */
export function calculateQuizPayout(
  correctAnswers: number,
  hadPerfectYesterday: boolean = false
): number {
  const baseCoins = correctAnswers * ECONOMY_CONFIG.QUIZ.COINS_PER_CORRECT_ANSWER;
  const perfectBonus = correctAnswers === ECONOMY_CONFIG.QUIZ.QUESTIONS_PER_DAY 
    ? ECONOMY_CONFIG.QUIZ.PERFECT_BONUS : 0;
  const streakBonus = hadPerfectYesterday && correctAnswers === ECONOMY_CONFIG.QUIZ.QUESTIONS_PER_DAY 
    ? ECONOMY_CONFIG.QUIZ.STREAK_BONUS : 0;
  
  const totalPayout = baseCoins + perfectBonus + streakBonus;
  
  // Aplicar cap de 550
  return Math.min(totalPayout, ECONOMY_CONFIG.QUIZ.MAX_DAILY_PAYOUT);
}

/**
 * Calcula el payout de Fantasy Rush
 */
export function calculateFantasyPayout(totalPoints: number): number {
  return totalPoints * ECONOMY_CONFIG.FANTASY.POINTS_MULTIPLIER;
}

/**
 * Obtiene el precio base de una carta según su nuevo tier
 */
export function getCardBasePrice(rarity: string): number {
  switch (rarity) {
    case 'Bronze':
    case 'Silver': // legacy -> Normal
      return ECONOMY_CONFIG.CARD_TIERS.NORMAL.basePrice;
    case 'Gold': // legacy -> Especial
      return ECONOMY_CONFIG.CARD_TIERS.ESPECIAL.basePrice;
    case 'Elite': // legacy -> Elite
      return ECONOMY_CONFIG.CARD_TIERS.ELITE.basePrice;
    case 'Legend': // legacy -> Legendaria
      return ECONOMY_CONFIG.CARD_TIERS.LEGENDARIA.basePrice;
    default:
      return ECONOMY_CONFIG.CARD_TIERS.NORMAL.basePrice;
  }
}

/**
 * Obtiene el multiplicador de precio por tipo especial
 */
export function getSpecialTypeMultiplier(specialType: string): number {
  return ECONOMY_CONFIG.SPECIAL_TYPE_MULTIPLIERS[specialType as keyof typeof ECONOMY_CONFIG.SPECIAL_TYPE_MULTIPLIERS] || 1.0;
}

/**
 * Calcula el costo de acelerar el pack gratuito
 */
export function calculatePackSpeedupCost(hoursRemaining: number): number {
  // Redondear hacia arriba (ceil) las horas restantes
  const hoursCeil = Math.ceil(hoursRemaining);
  return hoursCeil * ECONOMY_CONFIG.PACKS.BASIC.speedupCostPerHour;
}

/**
 * Determina la rareza de una carta basada en las odds del pack
 */
export function determinePackCardRarity(packType: 'BASIC' | 'PREMIUM' | 'SPECIAL'): 'NORMAL' | 'ESPECIAL' | 'ELITE' | 'LEGENDARIA' {
  const random = Math.random();
  const odds = ECONOMY_CONFIG.PACKS[packType].odds;
  
  let cumulative = 0;
  for (const [rarity, probability] of Object.entries(odds)) {
    cumulative += probability;
    if (random <= cumulative) {
      return rarity as 'NORMAL' | 'ESPECIAL' | 'ELITE' | 'LEGENDARIA';
    }
  }
  
  return 'NORMAL'; // Fallback
}

/**
 * Mapea las rarezas legacy a las nuevas
 */
export function mapLegacyRarityToNew(legacyRarity: string): string {
  switch (legacyRarity) {
    case 'Bronze':
    case 'Silver':
      return 'Normal';
    case 'Gold':
    case 'Elite':
      return 'Especial';
    case 'Legend':
      return 'Legendaria';
    default:
      return legacyRarity;
  }
}

/**
 * Mapea special_type a la rareza correcta para mostrar en UI
 * NORMAL: Regular, OLD_GENERATION
 * ESPECIAL: TEAM_OF_THE_WEEK 
 * ELITE: MARKET_MASTER, RATING_RELOAD, COMEBACK_HERO, ASSIST_ENGINE
 * LEGENDARIO: PLAYER_OF_THE_MONTH
 */
export function getCardDisplayRarity(specialType: string): string {
  switch (specialType) {
    case 'Regular':
    case 'OLD_GENERATION':
      return 'NORMAL';
    case 'TEAM_OF_THE_WEEK':
    case 'NOM_POTM':
      return 'ESPECIAL';
    case 'MARKET_MASTER':
    case 'RATING_RELOAD':
    case 'COMEBACK_HERO':
    case 'ASSIST_ENGINE':
      return 'ELITE';
    case 'PLAYER_OF_THE_MONTH':
      return 'LEGENDARIO';
    default:
      return 'NORMAL';
  }
}

/**
 * Obtiene el color CSS para cada rareza de UI
 */
export function getRarityColor(displayRarity: string): string {
  switch (displayRarity) {
    case 'NORMAL':
      return 'from-gray-400 to-gray-600';
    case 'ESPECIAL':
      return 'from-blue-500 to-blue-700';
    case 'ELITE':
      return 'from-purple-500 to-purple-700';
    case 'LEGENDARIO':
      return 'from-yellow-400 to-orange-500';
    default:
      return 'from-gray-400 to-gray-600';
  }
}

/**
 * Clamp function para limitar valores entre min y max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Obtiene los límites de coeficiente para un tipo especial
 */
export function getCoefficientLimits(specialType: string) {
  return ECONOMY_CONFIG.DEMAND_SYSTEM.COEFFICIENT_LIMITS[specialType as keyof typeof ECONOMY_CONFIG.DEMAND_SYSTEM.COEFFICIENT_LIMITS] 
    || { min: 0.8, max: 1.2 };
}

/**
 * Ajusta el coeficiente de demanda basado en ventas
 */
export function adjustDemandCoefficient(
  currentCoeff: number,
  medianSalePrice: number,
  targetPrice: number,
  specialType: string
): number {
  const limits = getCoefficientLimits(specialType);
  const priceRatio = medianSalePrice / targetPrice;
  
  // Si se vende por encima del target, aumentar coeficiente (más demanda)
  // Si se vende por debajo, disminuir coeficiente (menos demanda)
  let newCoeff = currentCoeff * (0.95 + (priceRatio * 0.1));
  
  // Aplicar límites
  return clamp(newCoeff, limits.min, limits.max);
}