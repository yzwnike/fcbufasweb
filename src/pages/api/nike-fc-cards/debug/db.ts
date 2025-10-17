import type { APIRoute } from 'astro';
import { executeQuerySingle } from '@/lib/mysql';

export const GET: APIRoute = async () => {
  try {
    const one = await executeQuerySingle<any>('SELECT 1 as ok');
    return new Response(JSON.stringify({ success: true, db: !!one?.ok }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), { status: 500 });
  }
};
