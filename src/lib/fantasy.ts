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
  best_image_path: string | null; // mejor carta poseída para este jugador
  owned: boolean; // posee cualquier carta de este jugador
};

// Obtener SOLO los 10 jugadores base, marcando si el usuario posee cualquier carta de ese jugador
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

    // Traer datos base + si posee cualquier carta + imagen base
    const rows = await executeQuery<any>(
      `SELECT 
         p.id, p.name, p.position1, p.position2, p.fifa_rating, p.fantasy_points,
         (
           SELECT c.image_path FROM cards c 
           WHERE c.player_id = p.id AND c.special_type = 'Regular' 
           ORDER BY c.id ASC LIMIT 1
         ) AS image_path,
         (
           SELECT c.image_path FROM user_cards uc 
           JOIN cards c ON uc.card_id = c.id 
           WHERE uc.user_id = ? AND c.player_id = p.id 
           ORDER BY 
             CASE c.special_type 
               WHEN 'PLAYER_OF_THE_MONTH' THEN 6 
               WHEN 'TEAM_OF_THE_WEEK' THEN 5 
               WHEN 'COMEBACK_HERO' THEN 4 
               WHEN 'MARKET_MASTER' THEN 3 
               WHEN 'ASSIST_ENGINE' THEN 3 
               WHEN 'RATING_RELOAD' THEN 3 
               WHEN 'OLD_GENERATION' THEN 2 
               ELSE 1 
             END DESC,
             LEAST(99, COALESCE(c.fifa_rating_override, p.fifa_rating + CASE c.special_type
               WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
               WHEN 'PLAYER_OF_THE_MONTH' THEN 4
               WHEN 'RATING_RELOAD' THEN 2
               WHEN 'ASSIST_ENGINE' THEN 2
               WHEN 'MARKET_MASTER' THEN 2
               WHEN 'COMEBACK_HERO' THEN 3
               ELSE 0 END)) DESC
           LIMIT 1
         ) AS best_image_path,
         EXISTS(
           SELECT 1 FROM user_cards uc 
           JOIN cards c2 ON uc.card_id = c2.id 
           WHERE uc.user_id = ? AND c2.player_id = p.id
         ) AS owned
       FROM players p
       WHERE p.name IN (${baseNames.map(()=>'?').join(',')})
       ORDER BY p.name ASC`,
      [userId, userId, ...baseNames]
    );

    const mapped: EligiblePlayer[] = rows.map(r => ({
      id: r.id,
      name: r.name,
      position1: r.name === 'Nico Vehi' ? 'GK' : r.name === 'Marc Sanchez' ? 'CB' : r.name === 'Pablo Vehi' ? (r.position1 === 'RB' ? 'RB' : r.position1) : r.position1,
      position2: r.name === 'Nico Vehi' ? null : r.name === 'Marc Sanchez' ? null : r.name === 'Pablo Vehi' ? 'CM' : r.position2,
      fifa_rating: r.fifa_rating,
      fantasy_points: r.fantasy_points,
      image_path: r.image_path || null,
      best_image_path: r.best_image_path || null,
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
  weekStart?: string,
  jornada?: number
): Promise<{
  success: boolean;
  fantasyRushId?: number;
  error?: string;
}> {
  try {
    // Bloqueo de plantillas si admin lo ha cerrado
    try {
      const lock = await executeQuerySingle<any>('SELECT locked FROM fantasy_admin_flags WHERE id=1');
      if (lock && lock.locked) {
        return { success: false, error: 'Plantillas cerradas por el administrador hasta la próxima jornada' };
      }
    } catch {}
    const currentWeekStart = weekStart || getWeekStart();

    // Si no se especifica jornada, mantener la validación semanal heredada (permitiendo múltiples jornadas en misma semana)
    if (!(typeof jornada === 'number' && !Number.isNaN(jornada))) {
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

    // Verificar que el usuario posee CUALQUIER carta de cada jugador seleccionado
    const ownsAnyCard = async (pid: number) => {
      const row = await executeQuerySingle<any>(
        `SELECT 1 FROM user_cards uc JOIN cards c ON uc.card_id = c.id 
         WHERE uc.user_id = ? AND c.player_id = ? LIMIT 1`,
        [userId, pid]
      );
      return !!row;
    };

    const [okF, okM, okD] = await Promise.all([
      ownsAnyCard(selection.forwardPlayerId),
      ownsAnyCard(selection.midfielderPlayerId),
      ownsAnyCard(selection.defenderPlayerId)
    ]);

    if (!okF || !okM || !okD) {
      return {
        success: false,
        error: 'Necesitas tener una carta de cada jugador seleccionado'
      };
    }

    // Regla de descanso: no repetir jugadores de la jornada anterior
    if (typeof jornada === 'number' && Number.isFinite(jornada)) {
      const prevJ = jornada - 1;
      if (prevJ >= 0) {
        const prev = await executeQuerySingle<any>(
          'SELECT forward_player_id, midfielder_player_id, defender_player_id FROM fantasy_rush WHERE user_id = ? AND jornada = ? LIMIT 1',
          [userId, prevJ]
        );
        if (prev) {
          const prevIds = new Set([prev.forward_player_id, prev.midfielder_player_id, prev.defender_player_id].filter(Boolean));
          const conflicts = [selection.forwardPlayerId, selection.midfielderPlayerId, selection.defenderPlayerId].filter(id => prevIds.has(id));
          if (conflicts.length) {
            return { success: false, error: 'Descanso obligatorio: uno o más jugadores jugaron la jornada anterior' };
          }
        }
      }
    }

    // Crear la selección de forma idempotente por (user_id, jornada)
    // Usamos UPSERT para evitar condiciones de carrera (doble POST)
    const newId = await executeTransaction<number>(async (conn) => {
      // Insertar o actualizar por semana (week_start) y devolver id
      const [rows] = await conn.execute(
        `INSERT INTO fantasy_rush (user_id, week_start, jornada, forward_player_id, midfielder_player_id, defender_player_id, total_points, coins_earned)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0)
         ON CONFLICT (user_id, week_start) DO UPDATE SET 
           forward_player_id = EXCLUDED.forward_player_id,
           midfielder_player_id = EXCLUDED.midfielder_player_id,
           defender_player_id = EXCLUDED.defender_player_id
         RETURNING id`,
        [
          userId,
          currentWeekStart,
          (typeof jornada === 'number' && !Number.isNaN(jornada)) ? jornada : null,
          selection.forwardPlayerId,
          selection.midfielderPlayerId,
          selection.defenderPlayerId
        ]
      );
      const id = Array.isArray(rows) ? (rows[0] as any)?.id : (rows as any)?.id;
      return Number(id);
    });

    return {
      success: true,
      fantasyRushId: newId
    };
  } catch (error) {
    console.error('Error creating fantasy selection:', error);
    return {
      success: false,
      error: String((error as any)?.message || error)
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
    // Bloqueo de plantillas si admin lo ha cerrado
    try {
      const lock = await executeQuerySingle<any>('SELECT locked FROM fantasy_admin_flags WHERE id=1');
      if (lock && lock.locked) {
        return { success: false, error: 'Plantillas cerradas por el administrador hasta la próxima jornada' };
      }
    } catch {}
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

    const ownsAnyCard = async (pid: number) => {
      const row = await executeQuerySingle<any>(
        `SELECT 1 FROM user_cards uc JOIN cards c ON uc.card_id = c.id 
         WHERE uc.user_id = ? AND c.player_id = ? LIMIT 1`,
        [userId, pid]
      );
      return !!row;
    };

    const [okF, okM, okD] = await Promise.all([
      ownsAnyCard(selection.forwardPlayerId),
      ownsAnyCard(selection.midfielderPlayerId),
      ownsAnyCard(selection.defenderPlayerId)
    ]);

    if (!okF || !okM || !okD) {
      return {
        success: false,
        error: 'Necesitas tener una carta de cada jugador seleccionado'
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
      error: String((error as any)?.message || error)
    };
  }
}

// Obtener selección de Fantasy Rush del usuario para una semana
export async function getUserFantasySelection(
  userId: number,
  _weekStart?: string,
  _preferMostRecent: boolean = true
): Promise<FantasyRushWithPlayers | null> {
  try {
    // Fallback genérico: última selección del usuario (sin week_start)
    const result = await executeQuerySingle<any>(
      `SELECT 
        fr.*,
        p1.* as forward_player,
        p2.* as midfielder_player,
        p3.* as defender_player,
        (
          SELECT c.image_path FROM user_cards uc 
          JOIN cards c ON uc.card_id = c.id 
          WHERE uc.user_id = ? AND c.player_id = p1.id 
          ORDER BY 
            CASE c.special_type 
              WHEN 'PLAYER_OF_THE_MONTH' THEN 6 
              WHEN 'TEAM_OF_THE_WEEK' THEN 5 
              WHEN 'COMEBACK_HERO' THEN 4 
              WHEN 'MARKET_MASTER' THEN 3 
              WHEN 'ASSIST_ENGINE' THEN 3 
              WHEN 'RATING_RELOAD' THEN 3 
              WHEN 'OLD_GENERATION' THEN 2 
              ELSE 1 
            END DESC,
            LEAST(99, COALESCE(c.fifa_rating_override, p1.fifa_rating + CASE c.special_type
              WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
              WHEN 'PLAYER_OF_THE_MONTH' THEN 4
              WHEN 'RATING_RELOAD' THEN 2
              WHEN 'ASSIST_ENGINE' THEN 2
              WHEN 'MARKET_MASTER' THEN 2
              WHEN 'COMEBACK_HERO' THEN 3
              ELSE 0 END)) DESC
          LIMIT 1
        ) AS f_image_path,
        (
          SELECT c.image_path FROM user_cards uc 
          JOIN cards c ON uc.card_id = c.id 
          WHERE uc.user_id = ? AND c.player_id = p2.id 
          ORDER BY 
            CASE c.special_type 
              WHEN 'PLAYER_OF_THE_MONTH' THEN 6 
              WHEN 'TEAM_OF_THE_WEEK' THEN 5 
              WHEN 'COMEBACK_HERO' THEN 4 
              WHEN 'MARKET_MASTER' THEN 3 
              WHEN 'ASSIST_ENGINE' THEN 3 
              WHEN 'RATING_RELOAD' THEN 3 
              WHEN 'OLD_GENERATION' THEN 2 
              ELSE 1 
            END DESC,
            LEAST(99, COALESCE(c.fifa_rating_override, p2.fifa_rating + CASE c.special_type
              WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
              WHEN 'PLAYER_OF_THE_MONTH' THEN 4
              WHEN 'RATING_RELOAD' THEN 2
              WHEN 'ASSIST_ENGINE' THEN 2
              WHEN 'MARKET_MASTER' THEN 2
              WHEN 'COMEBACK_HERO' THEN 3
              ELSE 0 END)) DESC
          LIMIT 1
        ) AS m_image_path,
        (
          SELECT c.image_path FROM user_cards uc 
          JOIN cards c ON uc.card_id = c.id 
          WHERE uc.user_id = ? AND c.player_id = p3.id 
          ORDER BY 
            CASE c.special_type 
              WHEN 'PLAYER_OF_THE_MONTH' THEN 6 
              WHEN 'TEAM_OF_THE_WEEK' THEN 5 
              WHEN 'COMEBACK_HERO' THEN 4 
              WHEN 'MARKET_MASTER' THEN 3 
              WHEN 'ASSIST_ENGINE' THEN 3 
              WHEN 'RATING_RELOAD' THEN 3 
              WHEN 'OLD_GENERATION' THEN 2 
              ELSE 1 
            END DESC,
            LEAST(99, COALESCE(c.fifa_rating_override, p3.fifa_rating + CASE c.special_type
              WHEN 'TEAM_OF_THE_WEEK' THEN 2
         WHEN 'NOM_POTM' THEN 2
              WHEN 'PLAYER_OF_THE_MONTH' THEN 4
              WHEN 'RATING_RELOAD' THEN 2
              WHEN 'ASSIST_ENGINE' THEN 2
              WHEN 'MARKET_MASTER' THEN 2
              WHEN 'COMEBACK_HERO' THEN 3
              ELSE 0 END)) DESC
          LIMIT 1
        ) AS d_image_path
       FROM fantasy_rush fr
       JOIN players p1 ON fr.forward_player_id = p1.id
       JOIN players p2 ON fr.midfielder_player_id = p2.id
       JOIN players p3 ON fr.defender_player_id = p3.id
       WHERE fr.user_id = ?
       ORDER BY fr.id DESC
       LIMIT 1`,
      [userId, userId, userId, userId]
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
      forward_card_image_path: result.f_image_path || null,
      midfielder_card_image_path: result.m_image_path || null,
      defender_card_image_path: result.d_image_path || null,
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
        image_url: (result.f_image_path || result.forward_player.image_url),
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
        image_url: (result.m_image_path || result.midfielder_player.image_url),
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
        image_url: (result.d_image_path || result.defender_player.image_url),
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
