import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Usuarios afectados por el bug
const AFFECTED_USERS = ['PermaGOD', 'joan', 'BANCO_NACIONAL'];
const COMPENSATION_PACK = 'MEDIA_84_PLUS';
const COMPENSATION_MESSAGE = '🐛 Compensación por bug del SBC 84+ - Gracias por ser beta tester involuntario 😅';

async function grantBugCompensation() {
  const client = await pool.connect();
  
  try {
    console.log('🐛 Iniciando compensación por bug del SBC 84+...\n');
    
    // Obtener IDs de usuarios afectados
    const usersResult = await client.query(
      'SELECT id, username FROM users WHERE username = ANY($1)',
      [AFFECTED_USERS]
    );
    
    if (usersResult.rows.length === 0) {
      console.log('❌ No se encontraron usuarios afectados');
      return;
    }
    
    console.log(`✅ Usuarios encontrados: ${usersResult.rows.length}\n`);
    console.log(`🐛 ${COMPENSATION_MESSAGE}\n`);
    
    await client.query('BEGIN');
    
    let compensatedCount = 0;
    
    // Dar sobres de compensación a cada usuario
    for (const user of usersResult.rows) {
      console.log(`👤 Procesando ${user.username} (ID: ${user.id})...`);
      
      // Dar el sobre 84+
      await client.query(
        'INSERT INTO packs (user_id, type, cost, opened) VALUES ($1, $2, 0, FALSE)',
        [user.id, COMPENSATION_PACK]
      );
      console.log(`   🎁 Sobre 84+ entregado`);
      console.log('');
      compensatedCount++;
    }
    
    await client.query('COMMIT');
    
    console.log('✨ Compensación completada exitosamente!');
    console.log(`\n📊 Resumen:`);
    console.log(`   - Usuarios compensados: ${compensatedCount}`);
    console.log(`   - Sobre entregado: ${COMPENSATION_PACK}`);
    console.log(`   - Los sobres aparecerán en su inventario de packs`);
    
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
grantBugCompensation()
  .then(() => {
    console.log('\n🎉 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error ejecutando script:', error);
    process.exit(1);
  });
