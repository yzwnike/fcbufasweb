import { Pool } from 'pg';
import 'dotenv/config';

// Función para obtener variables de entorno
function envGet(key, def) {
  const value = process.env[key] || def;
  console.log(`${key}: ${value ? '✅ Set' : '❌ Missing'}`);
  return value;
}

console.log('🔍 Verificando variables de entorno...\n');

const PGHOST = envGet('PGHOST') || envGet('SUPABASE_HOST');
const PGPORT = Number(envGet('PGPORT', '5432'));
const PGUSER = envGet('PGUSER') || envGet('SUPABASE_USER') || 'postgres';
const PGPASSWORD = envGet('PGPASSWORD') || envGet('SUPABASE_PASSWORD');
const PGDATABASE = envGet('PGDATABASE') || envGet('SUPABASE_DB') || 'postgres';

console.log('\n📊 Configuración de PostgreSQL:');
console.log(`Host: ${PGHOST || 'NOT SET'}`);
console.log(`Port: ${PGPORT}`);
console.log(`User: ${PGUSER}`);
console.log(`Database: ${PGDATABASE}`);
console.log(`Password: ${PGPASSWORD ? '***' : 'NOT SET'}`);

if (!PGHOST || !PGPASSWORD) {
  console.error('\n❌ Faltan variables de entorno críticas');
  process.exit(1);
}

// Test de conexión
console.log('\n🔌 Probando conexión...');

const pool = new Pool({
  host: PGHOST,
  port: PGPORT,
  user: PGUSER,
  password: PGPASSWORD,
  database: PGDATABASE,
  max: 10,
  ssl: { rejectUnauthorized: false },
});

try {
  const client = await pool.connect();
  console.log('✅ Conexión exitosa');
  
  // Test básico
  const result = await client.query('SELECT NOW() as current_time');
  console.log(`⏰ Tiempo del servidor: ${result.rows[0].current_time}`);
  
  // Verificar tablas
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  console.log('\n📋 Tablas encontradas:');
  tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
  
  // Test de la tabla users
  try {
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n👥 Usuarios en la tabla: ${userCount.rows[0].count}`);
  } catch (error) {
    console.log('\n❌ Error al consultar tabla users:', error.message);
  }
  
  client.release();
  await pool.end();
  console.log('\n✅ Diagnóstico completado');
  
} catch (error) {
  console.error('\n❌ Error de conexión:', error.message);
  process.exit(1);
}