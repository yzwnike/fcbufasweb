import type { APIRoute } from 'astro';
import { executeQuery, executeQuerySingle } from '@/lib/mysql';

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS fantasy_admin_flags (
      id INT PRIMARY KEY,
      locked boolean NOT NULL DEFAULT false,
      updated_at timestamptz DEFAULT NOW()
    )
  `);
  const row = await executeQuerySingle<any>('SELECT id FROM fantasy_admin_flags WHERE id=1');
  if (!row) {
    await executeQuery('INSERT INTO fantasy_admin_flags (id, locked) VALUES (1, false)');
  }
}

export const GET: APIRoute = async () => {
  try {
    await ensureTable();
    const row = await executeQuerySingle<any>('SELECT locked, updated_at FROM fantasy_admin_flags WHERE id=1');
    return new Response(JSON.stringify({ success: true, locked: !!row?.locked, updatedAt: row?.updated_at || null }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any)?.message || e) }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    await ensureTable();
    const body = await request.json().catch(() => ({}));
    const locked = !!body?.locked;
    await executeQuery('UPDATE fantasy_admin_flags SET locked = ?, updated_at = NOW() WHERE id=1', [locked]);
    return new Response(JSON.stringify({ success: true, locked }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any)?.message || e) }), { status: 500 });
  }
};