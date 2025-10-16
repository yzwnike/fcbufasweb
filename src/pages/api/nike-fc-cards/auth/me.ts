import type { APIRoute } from 'astro';
import { getAuthUserFromRequest, getUserById } from '@/lib/auth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = getAuthUserFromRequest(request);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
    }
    const user = await getUserById(auth.id);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Usuario no encontrado' }), { status: 404 });
    }
    return new Response(JSON.stringify({ success: true, user }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Error interno' }), { status: 500 });
  }
};