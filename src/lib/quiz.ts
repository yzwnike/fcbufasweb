import type { DailyQuizQuestion, DailyQuizAnswer, Player } from './mysql';
import { executeQuery, executeQuerySingle, executeTransaction } from './mysql';
import { getAllPlayers } from './cards';
import { ECONOMY_CONFIG, calculateQuizPayout } from './economy';

// Configuración del quiz (ahora desde economy.ts)
export const QUIZ_CONFIG = ECONOMY_CONFIG.QUIZ;

// Fecha efectiva del quiz (reseteo diario a las 20:00 hora del servidor)
export function currentQuizDate(): string {
  const now = new Date();
  const d = new Date(now);
  if (now.getHours() < 20) d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// Estadísticas disponibles para preguntas
export const AVAILABLE_STATS = [
  'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'fifa_rating'
] as const;

export type StatName = typeof AVAILABLE_STATS[number];

// Interfaz para pregunta con opciones
export interface QuizQuestionWithOptions {
  id: number;
  date: string;
  question_number: number;
  player: Player;
  stat_name: StatName;
  correct_answer: number;
  options: {
    a: number;
    b: number;
    c: number;
  };
  created_at: string;
}

// Interfaz para respuesta del usuario
export interface QuizAnswer {
  questionId: number;
  selectedAnswer: number;
}

// Generar opciones incorrectas para una pregunta
function generateIncorrectOptions(correctAnswer: number, statName: StatName): [number, number] {
  const baseRange = statName === 'fifa_rating' ? 20 : 15;
  const minStat = statName === 'fifa_rating' ? 30 : 10;
  const maxStat = statName === 'fifa_rating' ? 95 : 99;
  
  const options = new Set<number>();
  
  // Generar opciones cercanas al valor correcto
  while (options.size < 2) {
    const variation = Math.floor(Math.random() * baseRange * 2) - baseRange;
    const option = Math.max(minStat, Math.min(maxStat, correctAnswer + variation));
    
    if (option !== correctAnswer && !options.has(option)) {
      options.add(option);
    }
  }
  
  return Array.from(options) as [number, number];
}

// Generar preguntas diarias
export async function generateDailyQuestions(date: string = currentQuizDate()): Promise<boolean> {
  try {
    // Verificar si ya existen preguntas para esta fecha
    const existingQuestions = await executeQuery<DailyQuizQuestion>(
      'SELECT COUNT(*) as count FROM daily_quiz_questions WHERE date = ?',
      [date]
    );

    if (existingQuestions[0] && (existingQuestions[0] as any).count >= QUIZ_CONFIG.QUESTIONS_PER_DAY) {
      return true; // Ya existen preguntas para hoy
    }

    // Obtener todos los jugadores
    const players = await getAllPlayers();
    
    if (players.length === 0) {
      throw new Error('No hay jugadores disponibles');
    }

    await executeTransaction(async (connection) => {
      // Limpiar preguntas existentes para esta fecha (por si hay menos de 5)
      await connection.execute(
        'DELETE FROM daily_quiz_questions WHERE date = ?',
        [date]
      );

      for (let i = 1; i <= QUIZ_CONFIG.QUESTIONS_PER_DAY; i++) {
        // Seleccionar jugador aleatorio
        const randomPlayer = players[Math.floor(Math.random() * players.length)];
        
        // Seleccionar stat aleatorio
        const statName = AVAILABLE_STATS[Math.floor(Math.random() * AVAILABLE_STATS.length)];
        
        // Obtener el valor correcto
        const correctAnswer = randomPlayer[statName];
        
        // Generar opciones incorrectas
        const [incorrectOption1, incorrectOption2] = generateIncorrectOptions(correctAnswer, statName);
        
        // Mezclar las opciones aleatoriamente
        const allOptions = [correctAnswer, incorrectOption1, incorrectOption2];
        const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
        
        // Insertar la pregunta
        await connection.execute(
          `INSERT INTO daily_quiz_questions 
           (date, question_number, player_id, stat_name, correct_answer, option_a, option_b, option_c) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            date,
            i,
            randomPlayer.id,
            statName,
            correctAnswer,
            shuffledOptions[0],
            shuffledOptions[1],
            shuffledOptions[2]
          ]
        );
      }
    });

    return true;
  } catch (error) {
    console.error('Error generating daily questions:', error);
    return false;
  }
}

// Obtener preguntas del día para un usuario
export async function getDailyQuestions(
  userId: number,
  date: string = currentQuizDate()
): Promise<QuizQuestionWithOptions[]> {
  try {
    // Generar preguntas si no existen
    await generateDailyQuestions(date);

    // Obtener preguntas con información del jugador
    const rows = await executeQuery<any>(
      `SELECT 
         q.id AS question_id,
         q.date,
         q.question_number,
         q.stat_name,
         q.correct_answer,
         q.option_a,
         q.option_b,
         q.option_c,
         q.created_at AS question_created_at,
         p.id AS player_id,
         p.name,
         p.position1,
         p.position2,
         p.pace,
         p.shooting,
         p.passing,
         p.defending,
         p.physical,
         p.fifa_rating,
         p.image_url
       FROM daily_quiz_questions q
       JOIN players p ON q.player_id = p.id
       WHERE q.date = ?
       ORDER BY q.question_number`,
      [date]
    );

    return rows.map(r => ({
      id: r.question_id,
      date: r.date,
      question_number: r.question_number,
      player: {
        id: r.player_id,
        name: r.name,
        position1: r.position1,
        position2: r.position2,
        fifa_rating: r.fifa_rating
      },
      // Proveer imagen para el front (usa image_url del jugador)
      image_path: r.image_url,
      stat_name: r.stat_name,
      correct_answer: r.correct_answer,
      options: {
        a: r.option_a,
        b: r.option_b,
        c: r.option_c
      },
      created_at: r.question_created_at
    }));
  } catch (error) {
    console.error('Error getting daily questions:', error);
    return [];
  }
}

// Obtener progreso del quiz diario del usuario
export async function getUserQuizProgress(
  userId: number,
  date: string = currentQuizDate()
): Promise<{
  questionsAnswered: number;
  correctAnswers: number;
  totalCoinsEarned: number;
  canPlayToday: boolean;
  answeredQuestions: number[];
}> {
  try {
    const progress = await executeQuerySingle<any>(
      `SELECT 
        COUNT(*) as questions_answered,
        SUM(CASE WHEN is_correct = true THEN 1 ELSE 0 END) as correct_answers,
        COUNT(DISTINCT CAST(answered_at AS DATE)) as days_played
       FROM daily_quiz_answers dqa
       JOIN daily_quiz_questions dqq ON dqa.question_id = dqq.id
       WHERE dqa.user_id = ? AND dqq.date = ?`,
      [userId, date]
    );
    const answeredQuestionIds = await executeQuery<any>(
      `SELECT dqq.question_number FROM daily_quiz_answers dqa
       JOIN daily_quiz_questions dqq ON dqa.question_id = dqq.id
       WHERE dqa.user_id = ? AND dqq.date = ?`,
      [userId, date]
    );

    const questionsAnswered = progress?.questions_answered || 0;
    const canPlayToday = questionsAnswered < QUIZ_CONFIG.QUESTIONS_PER_DAY;

    const correctAnswers = progress?.correct_answers || 0;
    return {
      questionsAnswered,
      correctAnswers,
      totalCoinsEarned: correctAnswers * QUIZ_CONFIG.COINS_PER_CORRECT_ANSWER,
      canPlayToday,
      answeredQuestions: answeredQuestionIds.map(q => q.question_number)
    };
  } catch (error) {
    console.error('Error getting quiz progress:', error);
    return {
      questionsAnswered: 0,
      correctAnswers: 0,
      totalCoinsEarned: 0,
      canPlayToday: false,
      answeredQuestions: []
    };
  }
}

// Responder pregunta del quiz
export async function answerQuizQuestion(
  userId: number,
  questionId: number,
  selectedAnswer: number
): Promise<{
  success: boolean;
  isCorrect: boolean;
  correctAnswer: number;
  coinsEarned: number;
  error?: string;
}> {
  try {
    // Verificar que la pregunta existe y obtener la respuesta correcta
    const question = await executeQuerySingle<DailyQuizQuestion>(
      'SELECT * FROM daily_quiz_questions WHERE id = ?',
      [questionId]
    );

    if (!question) {
      return {
        success: false,
        isCorrect: false,
        correctAnswer: 0,
        coinsEarned: 0,
        error: 'Pregunta no encontrada'
      };
    }

    // Verificar si el usuario ya respondió esta pregunta
    const existingAnswer = await executeQuerySingle<DailyQuizAnswer>(
      'SELECT id FROM daily_quiz_answers WHERE user_id = ? AND question_id = ?',
      [userId, questionId]
    );

    if (existingAnswer) {
      return {
        success: false,
        isCorrect: false,
        correctAnswer: question.correct_answer,
        coinsEarned: 0,
        error: 'Ya has respondido esta pregunta'
      };
    }

    const isCorrect = selectedAnswer === question.correct_answer;
    
    // Solo damos monedas por respuesta correcta durante el juego
    // El payout final se calcula al completar todas las preguntas
    const coinsEarned = isCorrect ? QUIZ_CONFIG.COINS_PER_CORRECT_ANSWER : 0;

    // Guardar respuesta y actualizar monedas en una transacción
    await executeTransaction(async (connection) => {
      // Insertar respuesta
      await connection.execute(
        'INSERT INTO daily_quiz_answers (user_id, question_id, selected_answer, is_correct, coins_earned) VALUES (?, ?, ?, ?, ?)',
        [userId, questionId, selectedAnswer, isCorrect, coinsEarned]
      );

      if (coinsEarned > 0) {
        // Actualizar monedas del usuario
        await connection.execute(
          'UPDATE users SET coins = coins + ? WHERE id = ?',
          [coinsEarned, userId]
        );

        // Registrar transacción de monedas
        await connection.execute(
          'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
          [userId, coinsEarned, 'DAILY_QUIZ', `Respuesta correcta en quiz diario - Pregunta ${question.question_number}`]
        );
      }

      // Actualizar última fecha de quiz
      const today = new Date().toISOString().split('T')[0];
      if (question.date === today) {
        await connection.execute(
          'UPDATE users SET last_daily_quiz = ? WHERE id = ?',
          [today, userId]
        );
      }
    });

    return {
      success: true,
      isCorrect,
      correctAnswer: question.correct_answer,
      coinsEarned
    };
  } catch (error) {
    console.error('Error answering quiz question:', error);
    return {
      success: false,
      isCorrect: false,
      correctAnswer: 0,
      coinsEarned: 0,
      error: 'Error interno del servidor'
    };
  }
}

// Obtener estadísticas históricas del quiz del usuario
export async function getUserQuizStats(userId: number): Promise<{
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  accuracy: number;
  totalCoinsEarned: number;
  currentStreak: number;
  longestStreak: number;
  daysPlayed: number;
}> {
  try {
    const stats = await executeQuerySingle<any>(
      `SELECT 
        COUNT(*) as total_questions_answered,
        SUM(CASE WHEN is_correct = true THEN 1 ELSE 0 END) as total_correct_answers,
        SUM(coins_earned) as total_coins_earned,
        COUNT(DISTINCT CAST(answered_at AS DATE)) as days_played
       FROM daily_quiz_answers
       WHERE user_id = ?`,
      [userId]
    );

    const user = await executeQuerySingle<any>(
      'SELECT daily_quiz_streak FROM users WHERE id = ?',
      [userId]
    );

    const totalQuestionsAnswered = stats?.total_questions_answered || 0;
    const totalCorrectAnswers = stats?.total_correct_answers || 0;
    const accuracy = totalQuestionsAnswered > 0 ? 
      Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100) : 0;

    return {
      totalQuestionsAnswered,
      totalCorrectAnswers,
      accuracy,
      totalCoinsEarned: stats?.total_coins_earned || 0,
      currentStreak: user?.daily_quiz_streak || 0,
      longestStreak: user?.daily_quiz_streak || 0, // Por simplicidad, usamos el streak actual
      daysPlayed: stats?.days_played || 0
    };
  } catch (error) {
    console.error('Error getting quiz stats:', error);
    return {
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      accuracy: 0,
      totalCoinsEarned: 0,
      currentStreak: 0,
      longestStreak: 0,
      daysPlayed: 0
    };
  }
}

// Función para calcular el payout final del día (con bonificaciones)
export async function calculateDailyQuizPayout(
  userId: number,
  date: string = new Date().toISOString().split('T')[0]
): Promise<{
  totalPayout: number;
  correctAnswers: number;
  perfectBonus: number;
  streakBonus: number;
  hadPerfectYesterday: boolean;
}> {
  try {
    const progress = await getUserQuizProgress(userId, date);
    const correctAnswers = progress.correctAnswers;
    
    // Verificar si ayer también completó 5/5
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const yesterdayProgress = await getUserQuizProgress(userId, yesterdayStr);
    const hadPerfectYesterday = yesterdayProgress.correctAnswers === QUIZ_CONFIG.QUESTIONS_PER_DAY;
    
    // Calcular bonificaciones
    const perfectBonus = correctAnswers === QUIZ_CONFIG.QUESTIONS_PER_DAY ? QUIZ_CONFIG.PERFECT_BONUS : 0;
    const streakBonus = hadPerfectYesterday && correctAnswers === QUIZ_CONFIG.QUESTIONS_PER_DAY ? QUIZ_CONFIG.STREAK_BONUS : 0;
    
    const totalPayout = calculateQuizPayout(correctAnswers, hadPerfectYesterday);
    
    return {
      totalPayout,
      correctAnswers,
      perfectBonus,
      streakBonus,
      hadPerfectYesterday
    };
  } catch (error) {
    console.error('Error calculating daily quiz payout:', error);
    return {
      totalPayout: 0,
      correctAnswers: 0,
      perfectBonus: 0,
      streakBonus: 0,
      hadPerfectYesterday: false
    };
  }
}

// Procesar payout final del día (llamar al final del día)
export async function processDailyQuizPayout(
  userId: number,
  date: string = new Date().toISOString().split('T')[0]
): Promise<boolean> {
  try {
    const payoutData = await calculateDailyQuizPayout(userId, date);
    
    // Solo procesar si hay respuestas correctas y no se ha procesado ya
    if (payoutData.correctAnswers === 0) {
      return true; // No hay nada que procesar
    }
    
    // Verificar si ya se procesaron las bonificaciones para este día
    const existingBonus = await executeQuerySingle<any>(
      'SELECT id FROM coin_transactions WHERE user_id = ? AND type = "DAILY_QUIZ_BONUS" AND description LIKE ? LIMIT 1',
      [userId, `%${date}%`]
    );
    
    if (existingBonus) {
      return true; // Ya se procesó
    }
    
    // Calcular bonificaciones adicionales (perfect y streak)
    const bonusCoins = payoutData.perfectBonus + payoutData.streakBonus;
    
    if (bonusCoins > 0) {
      await executeTransaction(async (connection) => {
        // Dar monedas de bonificación
        await connection.execute(
          'UPDATE users SET coins = coins + ? WHERE id = ?',
          [bonusCoins, userId]
        );
        
        // Registrar transacción
        let description = `Bonificación quiz diario ${date}`;
        if (payoutData.perfectBonus > 0) description += ` - Perfecto +${payoutData.perfectBonus}`;
        if (payoutData.streakBonus > 0) description += ` - Streak +${payoutData.streakBonus}`;
        
        await connection.execute(
          'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
          [userId, bonusCoins, 'DAILY_QUIZ_BONUS', description]
        );
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error processing daily quiz payout:', error);
    return false;
  }
}

// Obtener nombre traducido de la estadística
export function getStatDisplayName(statName: StatName): string {
  const translations = {
    pace: 'Ritmo',
    shooting: 'Tiro',
    passing: 'Pase',
    dribbling: 'Regate',
    defending: 'Defensa',
    physical: 'Físico',
    fifa_rating: 'Rating FIFA'
  };

  return translations[statName] || statName;
}
