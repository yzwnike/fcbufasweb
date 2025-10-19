import type { APIRoute } from 'astro';
import { getAuthUserFromRequest, validateEmail } from '@/lib/auth';
import { executeQuery, executeQuerySingle } from '@/lib/mysql';

export const runtime = 'node';

export const PUT: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    
    const body = await request.json().catch(() => ({} as any));
    const newEmail = (body?.email || '').trim();
    
    // Validaciones
    if (!newEmail || !validateEmail(newEmail)) {
      return new Response(JSON.stringify({ success: false, error: 'Email no válido' }), { status: 400 });
    }
    
    // Verificar unicidad
    const existsEmail = await executeQuerySingle<any>('SELECT id FROM users WHERE email = ? AND id <> ?', [newEmail, auth.id]);
    if (existsEmail) {
      return new Response(JSON.stringify({ success: false, error: 'Ese email ya está en uso' }), { status: 409 });
    }
    
    // Actualizar solo el email
    await executeQuery('UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?', [newEmail, auth.id]);
    const updated = await executeQuerySingle<any>('SELECT id, username, email, coins FROM users WHERE id = ?', [auth.id]);
    
    return new Response(JSON.stringify({ success: true, user: updated }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Error interno' }), { status: 500 });
  }
};
