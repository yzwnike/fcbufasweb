import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306'),
  charset: 'utf8mb4',
};

async function initializeDatabase() {
  let connection;
  
  try {
    console.log('🔄 Conectando a MySQL...');
    
    // Conectar sin especificar base de datos
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Conectado a MySQL');
    
    // Leer el archivo SQL
    const sqlPath = join(__dirname, '../src/lib/database.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');
    
    // Dividir las consultas por punto y coma
    const queries = sqlContent
      .split(';')
      .map(query => query.trim())
      .filter(query => query.length > 0);
    
    console.log(`📊 Ejecutando ${queries.length} consultas...`);
    
    // Ejecutar cada consulta
    for (const query of queries) {
      try {
        await connection.execute(query);
        console.log('✅', query.substring(0, 50) + (query.length > 50 ? '...' : ''));
      } catch (error) {
        console.log('⚠️', query.substring(0, 50) + (query.length > 50 ? '...' : ''));
        console.log('   Error:', error.message);
        
        // Solo fallar en errores críticos, no en duplicados
        if (!error.message.includes('already exists') && 
            !error.message.includes('Duplicate entry') &&
            !error.message.includes('Table') && 
            !error.message.includes('exists')) {
          throw error;
        }
      }
    }
    
    console.log('✅ Base de datos inicializada correctamente');
    console.log('🎮 Nike FC Cards está listo para usar!');
    
  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Parece que MySQL no está ejecutándose. Para solucionarlo:');
      console.log('   1. Instala MySQL: https://dev.mysql.com/downloads/mysql/');
      console.log('   2. Inicia el servicio MySQL');
      console.log('   3. Configura las credenciales en el archivo .env');
      console.log('');
      console.log('   Alternativamente, puedes usar XAMPP o WAMP que incluyen MySQL.');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase();
}