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
    
    // Obtener datos actuales del usuario
    const currentUser = await executeQuerySingle<any>('SELECT username, email FROM users WHERE id = ?', [auth.id]);
    if (!currentUser) {
      return new Response(JSON.stringify({ success:false, error:'Usuario no encontrado' }), { status:404 });
    }
    
    const newUsername = body?.username !== undefined ? (body.username || '').trim() : currentUser.username;
    const newEmail = body?.email !== undefined ? (body.email || '').trim() : currentUser.email;

    // Validaciones solo si se está cambiando el campo
    if (body?.username !== undefined) {
      if (!newUsername || newUsername.length < 3 || newUsername.length > 20 || !/^[a-zA-Z0-9_]+$/.test(newUsername)) {
        return new Response(JSON.stringify({ success:false, error:'Username debe tener 3-20 caracteres alfanuméricos o _' }), { status:400 });
      }
      // Verificar unicidad del username solo si cambió
      if (newUsername !== currentUser.username) {
        const existsUser = await executeQuerySingle<any>('SELECT id FROM users WHERE username = ? AND id <> ?', [newUsername, auth.id]);
        if (existsUser) {
          return new Response(JSON.stringify({ success:false, error:'Ese username ya está en uso' }), { status:409 });
        }
      }
    }
    
    if (body?.email !== undefined) {
      if (!newEmail || !validateEmail(newEmail)) {
        return new Response(JSON.stringify({ success:false, error:'Email no válido' }), { status:400 });
      }
      // Verificar unicidad del email solo si cambió
      if (newEmail !== currentUser.email) {
        const existsEmail = await executeQuerySingle<any>('SELECT id FROM users WHERE email = ? AND id <> ?', [newEmail, auth.id]);
        if (existsEmail) {
          return new Response(JSON.stringify({ success:false, error:'Ese email ya está en uso' }), { status:409 });
        }
      }
    }

    await executeQuery('UPDATE users SET username = ?, email = ?, updated_at = NOW() WHERE id = ?', [newUsername, newEmail, auth.id]);
    const updated = await executeQuerySingle<any>('SELECT id, username, email, coins FROM users WHERE id = ?', [auth.id]);
    return new Response(JSON.stringify({ success:true, user: updated }), { status:200 });
  } catch (e:any) {
    return new Response(JSON.stringify({ success:false, error: e?.message || 'Error interno' }), { status:500 });
  }
};
