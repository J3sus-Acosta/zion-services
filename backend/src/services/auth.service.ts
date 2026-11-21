import { RolUsuario } from '@prisma/client';
import { TokenService, TokenPayload } from './token.service.js';
import { CryptoUtil } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Formato de correo inválido'),
  password: z.string().min(1, 'La contraseña es requerida')
});

export interface UsuarioDTO {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rut: string;
  rol: RolUsuario;
  telefono?: string | null;
  activo: boolean;
  empresaClienteId?: string | null;
  conductorId?: string | null;
}

export interface AuthResult {
  usuario: UsuarioDTO;
  accessToken: string;
  refreshToken: string;
}

// Repositorio en memoria precargado para pruebas y desarrollo
const INITIAL_USERS: (UsuarioDTO & { passwordHash: string })[] = [
  {
    id: 'usr-superadmin-01',
    email: 'superadmin@zion.cl',
    passwordHash: CryptoUtil.hashPassword('SuperAdmin2026!'),
    nombre: 'Super',
    apellido: 'Administrador',
    rut: '1-9',
    rol: RolUsuario.SUPERADMIN,
    activo: true
  },
  {
    id: 'usr-admin-01',
    email: 'admin@zion.cl',
    passwordHash: CryptoUtil.hashPassword('Admin2026!'),
    nombre: 'Administrador',
    apellido: 'Zion',
    rut: '2-7',
    rol: RolUsuario.ADMIN,
    activo: true
  },
  {
    id: 'usr-jefe-ops-01',
    email: 'operaciones@zion.cl',
    passwordHash: CryptoUtil.hashPassword('Ops2026!'),
    nombre: 'Jefe',
    apellido: 'Operaciones',
    rut: '3-5',
    rol: RolUsuario.JEFE_OPERACIONES,
    activo: true
  },
  {
    id: 'usr-conductor-01',
    email: 'conductor@zion.cl',
    passwordHash: CryptoUtil.hashPassword('Conductor2026!'),
    nombre: 'Carlos',
    apellido: 'Sánchez',
    rut: '4-3',
    rol: RolUsuario.CONDUCTOR,
    conductorId: 'cond-01',
    activo: true
  },
  {
    id: 'usr-cliente-01',
    email: 'cliente@horse.cl',
    passwordHash: CryptoUtil.hashPassword('Cliente2026!'),
    nombre: 'Contacto',
    apellido: 'Horse Chile',
    rut: '5-1',
    rol: RolUsuario.CLIENTE,
    empresaClienteId: 'empresa-horse',
    activo: true
  },
  {
    id: 'usr-cliente-inactivo',
    email: 'inactivo@cliente.cl',
    passwordHash: CryptoUtil.hashPassword('Inactivo2026!'),
    nombre: 'Usuario',
    apellido: 'Inactivo',
    rut: '6-K',
    rol: RolUsuario.CLIENTE,
    empresaClienteId: 'empresa-horse',
    activo: false
  }
];

export class AuthService {
  private static usersStore = new Map<string, UsuarioDTO & { passwordHash: string }>(
    INITIAL_USERS.map(u => [u.email.toLowerCase(), { ...u }])
  );

  static getUsersStore() {
    return this.usersStore;
  }

  /**
   * Autentica un usuario con email y contraseña, verificando estado activo
   */
  static async login(input: unknown): Promise<AuthResult> {
    const validated = LoginSchema.parse(input);
    const emailKey = validated.email.toLowerCase().trim();

    const user = this.usersStore.get(emailKey);
    if (!user) {
      logger.warn('Intento de login fallido: usuario no encontrado', { email: validated.email });
      const error: any = new Error('Credenciales incorrectas o usuario no registrado.');
      error.code = 'INVALID_CREDENTIALS';
      error.statusCode = 401;
      throw error;
    }

    if (!user.activo) {
      logger.warn('Intento de login con cuenta inactiva o deshabilitada', { email: validated.email, userId: user.id });
      const error: any = new Error('Su cuenta se encuentra inactiva o deshabilitada. Contacte al Administrador.');
      error.code = 'ACCOUNT_DISABLED';
      error.statusCode = 403;
      throw error;
    }

    const passwordOk = CryptoUtil.verifyPassword(validated.password, user.passwordHash);
    if (!passwordOk) {
      logger.warn('Intento de login fallido: contraseña incorrecta', { email: validated.email });
      const error: any = new Error('Credenciales incorrectas o usuario no registrado.');
      error.code = 'INVALID_CREDENTIALS';
      error.statusCode = 401;
      throw error;
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      rol: user.rol,
      empresaClienteId: user.empresaClienteId || null,
      conductorId: user.conductorId || null
    };

    const accessToken = TokenService.generateAccessToken(payload);
    const refreshToken = TokenService.generateRefreshToken(payload);

    const { passwordHash: _, ...usuario } = user;
    logger.info('Inicio de sesión exitoso', { userId: user.id, rol: user.rol, email: user.email });

    return {
      usuario,
      accessToken,
      refreshToken
    };
  }

  /**
   * Refresca sesión con token de refresco válido
   */
  static async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; usuario: UsuarioDTO }> {
    if (!refreshToken) {
      const error: any = new Error('Token de refresco requerido.');
      error.code = 'TOKEN_REQUIRED';
      error.statusCode = 401;
      throw error;
    }

    const decoded = TokenService.verifyRefreshToken(refreshToken);
    const user = Array.from(this.usersStore.values()).find(u => u.id === decoded.userId);

    if (!user || !user.activo) {
      const error: any = new Error('Usuario inválido o cuenta desactivada.');
      error.code = 'ACCOUNT_DISABLED';
      error.statusCode = 403;
      throw error;
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      rol: user.rol,
      empresaClienteId: user.empresaClienteId || null,
      conductorId: user.conductorId || null
    };

    const newAccessToken = TokenService.generateAccessToken(payload);
    const newRefreshToken = TokenService.generateRefreshToken(payload);

    const { passwordHash: _, ...usuario } = user;
    return { accessToken: newAccessToken, refreshToken: newRefreshToken, usuario };
  }

  /**
   * Obtiene el perfil del usuario autenticado
   */
  static async getProfile(userId: string): Promise<UsuarioDTO> {
    const user = Array.from(this.usersStore.values()).find(u => u.id === userId);
    if (!user) {
      const error: any = new Error('Usuario no encontrado.');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }
    const { passwordHash: _, ...usuario } = user;
    return usuario;
  }
}
