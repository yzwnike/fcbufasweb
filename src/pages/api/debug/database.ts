import type { APIRoute } from 'astro';
import { pool, currentPgConfig } from '@/lib/mysql';

export const GET: APIRoute = async () => {
  try {
    console.log('🔍 Debug: Iniciando diagnóstico...');
    
    // 1. Verificar configuración
    const config = currentPgConfig();
    console.log('📊 Configuración:', config);
    
    // 2. Test de conexión básico
    const client = await pool.connect();
    console.log('✅ Conexión establecida');
    
    // 3. Test de query simple
    const timeResult = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Query básica exitosa');
    
    // 4. Verificar tabla users
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Usuarios encontrados: ${userCount.rows[0].count}`);
    
    // 5. Test de un registro de usuario mock
    try {
      const testQuery = `
        SELECT id, username, email, coins 
        FROM users 
        WHERE username = 'test_debug_user'
        LIMIT 1
      `;
      const testResult = await client.query(testQuery);
      console.log('🧪 Query de test ejecutada correctamente');
    } catch (queryError) {
      console.error('❌ Error en query de test:', queryError);
    }
    
    client.release();
    
    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      config: {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        hasPassword: config.hasPassword
      },
      serverTime: timeResult.rows[0].current_time,
      userCount: userCount.rows[0].count,
      environment: process.env.NODE_ENV || 'unknown',
      vercel: {
        region: process.env.VERCEL_REGION || 'unknown',
        env: process.env.VERCEL_ENV || 'unknown'
      }
    };
    
    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    
    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'UnknownError',
        stack: error instanceof Error ? error.stack : undefined
      },
      config: currentPgConfig(),
      environment: process.env.NODE_ENV || 'unknown',
      vercel: {
        region: process.env.VERCEL_REGION || 'unknown',
        env: process.env.VERCEL_ENV || 'unknown'
      }
    };
    
    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};