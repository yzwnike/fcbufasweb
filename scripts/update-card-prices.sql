-- Script para actualizar precios individuales de cartas
-- Nike FC Cards - Precios personalizados por carta
-- Uso: Ejecutar en MySQL/phpMyAdmin

USE bufas_cards;

-- ========================================
-- ACTUALIZACIÓN DE PRECIOS POR CARTA
-- ========================================

-- Primero, consultar todas las cartas para ver sus IDs actuales:
-- SELECT c.id, p.name as player_name, c.rarity, c.special_type, c.base_price 
-- FROM cards c 
-- JOIN players p ON c.player_id = p.id 
-- ORDER BY p.name, c.special_type;

-- Luego actualizar cada carta individualmente:
-- Formato: UPDATE cards SET base_price = [PRECIO] WHERE id = [ID_CARTA];

-- ========================================
-- EJEMPLO DE ACTUALIZACIONES
-- ========================================

-- Cartas de Nico Vehi (GK, 84 rating)
-- UPDATE cards SET base_price = 500 WHERE id = 1;  -- Regular
-- UPDATE cards SET base_price = 800 WHERE id = 2;  -- TEAM_OF_THE_WEEK
-- UPDATE cards SET base_price = 1200 WHERE id = 3; -- PLAYER_OF_THE_MONTH

-- Cartas de Pablo Vehi (RB/CM, 81 rating)  
-- UPDATE cards SET base_price = 400 WHERE id = 4;  -- Regular
-- UPDATE cards SET base_price = 700 WHERE id = 5;  -- RATING_RELOAD

-- Cartas de Albert Rodriguez (LM/CAM, 83 rating)
-- UPDATE cards SET base_price = 600 WHERE id = 6;  -- Regular
-- UPDATE cards SET base_price = 950 WHERE id = 7;  -- ASSIST_ENGINE

-- ========================================
-- PLANTILLA PARA COMPLETAR
-- ========================================

-- TODO: Reemplazar con tus precios reales
-- Copia esta sección y reemplaza los precios:

/*
-- NICO VEHI (GK, 84)
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 1 AND special_type = 'Regular';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 1 AND special_type = 'TEAM_OF_THE_WEEK';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 1 AND special_type = 'PLAYER_OF_THE_MONTH';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 1 AND special_type = 'RATING_RELOAD';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 1 AND special_type = 'ASSIST_ENGINE';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 1 AND special_type = 'MARKET_MASTER';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 1 AND special_type = 'COMEBACK_HERO';

-- PABLO VEHI (RB/CM, 81)
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 2 AND special_type = 'Regular';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 2 AND special_type = 'TEAM_OF_THE_WEEK';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 2 AND special_type = 'PLAYER_OF_THE_MONTH';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 2 AND special_type = 'RATING_RELOAD';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 2 AND special_type = 'ASSIST_ENGINE';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 2 AND special_type = 'MARKET_MASTER';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 2 AND special_type = 'COMEBACK_HERO';

-- ALBERT RODRIGUEZ (LM/CAM, 83)
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 3 AND special_type = 'Regular';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 3 AND special_type = 'TEAM_OF_THE_WEEK';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 3 AND special_type = 'PLAYER_OF_THE_MONTH';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 3 AND special_type = 'RATING_RELOAD';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 3 AND special_type = 'ASSIST_ENGINE';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 3 AND special_type = 'MARKET_MASTER';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 3 AND special_type = 'COMEBACK_HERO';

-- MARC SANCHEZ (CB/CDM, 82)
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 4 AND special_type = 'Regular';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 4 AND special_type = 'TEAM_OF_THE_WEEK';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 4 AND special_type = 'PLAYER_OF_THE_MONTH';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 4 AND special_type = 'RATING_RELOAD';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 4 AND special_type = 'ASSIST_ENGINE';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 4 AND special_type = 'MARKET_MASTER';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 4 AND special_type = 'COMEBACK_HERO';

-- MARIO ROCA (CM/CAM, 80)
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 5 AND special_type = 'Regular';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 5 AND special_type = 'TEAM_OF_THE_WEEK';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 5 AND special_type = 'PLAYER_OF_THE_MONTH';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 5 AND special_type = 'RATING_RELOAD';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 5 AND special_type = 'ASSIST_ENGINE';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 5 AND special_type = 'MARKET_MASTER';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 5 AND special_type = 'COMEBACK_HERO';

-- MARCOS LOPEZ (ST/RW, 85)
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 6 AND special_type = 'Regular';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 6 AND special_type = 'TEAM_OF_THE_WEEK';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 6 AND special_type = 'PLAYER_OF_THE_MONTH';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 6 AND special_type = 'RATING_RELOAD';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 6 AND special_type = 'ASSIST_ENGINE';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 6 AND special_type = 'MARKET_MASTER';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 6 AND special_type = 'COMEBACK_HERO';

-- NICO URIBURU (ST/LW, 84)
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 7 AND special_type = 'Regular';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 7 AND special_type = 'TEAM_OF_THE_WEEK';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 7 AND special_type = 'PLAYER_OF_THE_MONTH';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 7 AND special_type = 'RATING_RELOAD';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 7 AND special_type = 'ASSIST_ENGINE';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 7 AND special_type = 'MARKET_MASTER';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 7 AND special_type = 'COMEBACK_HERO';

-- JAVO AYESTA (CM/CDM, 79)
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 8 AND special_type = 'Regular';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 8 AND special_type = 'TEAM_OF_THE_WEEK';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 8 AND special_type = 'PLAYER_OF_THE_MONTH';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 8 AND special_type = 'RATING_RELOAD';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 8 AND special_type = 'ASSIST_ENGINE';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 8 AND special_type = 'MARKET_MASTER';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 8 AND special_type = 'COMEBACK_HERO';

-- MARC PERMANYER (GK, 78)
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 9 AND special_type = 'Regular';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 9 AND special_type = 'TEAM_OF_THE_WEEK';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 9 AND special_type = 'PLAYER_OF_THE_MONTH';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 9 AND special_type = 'RATING_RELOAD';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 9 AND special_type = 'ASSIST_ENGINE';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 9 AND special_type = 'MARKET_MASTER';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 9 AND special_type = 'COMEBACK_HERO';

-- FAN XU (CB/RB, 77)
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 10 AND special_type = 'Regular';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 10 AND special_type = 'TEAM_OF_THE_WEEK';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 10 AND special_type = 'PLAYER_OF_THE_MONTH';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 10 AND special_type = 'RATING_RELOAD';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 10 AND special_type = 'ASSIST_ENGINE';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 10 AND special_type = 'MARKET_MASTER';
UPDATE cards SET base_price = [PRECIO] WHERE player_id = 10 AND special_type = 'COMEBACK_HERO';
*/

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Consultar todos los precios después de la actualización:
-- SELECT c.id, p.name as player_name, c.rarity, c.special_type, c.base_price 
-- FROM cards c 
-- JOIN players p ON c.player_id = p.id 
-- ORDER BY p.name, c.special_type;

-- ========================================
-- NOTAS
-- ========================================

-- 1. Los precios se muestran directamente en colección y mercado
-- 2. El sistema de multiplicadores de economy.ts ya no se aplica a base_price
-- 3. Puedes actualizar precios en cualquier momento sin deployar código
-- 4. Considera hacer backup antes de actualizaciones masivas:
--    mysqldump -h localhost -u root -p bufas_cards cards > cards_backup.sql