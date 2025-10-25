import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function enableRealtime() {
  const client = await pool.connect();
  
  try {
    console.log('🔔 Habilitando Realtime para notificaciones de cartas...\n');
    
    const sql = readFileSync(join(__dirname, 'migrations', 'enable_realtime.sql'), 'utf8');
    
    // Ejecutar cada comando SQL por separado
    const commands = sql.split(';').filter(cmd => cmd.trim() && !cmd.trim().startsWith('--'));
    
    for (const cmd of commands) {
      if (cmd.trim()) {
        try {
          await client.query(cmd);
        } catch (err) {
          // Algunos comandos pueden fallar si ya están aplicados, es normal
          if (!err.message.includes('already exists') && 
              !err.message.includes('already a member')) {
            console.warn('⚠️  Advertencia:', err.message);
          }
        }
      }
    }
    
    console.log('✅ Realtime habilitado exitosamente');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Agrega estas variables a tu .env:');
    console.log('   PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co');
    console.log('   PUBLIC_SUPABASE_ANON_KEY=tu_anon_key');
    console.log('\n2. Obtén las credenciales desde Supabase Dashboard → Settings → API');
    console.log('\n3. Reinicia el servidor de desarrollo');
    console.log('\n4. Abre la consola del navegador y busca: "Estado de suscripción realtime"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

enableRealtime()
  .then(() => {
    console.log('\n🎉 Configuración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });
