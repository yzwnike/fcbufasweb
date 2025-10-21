-- Migration to fix coin_transactions type column for Supabase (PostgreSQL)
-- This fixes the "value too long for type character varying(13)" error

-- Option 1: If type column is varchar(13), increase the length
ALTER TABLE coin_transactions 
ALTER COLUMN type TYPE varchar(50);

-- Option 2: If using a custom type/enum, drop and recreate
-- DROP TYPE IF EXISTS transaction_type_enum CASCADE;
-- CREATE TYPE transaction_type_enum AS ENUM (
--   'DAILY_QUIZ',
--   'FANTASY_RUSH', 
--   'PACK_PURCHASE',
--   'PACK_SPEEDUP',
--   'CARD_SALE',
--   'CARD_PURCHASE',
--   'INITIAL_BONUS',
--   'ACHIEVEMENT_PENDING',
--   'ACHIEVEMENT_CHOICE'
-- );
-- ALTER TABLE coin_transactions 
-- ALTER COLUMN type TYPE transaction_type_enum USING type::text::transaction_type_enum;