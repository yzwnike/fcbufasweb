-- Tabla para las cartas destacadas de cada usuario (máximo 3)
CREATE TABLE IF NOT EXISTS user_featured_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_card_id INTEGER NOT NULL REFERENCES user_cards(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position >= 1 AND position <= 3),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, position),
    UNIQUE(user_card_id)
);

CREATE INDEX IF NOT EXISTS idx_featured_cards_user ON user_featured_cards(user_id);

COMMENT ON TABLE user_featured_cards IS 'Cartas destacadas que los usuarios muestran en su perfil y ranking (máximo 3)';
