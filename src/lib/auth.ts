import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { User } from './mysql';
import { executeQuery, executeQuerySingle, executeTransaction } from './mysql';

const JWT_SECRET = process.env.JWT_SECRET || 'nike_fc_cards_super_secret_key_2025';
const SALT_ROUNDS = 12;

// Interfaces para autenticación
export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  coins: number;
}

export interface AuthToken {
  userId: number;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Validaciones
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUsername(username: string): boolean {
  // Debe tener entre 3 y 20 caracteres, solo letras, números y guiones bajos
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

export function validatePassword(password: string): boolean {
  // Mínimo 6 caracteres
  return password.length >= 6;
}

// Hash de contraseña
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Verificar contraseña
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Generar JWT token
export function generateToken(user: AuthUser): string {
  const payload: AuthToken = {
    userId: user.id,
    username: user.username,
    email: user.email,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verificar JWT token
export function verifyToken(token: string): AuthToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthToken;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Registrar nuevo usuario
export async function registerUser(data: RegisterData): Promise<{ success: boolean; user?: AuthUser; error?: string; token?: string }> {
  try {
    // Validaciones
    if (!validateEmail(data.email)) {
      return { success: false, error: 'Email no válido' };
    }

    if (!validateUsername(data.username)) {
      return { success: false, error: 'Username debe tener entre 3-20 caracteres alfanuméricos' };
    }

    if (!validatePassword(data.password)) {
      return { success: false, error: 'Password debe tener al menos 6 caracteres' };
    }

    // Verificar si el usuario ya existe
    const existingUser = await executeQuerySingle<User>(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [data.email, data.username]
    );

    if (existingUser) {
      return { success: false, error: 'Usuario o email ya existe' };
    }

    // Hash de la contraseña
    const passwordHash = await hashPassword(data.password);

    // Crear usuario en una transacción
    const result = await executeTransaction(async (connection) => {
      // Insertar usuario
      const [userResult] = await connection.execute(
        'INSERT INTO users (username, email, password_hash, coins) VALUES (?, ?, ?, ?)',
        [data.username, data.email, passwordHash, 1000] // 1000 monedas iniciales
      );

      const userId = (userResult as any).insertId;

      // Registrar transacción de monedas inicial
      await connection.execute(
        'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
        [userId, 1000, 'INITIAL_BONUS', 'Bono inicial de registro']
      );

      return userId;
    });

    // Obtener usuario creado
    const newUser = await executeQuerySingle<User>(
      'SELECT id, username, email, coins FROM users WHERE id = ?',
      [result]
    );

    if (!newUser) {
      return { success: false, error: 'Error al crear usuario' };
    }

    const authUser: AuthUser = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      coins: newUser.coins,
    };

    const token = generateToken(authUser);

    return { success: true, user: authUser, token };

  } catch (error) {
    console.error('Register error:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

// Iniciar sesión
export async function loginUser(data: LoginData): Promise<{ success: boolean; user?: AuthUser; error?: string; token?: string }> {
  try {
    // Validaciones
    if (!validateEmail(data.email)) {
      return { success: false, error: 'Email no válido' };
    }

    // Buscar usuario por email
    const user = await executeQuerySingle<User>(
      'SELECT id, username, email, password_hash, coins FROM users WHERE email = ?',
      [data.email]
    );

    if (!user) {
      return { success: false, error: 'Credenciales incorrectas' };
    }

    // Verificar contraseña
    const isPasswordValid = await verifyPassword(data.password, user.password_hash);

    if (!isPasswordValid) {
      return { success: false, error: 'Credenciales incorrectas' };
    }

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      coins: user.coins,
    };

    const token = generateToken(authUser);

    return { success: true, user: authUser, token };

  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

// Obtener usuario por ID (para verificar sesiones)
export async function getUserById(userId: number): Promise<AuthUser | null> {
  try {
    const user = await executeQuerySingle<User>(
      'SELECT id, username, email, coins FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      coins: user.coins,
    };
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

// Obtener usuario por username
export async function getUserByUsername(username: string): Promise<AuthUser | null> {
  try {
    const user = await executeQuerySingle<User>(
      'SELECT id, username, email, coins FROM users WHERE username = ?',
      [username]
    );
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      coins: user.coins,
    };
  } catch (error) {
    console.error('Get user by username error:', error);
    return null;
  }
}

// Actualizar monedas del usuario
export async function updateUserCoins(userId: number, newAmount: number): Promise<boolean> {
  try {
    await executeQuery(
      'UPDATE users SET coins = ? WHERE id = ?',
      [newAmount, userId]
    );
    return true;
  } catch (error) {
    console.error('Update coins error:', error);
    return false;
  }
}

// Middleware para verificar autenticación en rutas API
export function getAuthUserFromRequest(request: Request): AuthUser | null {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return null;
    }

    return {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      coins: 0, // Las monedas se actualizarán desde la BD cuando sea necesario
    };
  } catch (error) {
    return null;
  }
}

// Función para refrescar los datos del usuario (útil para mantener las monedas actualizadas)
export async function refreshUserData(user: AuthUser): Promise<AuthUser | null> {
  return await getUserById(user.id);
}