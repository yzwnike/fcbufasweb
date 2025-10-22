import type { APIRoute } from 'astro';
import { loginUser } from '@/lib/auth';

export const runtime = 'node';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Usuario y contraseña son requeridos'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await loginUser({ username, password });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 401,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Login API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
