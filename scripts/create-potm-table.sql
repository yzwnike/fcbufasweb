-- Tabla de votaciones POTM (Player Of The Month)
CREATE TABLE IF NOT EXISTS potm_votes (
  id BIGSERIAL PRIMARY KEY,
  user_ip VARCHAR(100) NOT NULL,
  first_place VARCHAR(50) NOT NULL,
  second_place VARCHAR(50) NOT NULL,
  third_place VARCHAR(50) NOT NULL,
  fourth_place VARCHAR(50) NOT NULL,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_potm_user_ip ON potm_votes(user_ip);
CREATE INDEX IF NOT EXISTS idx_potm_voted_at ON potm_votes(voted_at);
CREATE INDEX IF NOT EXISTS idx_potm_month_year ON potm_votes(DATE_TRUNC('month', voted_at));

-- Habilitar Row Level Security (RLS)
ALTER TABLE potm_votes ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura pública de resultados
CREATE POLICY "Permitir lectura pública de votos"
  ON potm_votes
  FOR SELECT
  USING (true);

-- Política para permitir inserción (solo desde el servidor con service_role)
CREATE POLICY "Permitir inserción de votos"
  ON potm_votes
  FOR INSERT
  WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE potm_votes IS 'Votaciones del Player Of The Month';
COMMENT ON COLUMN potm_votes.user_ip IS 'IP del usuario que vota (identificador temporal)';
COMMENT ON COLUMN potm_votes.first_place IS 'Jugador en 1er lugar (4 puntos)';
COMMENT ON COLUMN potm_votes.second_place IS 'Jugador en 2do lugar (3 puntos)';
COMMENT ON COLUMN potm_votes.third_place IS 'Jugador en 3er lugar (2 puntos)';
COMMENT ON COLUMN potm_votes.fourth_place IS 'Jugador en 4to lugar (1 punto)';
COMMENT ON COLUMN potm_votes.voted_at IS 'Fecha y hora del voto';

-- Vista para obtener resultados del mes actual
CREATE OR REPLACE VIEW potm_current_month_results AS
SELECT 
  first_place,
  second_place,
  third_place,
  fourth_place,
  voted_at
FROM potm_votes
WHERE DATE_TRUNC('month', voted_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP);

COMMENT ON VIEW potm_current_month_results IS 'Resultados de votación del mes actual';
