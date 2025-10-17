-- Migration: add per-card stat overrides and optional position overrides
USE bufas_cards;

ALTER TABLE cards
  ADD COLUMN fifa_rating_override INT NULL AFTER base_price,
  ADD COLUMN pace_override INT NULL AFTER fifa_rating_override,
  ADD COLUMN shooting_override INT NULL AFTER pace_override,
  ADD COLUMN passing_override INT NULL AFTER shooting_override,
  ADD COLUMN defending_override INT NULL AFTER passing_override,
  ADD COLUMN physical_override INT NULL AFTER defending_override,
  ADD COLUMN position1_override ENUM('GK','CB','LB','RB','CDM','CM','CAM','LM','RM','LW','RW','ST') NULL AFTER physical_override,
  ADD COLUMN position2_override ENUM('GK','CB','LB','RB','CDM','CM','CAM','LM','RM','LW','RW','ST') NULL AFTER position1_override;
