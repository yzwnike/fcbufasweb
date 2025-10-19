import type { APIRoute } from 'astro';
import { getAuthUserFromRequest, validateEmail } from '@/lib/auth';
import { executeQuery, executeQuerySingle } from '@/lib/mysql';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success:false, error:'No autorizado' }), { status:401 });
    const user = await executeQuerySingle<any>('SELECT id, username, email, coins, created_at, updated_at FROM users WHERE id = ?', [auth.id]);
    if (!user) return new Response(JSON.stringify({ success:false, error:'Usuario no encontrado' }), { status:404 });
    return new Response(JSON.stringify({ success:true, user }), { status:200 });
  } catch (e:any) {
    return new Response(JSON.stringify({ success:false, error: e?.message || 'Error interno' }), { status:500 });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success:false, error:'No autorizado' }), { status:401 });
    const body = await request.json().catch(() => ({} as any));
    const newUsername = (body?.username || '').trim();
    const newEmail = (body?.email || '').trim();

    // Validaciones
    if (!newUsername || newUsername.length < 3 || newUsername.length > 20 || !/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      return new Response(JSON.stringify({ success:false, error:'Username debe tener 3-20 caracteres alfanuméricos o _' }), { status:400 });
    }
    if (!validateEmail(newEmail)) {
      return new Response(JSON.stringify({ success:false, error:'Email no válido' }), { status:400 });
    }

    // Unicidad
    const existsUser = await executeQuerySingle<any>('SELECT id FROM users WHERE username = ? AND id <> ?', [newUsername, auth.id]);
    if (existsUser) {
      return new Response(JSON.stringify({ success:false, error:'Ese username ya está en uso' }), { status:409 });
    }
    const existsEmail = await executeQuerySingle<any>('SELECT id FROM users WHERE email = ? AND id <> ?', [newEmail, auth.id]);
    if (existsEmail) {
      return new Response(JSON.stringify({ success:false, error:'Ese email ya está en uso' }), { status:409 });
    }

    await executeQuery('UPDATE users SET username = ?, email = ?, updated_at = NOW() WHERE id = ?', [newUsername, newEmail, auth.id]);
    const updated = await executeQuerySingle<any>('SELECT id, username, email, coins FROM users WHERE id = ?', [auth.id]);
    return new Response(JSON.stringify({ success:true, user: updated }), { status:200 });
  } catch (e:any) {
    return new Response(JSON.stringify({ success:false, error: e?.message || 'Error interno' }), { status:500 });
  }
};
