import type { APIRoute } from 'astro';
import { getAuthUserFromRequest } from '@/lib/auth';
import { executeQuerySingle } from '@/lib/mysql';

export const runtime = 'node';

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });

    const { pack_type } = await request.json();
    
    if (!pack_type) {
      return new Response(JSON.stringify({ success: false, error: 'pack_type requerido' }), { status: 400 });
    }

    console.log('get-recent-pack - Looking for:', { pack_type, userId: auth.id });

    // Buscar el pack más reciente no abierto del tipo especificado
    const pack = await executeQuerySingle<any>(
      'SELECT * FROM packs WHERE user_id = ? AND type = ? AND opened = FALSE ORDER BY created_at DESC LIMIT 1',
      [auth.id, pack_type]
    );

    console.log('get-recent-pack - Found pack:', pack);

    if (!pack) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No se encontró ningún pack de tipo ' + pack_type 
      }), { status: 404 });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      pack: pack 
    }), { status: 200 });

  } catch (e: any) {
    console.error('get-recent-pack error:', e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno',
      details: e?.message || String(e)
    }), { status: 500 });
  }
};