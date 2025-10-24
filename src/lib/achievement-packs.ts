import type { Card } from './mysql';
import { executeQuery, executeTransaction } from './mysql';
import { getCardWithPlayer, type CardWithPlayer } from './cards';

// Configuración de probabilidades para sobres de logros
export const ACHIEVEMENT_PACK_ODDS = {
  // Sobres normales de logros: 70% normal, 18% especial, 8% elite, 4% legendario
  NORMAL: {
    NORMAL: 0.70,
    ESPECIAL: 0.18, 
    ELITE: 0.08,
    LEGENDARIA: 0.04
  },
  // Sobres de evento: 80% elite, 20% legendario
  EVENTO: {
    NORMAL: 0.00,
    ESPECIAL: 0.00,
    ELITE: 0.80,
    LEGENDARIA: 0.20
  }
};

// Tipos de sobres de logros
export type AchievementPackType = 
  | 'MEDIA_81_85'      // Carta media 81-85
  | 'MEDIA_83_87'      // Carta media 83-87
  | 'MEDIA_84_88'      // Carta media 84-88
  | 'MEDIA_84_PLUS'    // Carta media 84+
  | 'MEDIA_86_89'      // Carta media 86-89
  | 'BASE_85_89'       // Carta BASE media 85-89
  | 'OG_81_87'         // Carta OG media 81-87
  | 'SPECIAL_85'       // Carta media 85+
  | 'SPECIAL_85_PLUS'  // Sobre 85+
  | 'ELITE_RANDOM'     // Carta Elite aleatoria
  | 'ESPECIAL'         // Carta Especial
  | 'ELITE'            // Carta Elite
  | 'EVENTO'           // Sobre de evento media +90
  | 'EVENTO_90_PLUS';  // Sobre evento media 90+

// Determina la rareza según el tipo de sobre
function determinePackRarity(packType: AchievementPackType): 'NORMAL' | 'ESPECIAL' | 'ELITE' | 'LEGENDARIA' {
  const random = Math.random();
  
  // Sobres garantizados 100% a rareza específica
  if (packType === 'ELITE_RANDOM' || packType === 'ELITE') return 'ELITE';
  if (packType === 'ESPECIAL') return 'ESPECIAL';
  
  // Sobres de evento usan probabilidades especiales (80% Elite, 20% Legendaria)
  if (packType.includes('EVENTO')) {
    const odds = ACHIEVEMENT_PACK_ODDS.EVENTO;
    if (random <= odds.ELITE) return 'ELITE';
    return 'LEGENDARIA';
  }
  
  // Sobres normales usan probabilidades estándar (70% Normal, 18% Especial, 8% Elite, 4% Legendaria)
  const odds = ACHIEVEMENT_PACK_ODDS.NORMAL;
  let cumulative = 0;
  
  for (const [rarity, probability] of Object.entries(odds)) {
    cumulative += probability;
    if (random <= cumulative) {
      return rarity as 'NORMAL' | 'ESPECIAL' | 'ELITE' | 'LEGENDARIA';
    }
  }
  
  return 'NORMAL'; // Fallback
}

// Extrae rango de media del tipo de sobre
function extractRatingRange(packType: AchievementPackType): { min: number, max: number } {
  if (packType.includes('81_85')) return { min: 81, max: 85 };
  if (packType.includes('83_87')) return { min: 83, max: 87 };
  if (packType.includes('84_88')) return { min: 84, max: 88 };
  if (packType === 'MEDIA_84_PLUS') return { min: 84, max: 99 };
  if (packType.includes('85_89')) return { min: 85, max: 89 };
  if (packType.includes('86_89')) return { min: 86, max: 89 };
  if (packType.includes('85') || packType.includes('85_PLUS')) return { min: 85, max: 99 };
  if (packType.includes('90_PLUS')) return { min: 90, max: 99 };
  
  return { min: 75, max: 99 }; // Default range
}

// Extrae tipo específico del sobre
function extractSpecialType(packType: AchievementPackType): string[] | null {
  if (packType.includes('BASE')) return ['Regular'];
  if (packType.includes('OG')) return ['OLD_GENERATION'];
  return null; // Sin restricción de tipo
}

// Mapea rareza a special_type
function mapRarityToSpecialType(rarity: 'NORMAL' | 'ESPECIAL' | 'ELITE' | 'LEGENDARIA'): string[] {
  switch (rarity) {
    case 'NORMAL':
      return ['Regular', 'OLD_GENERATION'];
    case 'ESPECIAL':
      return ['TEAM_OF_THE_WEEK'];
    case 'ELITE':
      return ['MARKET_MASTER', 'RATING_RELOAD', 'COMEBACK_HERO', 'ASSIST_ENGINE'];
    case 'LEGENDARIA':
      return ['PLAYER_OF_THE_MONTH'];
    default:
      return ['Regular'];
  }
}

// Construye query para seleccionar carta
async function buildCardQuery(
  packType: AchievementPackType,
  rarity: 'NORMAL' | 'ESPECIAL' | 'ELITE' | 'LEGENDARIA'
): Promise<{ query: string, params: any[] }> {
  const ratingRange = extractRatingRange(packType);
  const specificTypes = extractSpecialType(packType);
  const rarityTypes = mapRarityToSpecialType(rarity);
  
  // Usar tipos específicos del sobre si están definidos, sino usar los de rareza
  const targetTypes = specificTypes || rarityTypes;
  
  console.log('buildCardQuery:', {
    packType,
    rarity,
    ratingRange,
    specificTypes,
    rarityTypes,
    targetTypes
  });
  
  if (!targetTypes || targetTypes.length === 0) {
    throw new Error('No se pudieron determinar tipos de carta para ' + rarity);
  }
  
  const placeholders = targetTypes.map(() => '?').join(',');
  
  // Excluir jorgeCH de sobres normales (solo disponible en sobres EVENTO)
  const isEventoPack = packType.includes('EVENTO');
  const excludeJorgeCH = !isEventoPack;
  
  let query = `
    SELECT c.*, p.fifa_rating,
      LEAST(99, COALESCE(c.fifa_rating_override, p.fifa_rating + CASE c.special_type
        WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
        WHEN 'PLAYER_OF_THE_MONTH' THEN 4
        WHEN 'RATING_RELOAD' THEN 2
        WHEN 'ASSIST_ENGINE' THEN 2
        WHEN 'MARKET_MASTER' THEN 2
        WHEN 'COMEBACK_HERO' THEN 3
        ELSE 0 END)) AS effective_fifa_rating
    FROM cards c 
    JOIN players p ON c.player_id = p.id 
    WHERE c.special_type IN (${placeholders})
    ${excludeJorgeCH ? "AND NOT (p.card_asset_basename = 'jorge' AND c.special_type = 'COMEBACK_HERO')" : ''}
    AND LEAST(99, COALESCE(c.fifa_rating_override, p.fifa_rating + CASE c.special_type
      WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
      WHEN 'PLAYER_OF_THE_MONTH' THEN 4
      WHEN 'RATING_RELOAD' THEN 2
      WHEN 'ASSIST_ENGINE' THEN 2
      WHEN 'MARKET_MASTER' THEN 2
      WHEN 'COMEBACK_HERO' THEN 3
      ELSE 0 END)) >= ? 
    AND LEAST(99, COALESCE(c.fifa_rating_override, p.fifa_rating + CASE c.special_type
      WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
      WHEN 'PLAYER_OF_THE_MONTH' THEN 4
      WHEN 'RATING_RELOAD' THEN 2
      WHEN 'ASSIST_ENGINE' THEN 2
      WHEN 'MARKET_MASTER' THEN 2
      WHEN 'COMEBACK_HERO' THEN 3
      ELSE 0 END)) <= ?
    ORDER BY RAND() 
    LIMIT 1
  `;
  
  const params = [...targetTypes, ratingRange.min, ratingRange.max];
  
  console.log('Query construida:', { query: query.trim(), params });
  
  return { query, params };
}

// Calcular compensación de monedas por no poder cumplir la promesa del sobre
function calculateCompensation(originalRarity: 'NORMAL' | 'ESPECIAL' | 'ELITE' | 'LEGENDARIA', actualRarity: 'NORMAL' | 'ESPECIAL' | 'ELITE' | 'LEGENDARIA'): number {
  const values = { 'NORMAL': 0, 'ESPECIAL': 100, 'ELITE': 300, 'LEGENDARIA': 600 };
  const difference = values[originalRarity] - values[actualRarity];
  return Math.max(0, difference); // Solo compensar si el valor prometido era mayor
}

// Determinar rareza real de una carta basada en su special_type
function determineActualRarity(specialType: string): 'NORMAL' | 'ESPECIAL' | 'ELITE' | 'LEGENDARIA' {
  switch (specialType) {
    case 'TEAM_OF_THE_WEEK':
      return 'ESPECIAL';
    case 'MARKET_MASTER':
    case 'RATING_RELOAD':
    case 'COMEBACK_HERO':
    case 'ASSIST_ENGINE':
      return 'ELITE';
    case 'PLAYER_OF_THE_MONTH':
      return 'LEGENDARIA';
    default:
      return 'NORMAL';
  }
}

// Sistema de fallbacks inteligente cuando no hay cartas de la rareza solicitada
async function findCardWithIntelligentFallback(
  connection: any,
  packType: AchievementPackType,
  originalRarity: 'NORMAL' | 'ESPECIAL' | 'ELITE' | 'LEGENDARIA'
): Promise<{ card: Card | null, compensation: number }> {
  try {
    // Intentar con la rareza original primero
    const { query, params } = await buildCardQuery(packType, originalRarity);
    let [rows] = await connection.execute(query, params);
    
    console.log('Resultado query original:', { rowsLength: Array.isArray(rows) ? rows.length : 0 });
    
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('Carta encontrada con rareza original:', originalRarity);
      return { card: rows[0] as Card, compensation: 0 }; // Sin compensación si se cumple la promesa
    }
  } catch (queryError) {
    console.error('Error en query original:', queryError);
    // Continuar con fallbacks en caso de error
  }
  
  console.log(`No se encontraron cartas ${originalRarity} para el sobre ${packType}, aplicando fallback inteligente...`);
  
  // Sistema de fallbacks inteligente basado en jerarquía de rareza
  const fallbackOrder = {
    'LEGENDARIA': ['ELITE', 'ESPECIAL', 'NORMAL'], // Si no hay Legendarias, buscar Elite -> Especial -> Normal
    'ELITE': ['ESPECIAL', 'NORMAL'],               // Si no hay Elite, buscar Especial -> Normal  
    'ESPECIAL': ['NORMAL'],                        // Si no hay Especial, buscar Normal
    'NORMAL': []                                   // Si no hay Normal, no hay fallback (problema grave)
  };
  
  const fallbacks = fallbackOrder[originalRarity] || [];
  
  // Intentar fallbacks en orden de preferencia
  for (const fallbackRarity of fallbacks) {
    try {
      console.log(`Intentando fallback a rareza: ${fallbackRarity}`);
      const { query: fbQuery, params: fbParams } = await buildCardQuery(
        packType, 
        fallbackRarity as 'NORMAL' | 'ESPECIAL' | 'ELITE' | 'LEGENDARIA'
      );
      
      [rows] = await connection.execute(fbQuery, fbParams);
      if (Array.isArray(rows) && rows.length > 0) {
        console.log(`Fallback exitoso: se encontró carta ${fallbackRarity}`);
        const selectedCard = rows[0] as Card;
        const actualRarity = determineActualRarity(selectedCard.special_type);
        const compensation = calculateCompensation(originalRarity, actualRarity);
        return { card: selectedCard, compensation };
      }
    } catch (fallbackError) {
      console.error(`Error en fallback ${fallbackRarity}:`, fallbackError);
      // Continuar con el siguiente fallback
    }
  }
  
  // Fallback de emergencia: cualquier carta que cumpla el rango de media (sin restricción de rareza)
  try {
    const ratingRange = extractRatingRange(packType);
    console.log(`Fallback de emergencia: buscando cualquier carta en rango ${ratingRange.min}-${ratingRange.max}`);
    
    [rows] = await connection.execute(
      `SELECT c.* FROM cards c JOIN players p ON c.player_id = p.id 
       WHERE LEAST(99, COALESCE(c.fifa_rating_override, p.fifa_rating + CASE c.special_type
         WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
         WHEN 'PLAYER_OF_THE_MONTH' THEN 4
         WHEN 'RATING_RELOAD' THEN 2
         WHEN 'ASSIST_ENGINE' THEN 2
         WHEN 'MARKET_MASTER' THEN 2
         WHEN 'COMEBACK_HERO' THEN 3
         ELSE 0 END)) >= ? 
       AND LEAST(99, COALESCE(c.fifa_rating_override, p.fifa_rating + CASE c.special_type
         WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
         WHEN 'PLAYER_OF_THE_MONTH' THEN 4
         WHEN 'RATING_RELOAD' THEN 2
         WHEN 'ASSIST_ENGINE' THEN 2
         WHEN 'MARKET_MASTER' THEN 2
         WHEN 'COMEBACK_HERO' THEN 3
         ELSE 0 END)) <= ?
       ORDER BY RAND() LIMIT 1`,
      [ratingRange.min, ratingRange.max]
    );
    
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('Fallback de emergencia exitoso');
      const selectedCard = rows[0] as Card;
      const actualRarity = determineActualRarity(selectedCard.special_type);
      const compensation = calculateCompensation(originalRarity, actualRarity);
      return { card: selectedCard, compensation };
    }
  } catch (emergencyError) {
    console.error('Error en fallback de emergencia:', emergencyError);
  }
  
  // Último recurso: cualquier carta disponible
  try {
    console.log('Último recurso: cualquier carta disponible');
    [rows] = await connection.execute('SELECT c.* FROM cards c ORDER BY RAND() LIMIT 1');
    
    if (Array.isArray(rows) && rows.length > 0) {
      const selectedCard = rows[0] as Card;
      const actualRarity = determineActualRarity(selectedCard.special_type);
      const compensation = calculateCompensation(originalRarity, actualRarity);
      return { card: selectedCard, compensation };
    }
  } catch (lastResortError) {
    console.error('Error en último recurso:', lastResortError);
  }
  
  return { card: null, compensation: 0 };
}

// Función principal para abrir sobre de logro
export async function openAchievementPack(
  userId: number,
  packType: AchievementPackType
): Promise<{
  success: boolean;
  card?: CardWithPlayer;
  compensation?: number;
  error?: string;
}> {
  try {
    return await executeTransaction(async (connection) => {
      // Acortar packType para evitar problemas de límites de caracteres
      const shortPackType = packType.substring(0, 8);
      
      // Determinar rareza
      const rarity = determinePackRarity(packType);
      console.log(`Abriendo sobre ${shortPackType}, rareza determinada: ${rarity}`);
      
      // Buscar carta con sistema de fallbacks inteligente
      const result = await findCardWithIntelligentFallback(connection, packType, rarity);
      
      if (!result.card) {
        throw new Error('No hay cartas disponibles en la base de datos');
      }
      
      // Dar carta al usuario
      console.log('Insertando carta al usuario:', { userId, cardId: result.card.id });
      await connection.execute(
        'INSERT INTO user_cards (user_id, card_id) VALUES (?, ?)',
        [userId, result.card.id]
      );
      
      // Si hay compensación, otorgarla al usuario
      if (result.compensation > 0) {
        console.log('Aplicando compensación:', { compensation: result.compensation, userId, packType });
        
        await connection.execute(
          'UPDATE users SET coins = coins + ? WHERE id = ?',
          [result.compensation, userId]
        );
        
        const compensationDesc = 'C';
        console.log('Insertando transacción de compensación:', { userId, amount: result.compensation, desc: compensationDesc });
        
        await connection.execute(
          "INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, 'DAILY_QUIZ', ?)",
          [userId, result.compensation, compensationDesc]
        );
        
        console.log(`Compensación otorgada: +${result.compensation} monedas por recibir ${determineActualRarity(result.card.special_type)} en lugar de ${rarity}`);
      }
      
      // Obtener información completa de la carta
      const cardWithPlayer = await getCardWithPlayer(result.card.id);
      if (!cardWithPlayer) {
        throw new Error('Error obteniendo información de la carta');
      }
      
      console.log(`Sobre abierto exitosamente. Carta obtenida: ${cardWithPlayer.player.name} (${cardWithPlayer.special_type})`);
      
      return {
        success: true,
        card: cardWithPlayer,
        compensation: result.compensation
      };
    });
  } catch (error) {
    console.error('Error opening achievement pack:', {
      error,
      message: error?.message,
      stack: error?.stack,
      packType,
      userId
    });
    return {
      success: false,
      error: 'Error al abrir el sobre: ' + (error?.message || 'Unknown error')
    };
  }
}

// Función para obtener carta específica por nombre de imagen
export async function getSpecificCard(imagePath: string): Promise<Card | null> {
  try {
    // Extraer información del path para encontrar la carta
    const pathParts = imagePath.split('/');
    const filename = pathParts[pathParts.length - 1];
    const folder = pathParts[pathParts.length - 2];
    
    let specialType = 'Regular';
    if (folder === 'OG') specialType = 'OLD_GENERATION';
    else if (folder === 'TOTW') specialType = 'TEAM_OF_THE_WEEK';
    
    // Buscar carta por image_path o por pattern similar
    const cards = await executeQuery<Card>(
      'SELECT * FROM cards WHERE image_path = ? OR image_path LIKE ?',
      [imagePath, `%${filename}%`]
    );
    
    if (cards.length > 0) {
      return cards[0];
    }
    
    // Fallback: buscar por tipo especial
    const fallbackCards = await executeQuery<Card>(
      'SELECT * FROM cards WHERE special_type = ? ORDER BY RAND() LIMIT 1',
      [specialType]
    );
    
    return fallbackCards.length > 0 ? fallbackCards[0] : null;
  } catch (error) {
    console.error('Error getting specific card:', error);
    return null;
  }
}
