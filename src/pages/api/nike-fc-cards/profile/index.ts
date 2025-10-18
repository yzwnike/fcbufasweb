import type { APIRoute } from 'astro';
import { getAuthUserFromRequest, validateEmail, validateUsername } from '@/lib/auth';
import { executeQuerySingle, executeQuery } from '@/lib/mysql';

// GET: devuelve username y email del usuario autenticado
export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    const user = await executeQuerySingle<any>('SELECT id, username, email FROM users WHERE id = ?', [auth.id]);
    if (!user) return new Response(JSON.stringify({ success: false, error: 'Usuario no encontrado' }), { status: 404 });
    return new Response(JSON.stringify({ success: true, user: { id: user.id, username: user.username, email: user.email } }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};

// PUT: actualiza username y/o email (únicos)
export const PUT: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });

    const body = await request.json().catch(() => ({}));
    let { username, email } = body || {};

    if (!username && !email) {
      return new Response(JSON.stringify({ success: false, error: 'Nada para actualizar' }), { status: 400 });
    }

    // Cargar actual para comparar
    const current = await executeQuerySingle<any>('SELECT username, email FROM users WHERE id = ?', [auth.id]);
    if (!current) return new Response(JSON.stringify({ success: false, error: 'Usuario no encontrado' }), { status: 404 });

    // Normaliza: si no se envía un campo, mantener el actual
    if (!username) username = current.username;
    if (!email) email = current.email;

    // Validación
    if (!validateUsername(username)) {
      return new Response(JSON.stringify({ success: false, error: 'Username inválido (3-20, alfanumérico/guión bajo)' }), { status: 400 });
    }
    if (!validateEmail(email)) {
      return new Response(JSON.stringify({ success: false, error: 'Email inválido' }), { status: 400 });
    }

    // Unicidad (excluyendo al propio usuario)
    const uUser = await executeQuerySingle<any>('SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1', [username, auth.id]);
    if (uUser) return new Response(JSON.stringify({ success: false, error: 'Username ya en uso' }), { status: 409 });
    const uEmail = await executeQuerySingle<any>('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [email, auth.id]);
    if (uEmail) return new Response(JSON.stringify({ success: false, error: 'Email ya en uso' }), { status: 409 });

    await executeQuery('UPDATE users SET username = ?, email = ? WHERE id = ?', [username, email, auth.id]);

    return new Response(JSON.stringify({ success: true, user: { id: auth.id, username, email } }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};