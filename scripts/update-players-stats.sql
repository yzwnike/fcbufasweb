-- Update specific players' ratings, positions and substats per latest data
USE bufas_cards;

-- Marcos (Delantero)
UPDATE players SET 
  position1='ST', position2=NULL,
  pace=86, shooting=87, passing=80, defending=32, physical=83,
  fifa_rating=87
WHERE card_asset_basename='marcos';

-- Albert (Centrocampista)
UPDATE players SET 
  position1='CM', position2=NULL,
  pace=83, shooting=77, passing=82, defending=79, physical=79,
  fifa_rating=82
WHERE card_asset_basename='albert';

-- Pablo Elvei (Defensa/Centrocampista)
UPDATE players SET 
  position1='RB', position2='CM',
  pace=80, shooting=76, passing=84, defending=82, physical=82,
  fifa_rating=85
WHERE card_asset_basename='elvei';

-- Fan (Centrocampista/Delantero)
UPDATE players SET 
  position1='CM', position2='ST',
  pace=84, shooting=82, passing=83, defending=87, physical=80,
  fifa_rating=86
WHERE card_asset_basename='fan';

-- Javo (Centrocampista/Delantero)
UPDATE players SET 
  position1='CM', position2='ST',
  pace=85, shooting=84, passing=85, defending=86, physical=71,
  fifa_rating=86
WHERE card_asset_basename='javo';

-- Mario (Centrocampista)
UPDATE players SET 
  position1='CM', position2='CAM',
  pace=82, shooting=86, passing=88, defending=88, physical=66,
  fifa_rating=89
WHERE card_asset_basename='mario';

-- Nico Uriburu (Centrocampista/Delantero)
UPDATE players SET 
  position1='CM', position2='ST',
  pace=83, shooting=84, passing=85, defending=88, physical=73,
  fifa_rating=87
WHERE card_asset_basename='nicou';

-- Mister (Defensa)
UPDATE players SET 
  position1='CB', position2='CDM',
  pace=76, shooting=80, passing=82, defending=83, physical=88,
  fifa_rating=89
WHERE card_asset_basename='mister';

-- Perma (Defensa) - cambia de GK a defensa
UPDATE players SET 
  position1='CB', position2='RB',
  pace=83, shooting=78, passing=83, defending=81, physical=85,
  fifa_rating=86
WHERE card_asset_basename='perma';

-- Nico Yazawa (Portero) - upsert por basename único
INSERT INTO players 
  (name, team, position1, position2, pace, shooting, passing, defending, physical, fifa_rating, market_value, fantasy_points, image_url, card_asset_basename, eligible_for_quiz)
VALUES 
  ('Nico Yazawa','FC Bufas','GK',NULL, 84, 81, 81, 83, 85, 84, 0, 0, '/images/players/nico-yazawa.jpg','nico_yazawa',1)
ON DUPLICATE KEY UPDATE 
  position1=VALUES(position1), position2=VALUES(position2),
  pace=VALUES(pace), shooting=VALUES(shooting), passing=VALUES(passing), defending=VALUES(defending), physical=VALUES(physical),
  fifa_rating=VALUES(fifa_rating), image_url=VALUES(image_url), eligible_for_quiz=VALUES(eligible_for_quiz);
