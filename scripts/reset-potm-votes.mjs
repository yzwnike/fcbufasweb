import pkg from 'pg';
const { Pool } = pkg;

async function resetPotmVotes() {
  const pool = new Pool({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    console.log('🔄 Conectando a Postgres...');
    await client.query('BEGIN');

    // Asegurar columna user_id e índice único (no se elimina, solo limpiamos votos)
    await client.query(`ALTER TABLE potm_votes ADD COLUMN IF NOT EXISTS user_id BIGINT`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS potm_votes_user_id_uniq ON potm_votes(user_id)`);

    // Borrar todos los votos
    const del = await client.query('DELETE FROM potm_votes');
    console.log(`🗑️  Votos eliminados: ${del.rowCount}`);

    await client.query('COMMIT');
    console.log('✅ Reinicio de votos POTM completado');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error reseteando votos POTM:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetPotmVotes();
