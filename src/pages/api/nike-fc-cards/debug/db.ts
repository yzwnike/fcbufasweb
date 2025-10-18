import type { APIRoute } from 'astro';
import { executeQuerySingle, currentPgConfig } from '@/lib/mysql';

export const runtime = 'node';

export const GET: APIRoute = async () => {
  try {
    const cfg = currentPgConfig();
    const one = await executeQuerySingle<any>('SELECT 1 as ok');
    const ver = await executeQuerySingle<any>('SELECT version() as version');
    return new Response(JSON.stringify({ success: true, db: !!one?.ok, version: ver?.version || null, config: { host: cfg.host, port: cfg.port, user: cfg.user, database: cfg.database, hasPassword: cfg.hasPassword } }), { status: 200 });
  } catch (e: any) {
    const cfg = currentPgConfig();
    return new Response(JSON.stringify({ 
      success: false, 
      error: e?.message || String(e), 
      code: e?.code || null,
      detail: e?.detail || null,
      hint: e?.hint || null,
      config: { host: cfg.host, port: cfg.port, user: cfg.user, database: cfg.database, hasPassword: cfg.hasPassword }
    }), { status: 500 });
  }
};
