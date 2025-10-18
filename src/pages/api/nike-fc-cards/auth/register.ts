import type { APIRoute } from 'astro';
import { registerUser } from '@/lib/auth';

export const runtime = 'node';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Todos los campos son requeridos'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await registerUser({ username, email, password });

    return new Response(JSON.stringify(result), {
      status: result.success ? 201 : 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Register API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
