-- Tabla para trackear compensaciones entregadas
CREATE TABLE IF NOT EXISTS bug_compensations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    compensation_type VARCHAR(50) NOT NULL,
    claimed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, compensation_type)
);

CREATE INDEX IF NOT EXISTS idx_bug_compensations_user 
ON bug_compensations(user_id, compensation_type);

-- Comentario
COMMENT ON TABLE bug_compensations IS 'Trackea compensaciones únicas entregadas a usuarios por bugs';
