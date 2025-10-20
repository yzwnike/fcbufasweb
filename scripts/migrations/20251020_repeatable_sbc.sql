-- Add repeatable SBC functionality
USE bufas_cards;

-- Add repeatable column to sbc_challenges table
ALTER TABLE sbc_challenges 
ADD COLUMN repeatable BOOLEAN NOT NULL DEFAULT FALSE AFTER requirements;

-- Update pack_type enum to include new pack types
ALTER TABLE sbc_rewards 
MODIFY pack_type ENUM('FREE_DAILY','PREMIUM','SPECIAL','MEDIA_81_85','MEDIA_83_87','MEDIA_84_88','MEDIA_86_89','BASE_85_89','SPECIAL_85','SPECIAL_85_PLUS','OG_81_87','ESPECIAL','EVENTO','EVENTO_90_PLUS','ELITE','ELITE_RANDOM','MEDIA_84_PLUS') NULL;

-- Create repeatable SBC challenge: MEJORA 84+
INSERT INTO sbc_challenges (code, title, description, start_at, end_at, requirements, repeatable)
VALUES (
  'MEJORA_84_PLUS',
  'MEJORA 84+',
  'Entrega 3 cartas con media >= 81 para recibir un sobre con cartas de media 84 o superior. Este desafío se puede repetir las veces que quieras.',
  NOW(), 
  DATE_ADD(NOW(), INTERVAL 1 YEAR), -- Disponible por 1 año
  JSON_OBJECT('min_players', 3, 'max_players', 3, 'min_avg_rating', 81, 'min_special_cards', 0),
  TRUE
);

-- Add reward for MEJORA 84+ SBC
INSERT INTO sbc_rewards (challenge_id, reward_type, pack_type, amount)
SELECT id, 'PACK', 'MEDIA_84_PLUS', 1 
FROM sbc_challenges 
WHERE code = 'MEJORA_84_PLUS';