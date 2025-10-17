import type { FantasyRush, Player } from './mysql';
import { executeQuery, executeQuerySingle, executeTransaction } from './mysql';
import { getAllPlayers, getUserCards } from './cards';

// Configuración de Fantasy Rush
export const FANTASY_CONFIG = {
  COINS_MULTIPLIER: 20, // Total puntos * 20 = monedas
  MIN_WEEKLY_BONUS: 100,
  MAX_WEEKLY_BONUS: 500,
  POSITIONS: {
    FORWARD: ['ST', 'LW', 'RW'],
    MIDFIELDER: ['CM', 'CAM', 'CDM', 'LM', 'RM'],
    DEFENDER: ['CB', 'LB', 'RB', 'GK']
  }
};

// Interfaz para selección de Fantasy Rush
export interface FantasySelection {
  forwardPlayerId: number;
  midfielderPlayerId: number;
  defenderPlayerId: number;
}

// Interfaz para Fantasy Rush con detalles de jugadores
export interface FantasyRushWithPlayers extends FantasyRush {
  forward_player: Player;
  midfielder_player: Player;
  defender_player: Player;
}

// Obtener fecha de inicio de la semana actual (lunes)
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que lunes sea el inicio
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

// Tipo básico para elegibles (apto para UI)
export type EligiblePlayer = {
  id: number;
  name: string;
  position1: Player['position1'];
  position2: Player['position2'];
  fifa_rating: number;
  fantasy_points: number;
  image_path: string | null;
  owned: boolean; // posee carta base (Regular)
};

// Obtener SOLO los 10 jugadores base, marcando si el usuario posee su carta base (Regular)
export async function getEligiblePlayers(userId: number): Promise<{
  forwards: EligiblePlayer[];
  midfielders: EligiblePlayer[];
  defenders: EligiblePlayer[];
}> {
  try {
    // Lista de roster base (10)
    const baseNames = [
      'Nico Vehi','Pablo Vehi','Albert Rodriguez','Marc Sanchez','Mario Roca',
      'Marcos Lopez','Nico Uriburu','Javo Ayesta','Marc Permanyer','Fan Xu'
    ];

    // Traer datos base + si posee carta Regular + imagen base
    const rows = await executeQuery<any>(
      `SELECT 
         p.id, p.name, p.position1, p.position2, p.fifa_rating, p.fantasy_points,
         (
           SELECT c.image_path FROM cards c 
           WHERE c.player_id = p.id AND c.special_type = 'Regular' 
           ORDER BY c.id ASC LIMIT 1
         ) AS image_path,
         EXISTS(
           SELECT 1 FROM user_cards uc 
           JOIN cards c2 ON uc.card_id = c2.id 
           WHERE uc.user_id = ? AND c2.player_id = p.id AND c2.special_type = 'Regular'
         ) AS owned
       FROM players p
       WHERE p.name IN (${baseNames.map(()=>'?').join(',')})
       ORDER BY p.name ASC`,
      [userId, ...baseNames]
    );

    const mapped: EligiblePlayer[] = rows.map(r => ({
      id: r.id,
      name: r.name,
      position1: r.name === 'Nico Vehi' ? 'GK' : r.name === 'Marc Sanchez' ? 'CB' : r.name === 'Pablo Vehi' ? (r.position1 === 'RB' ? 'RB' : r.position1) : r.position1,
      position2: r.name === 'Nico Vehi' ? null : r.name === 'Marc Sanchez' ? null : r.name === 'Pablo Vehi' ? 'CM' : r.position2,
      fifa_rating: r.fifa_rating,
      fantasy_points: r.fantasy_points,
      image_path: r.image_path || null,
      owned: !!r.owned,
    }));

    const forwards = mapped.filter(p => 
      FANTASY_CONFIG.POSITIONS.FORWARD.includes(p.position1) || 
      (p.position2 && FANTASY_CONFIG.POSITIONS.FORWARD.includes(p.position2 as any))
    );
    const midfielders = mapped.filter(p => 
      FANTASY_CONFIG.POSITIONS.MIDFIELDER.includes(p.position1) || 
      (p.position2 && FANTASY_CONFIG.POSITIONS.MIDFIELDER.includes(p.position2 as any))
    );
    const defenders = mapped.filter(p => 
      FANTASY_CONFIG.POSITIONS.DEFENDER.includes(p.position1) || 
      (p.position2 && FANTASY_CONFIG.POSITIONS.DEFENDER.includes(p.position2 as any))
    );

    return { forwards, midfielders, defenders };
  } catch (error) {
    console.error('Error getting eligible players:', error);
    return { forwards: [], midfielders: [], defenders: [] };
  }
}

// Verificar si un jugador es elegible para una posición específica
function isPlayerEligibleForPosition(player: Player, position: 'FORWARD' | 'MIDFIELDER' | 'DEFENDER'): boolean {
  const positionArray = FANTASY_CONFIG.POSITIONS[position];
  return positionArray.includes(player.position1) || 
         (player.position2 && positionArray.includes(player.position2));
}

// Crear selección de Fantasy Rush
export async function createFantasySelection(
  userId: number,
  selection: FantasySelection,
  weekStart?: string
): Promise<{
  success: boolean;
  fantasyRushId?: number;
  error?: string;
}> {
  try {
    const currentWeekStart = weekStart || getWeekStart();

    // Verificar si ya existe una selección para esta semana
    const existingSelection = await executeQuerySingle<FantasyRush>(
      'SELECT id FROM fantasy_rush WHERE user_id = ? AND week_start = ?',
      [userId, currentWeekStart]
    );

    if (existingSelection) {
      return {
        success: false,
        error: 'Ya tienes una selección para esta semana'
      };
    }

    // Obtener información de los jugadores seleccionados
    const [forward, midfielder, defender] = await Promise.all([
      executeQuerySingle<Player>('SELECT * FROM players WHERE id = ?', [selection.forwardPlayerId]),
      executeQuerySingle<Player>('SELECT * FROM players WHERE id = ?', [selection.midfielderPlayerId]),
      executeQuerySingle<Player>('SELECT * FROM players WHERE id = ?', [selection.defenderPlayerId])
    ]);

    if (!forward || !midfielder || !defender) {
      return {
        success: false,
        error: 'Uno o más jugadores no encontrados'
      };
    }

    // Verificar que los jugadores son elegibles para sus posiciones
    if (!isPlayerEligibleForPosition(forward, 'FORWARD')) {
      return {
        success: false,
        error: `${forward.name} no es elegible como delantero`
      };
    }

    if (!isPlayerEligibleForPosition(midfielder, 'MIDFIELDER')) {
      return {
        success: false,
        error: `${midfielder.name} no es elegible como centrocampista`
      };
    }

    if (!isPlayerEligibleForPosition(defender, 'DEFENDER')) {
      return {
        success: false,
        error: `${defender.name} no es elegible como defensa/portero`
      };
    }

    // Verificar que el usuario posee la CARTA BASE (Regular) de cada jugador seleccionado
    const ownsBase = async (pid: number) => {
      const row = await executeQuerySingle<any>(
        `SELECT 1 FROM user_cards uc JOIN cards c ON uc.card_id = c.id 
         WHERE uc.user_id = ? AND c.player_id = ? AND c.special_type = 'Regular' LIMIT 1`,
        [userId, pid]
      );
      return !!row;
    };

    const [okF, okM, okD] = await Promise.all([
      ownsBase(selection.forwardPlayerId),
      ownsBase(selection.midfielderPlayerId),
      ownsBase(selection.defenderPlayerId)
    ]);

    if (!okF || !okM || !okD) {
      return {
        success: false,
        error: 'Necesitas la carta base de cada jugador seleccionado'
      };
    }

    // Crear la selección
    const result = await executeQuery<any>(
      `INSERT INTO fantasy_rush (user_id, week_start, forward_player_id, midfielder_player_id, defender_player_id, total_points, coins_earned) 
       VALUES (?, ?, ?, ?, ?, 0, 0)`,
      [userId, currentWeekStart, selection.forwardPlayerId, selection.midfielderPlayerId, selection.defenderPlayerId]
    );

    return {
      success: true,
      fantasyRushId: result.insertId
    };
  } catch (error) {
    console.error('Error creating fantasy selection:', error);
    return {
      success: false,
      error: 'Error interno del servidor'
    };
  }
}

// Actualizar selección de Fantasy Rush (solo si no ha comenzado la semana)
export async function updateFantasySelection(
  userId: number,
  fantasyRushId: number,
  selection: FantasySelection
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Obtener la selección existente
    const existingSelection = await executeQuerySingle<FantasyRush>(
      'SELECT * FROM fantasy_rush WHERE id = ? AND user_id = ?',
      [fantasyRushId, userId]
    );

    if (!existingSelection) {
      return {
        success: false,
        error: 'Selección no encontrada'
      };
    }

    // Verificar que no ha comenzado la semana (permitir cambios hasta el domingo)
    const weekStartDate = new Date(existingSelection.week_start);
    const now = new Date();
    
    if (now >= weekStartDate) {
      return {
        success: false,
        error: 'No puedes cambiar la selección después de que comience la semana'
      };
    }

    // Validar nuevos jugadores (similar a createFantasySelection)
    const [forward, midfielder, defender] = await Promise.all([
      executeQuerySingle<Player>('SELECT * FROM players WHERE id = ?', [selection.forwardPlayerId]),
      executeQuerySingle<Player>('SELECT * FROM players WHERE id = ?', [selection.midfielderPlayerId]),
      executeQuerySingle<Player>('SELECT * FROM players WHERE id = ?', [selection.defenderPlayerId])
    ]);

    if (!forward || !midfielder || !defender) {
      return {
        success: false,
        error: 'Uno o más jugadores no encontrados'
      };
    }

    // Verificar elegibilidad y posesión (similar a createFantasySelection)
    if (!isPlayerEligibleForPosition(forward, 'FORWARD') ||
        !isPlayerEligibleForPosition(midfielder, 'MIDFIELDER') ||
        !isPlayerEligibleForPosition(defender, 'DEFENDER')) {
      return {
        success: false,
        error: 'Uno o más jugadores no son elegibles para su posición'
      };
    }

    const ownsBase = async (pid: number) => {
      const row = await executeQuerySingle<any>(
        `SELECT 1 FROM user_cards uc JOIN cards c ON uc.card_id = c.id 
         WHERE uc.user_id = ? AND c.player_id = ? AND c.special_type = 'Regular' LIMIT 1`,
        [userId, pid]
      );
      return !!row;
    };

    const [okF, okM, okD] = await Promise.all([
      ownsBase(selection.forwardPlayerId),
      ownsBase(selection.midfielderPlayerId),
      ownsBase(selection.defenderPlayerId)
    ]);

    if (!okF || !okM || !okD) {
      return {
        success: false,
        error: 'Necesitas la carta base de cada jugador seleccionado'
      };
    }

    // Actualizar la selección
    await executeQuery(
      'UPDATE fantasy_rush SET forward_player_id = ?, midfielder_player_id = ?, defender_player_id = ? WHERE id = ?',
      [selection.forwardPlayerId, selection.midfielderPlayerId, selection.defenderPlayerId, fantasyRushId]
    );

    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating fantasy selection:', error);
    return {
      success: false,
      error: 'Error interno del servidor'
    };
  }
}

// Obtener selección de Fantasy Rush del usuario para una semana
export async function getUserFantasySelection(
  userId: number,
  weekStart?: string
): Promise<FantasyRushWithPlayers | null> {
  try {
    const currentWeekStart = weekStart || getWeekStart();

    const result = await executeQuerySingle<any>(
      `SELECT 
        fr.*,
        p1.* as forward_player,
        p2.* as midfielder_player,
        p3.* as defender_player
       FROM fantasy_rush fr
       JOIN players p1 ON fr.forward_player_id = p1.id
       JOIN players p2 ON fr.midfielder_player_id = p2.id
       JOIN players p3 ON fr.defender_player_id = p3.id
       WHERE fr.user_id = ? AND fr.week_start = ?`,
      [userId, currentWeekStart]
    );

    if (!result) return null;

    return {
      id: result.id,
      user_id: result.user_id,
      week_start: result.week_start,
      forward_player_id: result.forward_player_id,
      midfielder_player_id: result.midfielder_player_id,
      defender_player_id: result.defender_player_id,
      total_points: result.total_points,
      coins_earned: result.coins_earned,
      created_at: result.created_at,
      forward_player: {
        id: result.forward_player_id,
        name: result.forward_player.name,
        team: result.forward_player.team,
        position1: result.forward_player.position1,
        position2: result.forward_player.position2,
        pace: result.forward_player.pace,
        shooting: result.forward_player.shooting,
        passing: result.forward_player.passing,
        defending: result.forward_player.defending,
        physical: result.forward_player.physical,
        fifa_rating: result.forward_player.fifa_rating,
        market_value: result.forward_player.market_value,
        fantasy_points: result.forward_player.fantasy_points,
        image_url: result.forward_player.image_url,
        created_at: result.forward_player.created_at
      },
      midfielder_player: {
        id: result.midfielder_player_id,
        name: result.midfielder_player.name,
        team: result.midfielder_player.team,
        position1: result.midfielder_player.position1,
        position2: result.midfielder_player.position2,
        pace: result.midfielder_player.pace,
        shooting: result.midfielder_player.shooting,
        passing: result.midfielder_player.passing,
        defending: result.midfielder_player.defending,
        physical: result.midfielder_player.physical,
        fifa_rating: result.midfielder_player.fifa_rating,
        market_value: result.midfielder_player.market_value,
        fantasy_points: result.midfielder_player.fantasy_points,
        image_url: result.midfielder_player.image_url,
        created_at: result.midfielder_player.created_at
      },
      defender_player: {
        id: result.defender_player_id,
        name: result.defender_player.name,
        team: result.defender_player.team,
        position1: result.defender_player.position1,
        position2: result.defender_player.position2,
        pace: result.defender_player.pace,
        shooting: result.defender_player.shooting,
        passing: result.defender_player.passing,
        defending: result.defender_player.defending,
        physical: result.defender_player.physical,
        fifa_rating: result.defender_player.fifa_rating,
        market_value: result.defender_player.market_value,
        fantasy_points: result.defender_player.fantasy_points,
        image_url: result.defender_player.image_url,
        created_at: result.defender_player.created_at
      }
    };
  } catch (error) {
    console.error('Error getting user fantasy selection:', error);
    return null;
  }
}

// Procesar puntos de Fantasy Rush semanalmente (función administrativa)
export async function processWeeklyFantasyPoints(weekStart?: string): Promise<boolean> {
  try {
    const currentWeekStart = weekStart || getWeekStart();

    // Obtener todas las selecciones de la semana
    const selections = await executeQuery<FantasyRush>(
      'SELECT * FROM fantasy_rush WHERE week_start = ? AND total_points = 0',
      [currentWeekStart]
    );

    if (selections.length === 0) {
      return true; // No hay selecciones para procesar
    }

    await executeTransaction(async (connection) => {
      for (const selection of selections) {
        // Obtener puntos fantasy de los jugadores seleccionados
        const [forward, midfielder, defender] = await Promise.all([
          executeQuerySingle<Player>('SELECT fantasy_points FROM players WHERE id = ?', [selection.forward_player_id]),
          executeQuerySingle<Player>('SELECT fantasy_points FROM players WHERE id = ?', [selection.midfielder_player_id]),
          executeQuerySingle<Player>('SELECT fantasy_points FROM players WHERE id = ?', [selection.defender_player_id])
        ]);

        const totalPoints = (forward?.fantasy_points || 0) + 
                          (midfielder?.fantasy_points || 0) + 
                          (defender?.fantasy_points || 0);

        const coinsEarned = totalPoints * FANTASY_CONFIG.COINS_MULTIPLIER;

        // Actualizar selección con puntos y monedas
        await connection.execute(
          'UPDATE fantasy_rush SET total_points = ?, coins_earned = ? WHERE id = ?',
          [totalPoints, coinsEarned, selection.id]
        );

        // Dar monedas al usuario
        await connection.execute(
          'UPDATE users SET coins = coins + ? WHERE id = ?',
          [coinsEarned, selection.user_id]
        );

        // Registrar transacción
        await connection.execute(
          'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
          [selection.user_id, coinsEarned, 'FANTASY_RUSH', `Puntos Fantasy Rush semana ${currentWeekStart}: ${totalPoints} pts`]
        );
      }
    });

    return true;
  } catch (error) {
    console.error('Error processing weekly fantasy points:', error);
    return false;
  }
}

// Obtener ranking de Fantasy Rush para una semana
export async function getFantasyLeaderboard(
  weekStart?: string,
  limit: number = 20
): Promise<{
  user_id: number;
  username: string;
  total_points: number;
  coins_earned: number;
  rank: number;
}[]> {
  try {
    const currentWeekStart = weekStart || getWeekStart();

    const results = await executeQuery<any>(
      `SELECT 
        fr.user_id,
        u.username,
        fr.total_points,
        fr.coins_earned,
        RANK() OVER (ORDER BY fr.total_points DESC) as rank
       FROM fantasy_rush fr
       JOIN users u ON fr.user_id = u.id
       WHERE fr.week_start = ? AND fr.total_points > 0
       ORDER BY fr.total_points DESC
       LIMIT ?`,
      [currentWeekStart, limit]
    );

    return results;
  } catch (error) {
    console.error('Error getting fantasy leaderboard:', error);
    return [];
  }
}

// Obtener historial de Fantasy Rush del usuario
export async function getUserFantasyHistory(
  userId: number,
  limit: number = 10
): Promise<{
  week_start: string;
  total_points: number;
  coins_earned: number;
  rank: number;
}[]> {
  try {
    const results = await executeQuery<any>(
      `SELECT 
        fr.week_start,
        fr.total_points,
        fr.coins_earned,
        (
          SELECT COUNT(*) + 1
          FROM fantasy_rush fr2 
          WHERE fr2.week_start = fr.week_start 
          AND fr2.total_points > fr.total_points
        ) as rank
       FROM fantasy_rush fr
       WHERE fr.user_id = ? AND fr.total_points > 0
       ORDER BY fr.week_start DESC
       LIMIT ?`,
      [userId, limit]
    );

    return results;
  } catch (error) {
    console.error('Error getting user fantasy history:', error);
    return [];
  }
}

// Obtener estadísticas de Fantasy Rush del usuario
export async function getUserFantasyStats(userId: number): Promise<{
  totalWeeksParticipated: number;
  totalPointsScored: number;
  totalCoinsEarned: number;
  averagePoints: number;
  bestWeekPoints: number;
  bestWeekRank: number;
}> {
  try {
    const stats = await executeQuerySingle<any>(
      `SELECT 
        COUNT(*) as total_weeks_participated,
        SUM(total_points) as total_points_scored,
        SUM(coins_earned) as total_coins_earned,
        AVG(total_points) as average_points,
        MAX(total_points) as best_week_points
       FROM fantasy_rush 
       WHERE user_id = ? AND total_points > 0`,
      [userId]
    );

    // Obtener el mejor ranking (necesita una consulta separada)
    const bestRank = await executeQuerySingle<any>(
      `SELECT MIN(
        (SELECT COUNT(*) + 1
         FROM fantasy_rush fr2 
         WHERE fr2.week_start = fr.week_start 
         AND fr2.total_points > fr.total_points)
       ) as best_rank
       FROM fantasy_rush fr
       WHERE fr.user_id = ? AND fr.total_points > 0`,
      [userId]
    );

    return {
      totalWeeksParticipated: stats?.total_weeks_participated || 0,
      totalPointsScored: stats?.total_points_scored || 0,
      totalCoinsEarned: stats?.total_coins_earned || 0,
      averagePoints: Math.round(stats?.average_points || 0),
      bestWeekPoints: stats?.best_week_points || 0,
      bestWeekRank: bestRank?.best_rank || 0
    };
  } catch (error) {
    console.error('Error getting user fantasy stats:', error);
    return {
      totalWeeksParticipated: 0,
      totalPointsScored: 0,
      totalCoinsEarned: 0,
      averagePoints: 0,
      bestWeekPoints: 0,
      bestWeekRank: 0
    };
  }
}