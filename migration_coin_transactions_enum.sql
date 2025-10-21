-- Migration to update coin_transactions type ENUM to include achievement types
-- This fixes the "value too long for type character varying(13)" error

USE bufas_cards;

ALTER TABLE coin_transactions 
MODIFY COLUMN type ENUM(
  'DAILY_QUIZ',
  'FANTASY_RUSH',
  'PACK_PURCHASE',
  'PACK_SPEEDUP',
  'CARD_SALE',
  'CARD_PURCHASE',
  'INITIAL_BONUS',
  'ACHIEVEMENT_PENDING',
  'ACHIEVEMENT_CHOICE'
) NOT NULL;