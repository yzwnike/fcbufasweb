USE bufas_cards;

-- Add dribbling (regate) to players
ALTER TABLE players
  ADD COLUMN dribbling INT NOT NULL DEFAULT 70 AFTER passing;

-- Add per-card override for dribbling
ALTER TABLE cards
  ADD COLUMN dribbling_override INT NULL AFTER passing_override;