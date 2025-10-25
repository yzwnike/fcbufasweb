-- Habilitar Realtime para la tabla user_cards
-- Esto permite recibir notificaciones cuando se insertan nuevas cartas

-- Paso 1: Agregar la tabla a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_cards;

-- Paso 2: Habilitar Row Level Security (si no está habilitado)
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;

-- Paso 3: Crear política para permitir SELECT público (para notificaciones)
-- Esto es seguro porque solo expone que alguien obtuvo una carta, no datos sensibles
DROP POLICY IF EXISTS "Enable realtime for all users" ON user_cards;

CREATE POLICY "Enable realtime for all users" ON user_cards
  FOR SELECT
  USING (true);

-- Opcional: Si quieres restringir a usuarios autenticados solamente
-- CREATE POLICY "Enable realtime for authenticated users" ON user_cards
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- Verificar que está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_cards';

-- Ver las publicaciones activas
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
