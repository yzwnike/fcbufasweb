USE bufas_cards;

-- Mister solo defensa (sin segunda posición)
UPDATE players
SET position1='CB', position2=NULL
WHERE name='Marc Sanchez' OR card_asset_basename='mister';

-- Pablo Vehi defensa/centrocampista (RB/CM)
UPDATE players
SET position1='RB', position2='CM'
WHERE name='Pablo Vehi' OR card_asset_basename='elvei';
