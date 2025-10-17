USE bufas_cards;

-- Set Nico Vehi to Goalkeeper with GK-style stats (mapped)
UPDATE players
SET position1='GK', position2=NULL,
    pace=84,    -- velocidad
    shooting=81, -- parada/saque mapeado
    passing=81,  -- saque/pase
    defending=83, -- posicionamiento
    physical=85,  -- estirada/reflejos
    fifa_rating=84
WHERE name='Nico Vehi' OR card_asset_basename='yazawa';
