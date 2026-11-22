import { RolUsuario, Usuario, Conductor } from '@prisma/client';
import { TokenService, TokenPayload } from './token.service.js';
import { CryptoUtil } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../utils/prisma.js';
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

export function toUsuarioDTO(user: Usuario & { conductor?: Conductor | null }): UsuarioDTO {
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    apellido: user.apellido,
    rut: user.rut,
    rol: user.rol,
    telefono: user.telefono ?? null,
    activo: user.activo,
    empresaClienteId: user.empresaClienteId ?? null,
    conductorId: user.conductor?.id ?? null
  };
}

export class AuthService {
  /**
   * Autentica un usuario con email y contraseña consultando la base de datos MySQL vía Prisma
   */
  static async login(input: unknown): Promise<AuthResult> {
    const validated = LoginSchema.parse(input);
    const emailKey = validated.email.toLowerCase().trim();

    const user = await prisma.usuario.findFirst({
      where: { email: emailKey },
      include: { conductor: true }
    });

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

    const usuario = toUsuarioDTO(user);
    const payload: TokenPayload = {
      userId: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      empresaClienteId: usuario.empresaClienteId ?? null,
      conductorId: usuario.conductorId ?? null
    };

    const accessToken = TokenService.generateAccessToken(payload);
    const refreshToken = TokenService.generateRefreshToken(payload);

    logger.info('Inicio de sesión exitoso', { userId: usuario.id, rol: usuario.rol, email: usuario.email });

    return {
      usuario,
      accessToken,
      refreshToken
    };
  }

  /**
   * Refresca sesión con token de refresco válido y usuario activo en MySQL
   */
  static async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; usuario: UsuarioDTO }> {
    if (!refreshToken) {
      const error: any = new Error('Token de refresco requerido.');
      error.code = 'TOKEN_REQUIRED';
      error.statusCode = 401;
      throw error;
    }

    const decoded = TokenService.verifyRefreshToken(refreshToken);
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: { conductor: true }
    });

    if (!user || !user.activo) {
      const error: any = new Error('Usuario inválido o cuenta desactivada.');
      error.code = 'ACCOUNT_DISABLED';
      error.statusCode = 403;
      throw error;
    }

    const usuario = toUsuarioDTO(user);
    const payload: TokenPayload = {
      userId: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      empresaClienteId: usuario.empresaClienteId ?? null,
      conductorId: usuario.conductorId ?? null
    };

    const newAccessToken = TokenService.generateAccessToken(payload);
    const newRefreshToken = TokenService.generateRefreshToken(payload);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, usuario };
  }

  /**
   * Obtiene el perfil del usuario autenticado directamente desde MySQL
   */
  static async getProfile(userId: string): Promise<UsuarioDTO> {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { conductor: true }
    });

    if (!user) {
      const error: any = new Error('Usuario no encontrado.');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    return toUsuarioDTO(user);
  }
}
