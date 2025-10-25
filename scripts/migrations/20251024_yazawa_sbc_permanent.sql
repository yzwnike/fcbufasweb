-- Migración: Hacer el SBC de Yazawa permanente
-- Fecha: 2025-10-24
-- Descripción: Actualizar fechas del SBC "Introducción a los SBC" para que sea permanente
--              (fecha hasta 2030) y no repetible (solo una vez por usuario)

-- Actualizar el SBC de Yazawa a no repetible pero con fecha muy lejana
UPDATE sbc_challenges 
SET 
    repeatable = false,
    end_at = '2030-12-31 23:59:59'
WHERE code = 'SBC_INTRO_YAZAWA';

-- Verificar resultado
SELECT id, code, title, repeatable, start_at, end_at
FROM sbc_challenges
WHERE code = 'SBC_INTRO_YAZAWA';
