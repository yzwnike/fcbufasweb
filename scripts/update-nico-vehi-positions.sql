USE bufas_cards;

-- Update Nico Vehi to be able to play as Defensa & Portero (CB & GK)
UPDATE players
SET position1='CB', position2='GK'
WHERE name='Nico Vehi' OR card_asset_basename='yazawa';

-- Verify the update
SELECT name, position1, position2, fifa_rating 
FROM players 
WHERE name='Nico Vehi' OR card_asset_basename='yazawa';