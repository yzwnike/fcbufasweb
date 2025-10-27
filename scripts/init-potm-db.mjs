import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada en las variables de entorno');
  process.exit(1);
}

async function initPOTMDatabase() {
  let connection;
  
  try {
    console.log('🔄 Conectando a la base de datos...');
    connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('✅ Conexión establecida');
    
    // Crear tabla de votos POTM
    console.log('🔄 Creando tabla potm_votes...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS potm_votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_ip VARCHAR(100) NOT NULL,
        first_place VARCHAR(50) NOT NULL,
        second_place VARCHAR(50) NOT NULL,
        third_place VARCHAR(50) NOT NULL,
        fourth_place VARCHAR(50) NOT NULL,
        voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_ip (user_ip),
        INDEX idx_voted_at (voted_at),
        INDEX idx_month_year (MONTH(voted_at), YEAR(voted_at))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ Tabla potm_votes creada correctamente');
    
    // Verificar estructura
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM potm_votes
    `);
    
    console.log('\n📋 Estructura de la tabla:');
    console.table(columns);
    
    console.log('\n✅ Base de datos POTM inicializada correctamente');
    console.log('\n📊 Sistema de puntos:');
    console.log('   1º Lugar = 4 puntos');
    console.log('   2º Lugar = 3 puntos');
    console.log('   3º Lugar = 2 puntos');
    console.log('   4º Lugar = 1 punto');
    
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

initPOTMDatabase();
