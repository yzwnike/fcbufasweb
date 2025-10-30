-- Migration: add TOTW6 special cards for Nico Uriburu and Javo Ayesta
-- Date: 2025-10-30

USE bufas_cards;

-- nicouTOTW6 (TEAM OF THE WEEK 6) - fifa 91
INSERT INTO cards (player_id, rarity, special_type, special_month, base_price, image_path, fifa_rating_override)
SELECT p.id, 'Gold', 'TEAM_OF_THE_WEEK', NULL, 1200, '/images/cards/nicouTOTW6.png', 91
FROM players p
WHERE p.card_asset_basename = 'nicou'
  AND NOT EXISTS (
    SELECT 1 FROM cards c
    WHERE c.player_id = p.id
      AND c.special_type = 'TEAM_OF_THE_WEEK'
      AND COALESCE(c.fifa_rating_override, 0) = 91
  )
LIMIT 1;

-- javoTOTW6 (TEAM OF THE WEEK 6) - fifa 88
INSERT INTO cards (player_id, rarity, special_type, special_month, base_price, image_path, fifa_rating_override)
SELECT p.id, 'Gold', 'TEAM_OF_THE_WEEK', NULL, 1200, '/images/cards/javoTOTW6.png', 88
FROM players p
WHERE p.card_asset_basename = 'javo'
  AND NOT EXISTS (
    SELECT 1 FROM cards c
    WHERE c.player_id = p.id
      AND c.special_type = 'TEAM_OF_THE_WEEK'
      AND COALESCE(c.fifa_rating_override, 0) = 88
  )
LIMIT 1;

-- Verify inserts
SELECT c.id, p.name, c.special_type, c.fifa_rating_override, c.image_path
FROM cards c
JOIN players p ON p.id = c.player_id
WHERE p.card_asset_basename IN ('nicou','javo')
  AND c.special_type = 'TEAM_OF_THE_WEEK'
ORDER BY p.name;