-- Add Jorge Comeback Hero SBC
USE bufas_cards;

-- Primero verificar que existe el jugador jorge con su carta CH
-- Si no existe, el script sync-cards-from-files.mjs lo creará automáticamente

-- Crear el SBC NO REPETIBLE para Jorge Comeback Hero
INSERT INTO sbc_challenges (code, title, description, start_at, end_at, requirements, repeatable)
VALUES (
  'JORGE_COMEBACK_HERO',
  'Jorge Comeback Hero',
  'Entrega 3 cartas: mínimo 1 carta de JorgeOG, mínimo 1 carta especial, y una media de plantilla de 88+. Recompensa: Jorge Comeback Hero (carta ELITE exclusiva).',
  NOW(), 
  DATE_ADD(NOW(), INTERVAL 1 YEAR), -- Disponible por 1 año
  JSON_OBJECT(
    'min_players', 3, 
    'max_players', 3, 
    'min_avg_rating', 88, 
    'min_special_cards', 1,
    'required_players', JSON_ARRAY(
      JSON_OBJECT('card_asset_basename', 'jorge', 'min_count', 1, 'special_type', 'OLD_GENERATION')
    )
  ),
  FALSE -- NO REPETIBLE
);

-- Añadir la recompensa: carta de Jorge Comeback Hero
-- Primero necesitamos obtener el ID de la carta jorgeCH
INSERT INTO sbc_rewards (challenge_id, reward_type, card_id, amount)
SELECT 
  sc.id, 
  'CARD', 
  c.id,
  1
FROM sbc_challenges sc
CROSS JOIN cards c
JOIN players p ON c.player_id = p.id
WHERE sc.code = 'JORGE_COMEBACK_HERO'
  AND p.card_asset_basename = 'jorge'
  AND c.special_type = 'COMEBACK_HERO'
LIMIT 1;
