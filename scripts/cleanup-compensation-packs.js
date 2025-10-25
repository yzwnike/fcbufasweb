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

// Usuarios que recibieron compensación
const COMPENSATED_USERS = ['PermaGOD', 'joan', 'BANCO_NACIONAL'];

async function cleanupCompensationPacks() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Limpiando sobres de compensación abiertos...\n');
    
    // Obtener IDs de usuarios compensados
    const usersResult = await client.query(
      'SELECT id, username FROM users WHERE username = ANY($1)',
      [COMPENSATED_USERS]
    );
    
    if (usersResult.rows.length === 0) {
      console.log('❌ No se encontraron usuarios');
      return;
    }
    
    console.log(`✅ Usuarios encontrados: ${usersResult.rows.length}\n`);
    
    let totalDeleted = 0;
    
    for (const user of usersResult.rows) {
      console.log(`👤 ${user.username} (ID: ${user.id})...`);
      
      // Eliminar sobres MEDIA_84_PLUS que ya hayan sido abiertos
      const deleteResult = await client.query(
        `DELETE FROM packs 
         WHERE user_id = $1 
         AND type = $2 
         AND opened = TRUE`,
        [user.id, 'MEDIA_84_PLUS']
      );
      
      if (deleteResult.rowCount > 0) {
        console.log(`   🗑️  ${deleteResult.rowCount} sobre(s) abierto(s) eliminado(s)`);
        totalDeleted += deleteResult.rowCount;
      } else {
        console.log(`   ℹ️  No hay sobres abiertos para eliminar`);
      }
    }
    
    console.log(`\n✨ Limpieza completada`);
    console.log(`📊 Total de sobres eliminados: ${totalDeleted}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
cleanupCompensationPacks()
  .then(() => {
    console.log('\n🎉 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error ejecutando script:', error);
    process.exit(1);
  });
