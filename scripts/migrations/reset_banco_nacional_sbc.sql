-- Script para eliminar todas las submissions de SBC del usuario BANCO_NACIONAL
-- Esto hará que todos los SBC aparezcan como no completados para este usuario

-- Primero encontramos el ID del usuario BANCO_NACIONAL
DO $$
DECLARE
    user_id_var INTEGER;
BEGIN
    -- Obtener el ID del usuario BANCO_NACIONAL
    SELECT id INTO user_id_var FROM users WHERE username = 'BANCO_NACIONAL';
    
    IF user_id_var IS NULL THEN
        RAISE NOTICE 'Usuario BANCO_NACIONAL no encontrado';
    ELSE
        RAISE NOTICE 'Usuario BANCO_NACIONAL encontrado con ID: %', user_id_var;
        
        -- Eliminar los items de las submissions antes de eliminar las submissions
        DELETE FROM sbc_submission_items 
        WHERE submission_id IN (
            SELECT id FROM sbc_submissions WHERE user_id = user_id_var
        );
        
        RAISE NOTICE 'Items de submissions eliminados';
        
        -- Eliminar todas las submissions del usuario
        DELETE FROM sbc_submissions WHERE user_id = user_id_var;
        
        RAISE NOTICE 'Submissions de SBC eliminadas para usuario BANCO_NACIONAL';
        RAISE NOTICE 'Ahora todos los SBC aparecerán como no completados para este usuario';
    END IF;
END $$;
