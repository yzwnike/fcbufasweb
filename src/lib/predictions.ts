import { turso } from '@/lib/database'
import { FIGHTERS } from '@/consts/fighters'
import { COMBATS } from '@/consts/combats'

// Caché en memoria con timestamp de 30 segundos
interface CacheEntry<T> {
  data: T
  timestamp: number
}

interface MemoryCache {
  predictionsByCombat: Record<string, CacheEntry<PredictionResponse>>
  allPredictions: CacheEntry<CombatPrediction[]> | null
}

const CACHE_DURATION = 30 * 1000 // 30 segundos en milisegundos
let memoryCache: MemoryCache = {
  predictionsByCombat: {},
  allPredictions: null,
}

// Función auxiliar para verificar si la caché ha expirado
const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_DURATION
}

// Función auxiliar para limpiar caché expirada
const cleanExpiredCache = () => {
  const now = Date.now()

  // Limpiar caché de predicciones por combate
  Object.keys(memoryCache.predictionsByCombat).forEach((key) => {
    if (!isCacheValid(memoryCache.predictionsByCombat[key].timestamp)) {
      delete memoryCache.predictionsByCombat[key]
    }
  })

  // Limpiar caché de todas las predicciones
  if (memoryCache.allPredictions && !isCacheValid(memoryCache.allPredictions.timestamp)) {
    memoryCache.allPredictions = null
  }
}

// Función auxiliar para invalidar caché después de un voto
const invalidateCache = (combatId?: string) => {
  if (combatId) {
    // Invalidar caché específica del combate
    delete memoryCache.predictionsByCombat[combatId]
  } else {
    // Invalidar toda la caché
    memoryCache.predictionsByCombat = {}
    memoryCache.allPredictions = null
  }
}

export interface Prediction {
  id: string
  combat_id: string
  fighter_id: string
  votes: number
  created_at: string
  updated_at: string
}

export interface CombatPrediction {
  combat_id: string
  predictions: Array<{
    fighter_id: string
    votes: number
    percentage: number
  }>
  total_votes: number
}

export interface PredictionVote {
  combat_id: string
  fighter_id: string
  votes: number
}

export interface PredictionResponse {
  combat_id: string
  predictions: Array<{
    fighter_id: string
    votes: number
    percentage: number
  }>
  total_votes: number
}

/**
 * Obtiene las predicciones para un combate específico
 */
export async function getPredictionsByCombat(combatId: string): Promise<PredictionResponse | null> {
  // Ignorar la base de datos y devolver datos vacíos
  return {
    combat_id: combatId,
    predictions: [],
    total_votes: 0,
  }
}

/**
 * Obtiene todas las predicciones agrupadas por combate
 */
export async function getAllPredictions(): Promise<CombatPrediction[]> {
  // Ignorar la base de datos y devolver array vacío
  return []
}

/**
 * Registra o actualiza un voto para un combate y luchador específicos
 */
export async function registerVote(
  combatId: string,
  fighterId: string,
  userId: string,
): Promise<PredictionVote> {
  // Ignorar la base de datos y devolver voto vacío
  return {
    combat_id: combatId,
    fighter_id: fighterId,
    votes: 0,
  }
}

/**
 * Obtiene las estadísticas de predicciones para un combate específico
 */
export async function getCombatStats(combatId: string): Promise<CombatPrediction | null> {
  // Ignorar la base de datos y devolver null
  return null
}

/**
 * Obtiene los votos de un usuario específico
 */
export async function getUserVotes(userId: string): Promise<
  Array<{
    combat_id: string
    fighter_id: string
    created_at: string
  }>
> {
  // Ignorar la base de datos y devolver array vacío
  return []
}
