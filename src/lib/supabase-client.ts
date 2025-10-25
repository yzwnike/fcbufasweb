import { createClient } from '@supabase/supabase-js';

// Variables de entorno para el cliente (públicas)
const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente de Supabase para el navegador
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tipos para los eventos de realtime
export interface CardObtainedEvent {
  user_id: number;
  username: string;
  card_id: number;
  player_name: string;
  image_path: string;
  rarity: string;
  special_type: string;
  obtained_at: string;
}
