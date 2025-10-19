import type { APIRoute } from 'astro';
import { getAuthUserFromRequest, verifyPassword, hashPassword } from '@/lib/auth';
import { executeQuerySingle, executeQuery } from '@/lib/mysql';

// PUT: cambia la contraseña del usuario autenticado
export const PUT: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword } = body || {};

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ success: false, error: 'Faltan campos' }), { status: 400 });
    }
    if (String(newPassword).length < 6) {
      return new Response(JSON.stringify({ success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' }), { status: 400 });
    }

    const user = await executeQuerySingle<any>('SELECT id, password_hash FROM users WHERE id = ?', [auth.id]);
    if (!user) return new Response(JSON.stringify({ success: false, error: 'Usuario no encontrado' }), { status: 404 });

    const ok = await verifyPassword(currentPassword, user.password_hash);
    if (!ok) return new Response(JSON.stringify({ success: false, error: 'Contraseña actual incorrecta' }), { status: 400 });

    const newHash = await hashPassword(newPassword);
    await executeQuery('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, auth.id]);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};
