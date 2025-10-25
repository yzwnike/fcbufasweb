import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function resetBancoNacionalSBC() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Buscando usuario BANCO_NACIONAL...');
    
    // Obtener el ID del usuario
    const userResult = await client.query(
      'SELECT id FROM users WHERE username = $1',
      ['BANCO_NACIONAL']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario BANCO_NACIONAL no encontrado');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`✅ Usuario BANCO_NACIONAL encontrado con ID: ${userId}`);
    
    // Obtener cantidad de submissions antes de eliminar
    const countResult = await client.query(
      'SELECT COUNT(*) as count FROM sbc_submissions WHERE user_id = $1',
      [userId]
    );
    const submissionCount = parseInt(countResult.rows[0].count);
    
    console.log(`📊 SBC completados encontrados: ${submissionCount}`);
    
    if (submissionCount === 0) {
      console.log('✅ El usuario no tiene ningún SBC completado');
      return;
    }
    
    // Iniciar transacción
    await client.query('BEGIN');
    
    // Eliminar los items de las submissions
    const itemsResult = await client.query(
      `DELETE FROM sbc_submission_items 
       WHERE submission_id IN (
         SELECT id FROM sbc_submissions WHERE user_id = $1
       )`,
      [userId]
    );
    
    console.log(`🗑️  Items de submissions eliminados: ${itemsResult.rowCount}`);
    
    // Eliminar las submissions
    const submissionsResult = await client.query(
      'DELETE FROM sbc_submissions WHERE user_id = $1',
      [userId]
    );
    
    console.log(`🗑️  Submissions eliminadas: ${submissionsResult.rowCount}`);
    
    // Confirmar transacción
    await client.query('COMMIT');
    
    console.log('✅ ¡Listo! Todos los SBC ahora aparecerán como no completados para BANCO_NACIONAL');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
resetBancoNacionalSBC()
  .then(() => {
    console.log('\n✨ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error ejecutando script:', error);
    process.exit(1);
  });
