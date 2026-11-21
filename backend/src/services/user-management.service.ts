import { RolUsuario } from '@prisma/client';
import { AuthService, UsuarioDTO } from './auth.service.js';
import { CryptoUtil } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const CrearUsuarioSchema = z.object({
  email: z.string().email('Formato de correo inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(2, 'El nombre es requerido'),
  apellido: z.string().min(2, 'El apellido es requerido'),
  rut: z.string().min(3, 'RUT inválido'),
  rol: z.nativeEnum(RolUsuario),
  telefono: z.string().optional().nullable(),
  empresaClienteId: z.string().optional().nullable(),
  activo: z.boolean().default(true)
}).refine(data => {
  if (data.rol === RolUsuario.CLIENTE && !data.empresaClienteId) {
    return false;
  }
  return true;
}, {
  message: 'Los usuarios con rol CLIENTE deben estar asociados a una empresaClienteId.',
  path: ['empresaClienteId']
});

export const ActualizarUsuarioSchema = z.object({
  nombre: z.string().min(2).optional(),
  apellido: z.string().min(2).optional(),
  telefono: z.string().optional().nullable(),
  rol: z.nativeEnum(RolUsuario).optional(),
  empresaClienteId: z.string().optional().nullable(),
  activo: z.boolean().optional(),
  password: z.string().min(6).optional()
});

export class UserManagementService {
  /**
   * Lista usuarios con filtros opcionales
   */
  static async listarUsuarios(filtros?: {
    rol?: RolUsuario;
    activo?: boolean;
    empresaClienteId?: string;
    busqueda?: string;
  }): Promise<UsuarioDTO[]> {
    const store = AuthService.getUsersStore();
    let usuarios = Array.from(store.values());

    if (filtros) {
      if (filtros.rol) {
        usuarios = usuarios.filter(u => u.rol === filtros.rol);
      }
      if (filtros.activo !== undefined) {
        usuarios = usuarios.filter(u => u.activo === filtros.activo);
      }
      if (filtros.empresaClienteId) {
        usuarios = usuarios.filter(u => u.empresaClienteId === filtros.empresaClienteId);
      }
      if (filtros.busqueda) {
        const query = filtros.busqueda.toLowerCase();
        usuarios = usuarios.filter(u =>
          u.nombre.toLowerCase().includes(query) ||
          u.apellido.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.rut.toLowerCase().includes(query)
        );
      }
    }

    return usuarios.map(({ passwordHash: _, ...u }) => u);
  }

  /**
   * Crea un nuevo usuario en la plataforma
   */
  static async crearUsuario(input: unknown): Promise<UsuarioDTO> {
    const validated = CrearUsuarioSchema.parse(input);
    const store = AuthService.getUsersStore();
    const emailKey = validated.email.toLowerCase().trim();

    if (store.has(emailKey)) {
      const error: any = new Error('Ya existe un usuario con este correo electrónico.');
      error.code = 'EMAIL_ALREADY_EXISTS';
      error.statusCode = 409;
      throw error;
    }

    const nuevoUsuario = {
      id: `usr-${Date.now()}`,
      email: validated.email.trim(),
      passwordHash: CryptoUtil.hashPassword(validated.password),
      nombre: validated.nombre.trim(),
      apellido: validated.apellido.trim(),
      rut: validated.rut.trim(),
      rol: validated.rol,
      telefono: validated.telefono || null,
      activo: validated.activo !== undefined ? validated.activo : true,
      empresaClienteId: validated.empresaClienteId || null,
      conductorId: validated.rol === RolUsuario.CONDUCTOR ? `cond-${Date.now()}` : null
    };

    store.set(emailKey, nuevoUsuario);
    logger.info('Usuario creado exitosamente', { userId: nuevoUsuario.id, rol: nuevoUsuario.rol, email: nuevoUsuario.email });

    const { passwordHash: _, ...usuarioDto } = nuevoUsuario;
    return usuarioDto;
  }

  /**
   * Actualiza datos de un usuario existente
   */
  static async actualizarUsuario(id: string, input: unknown): Promise<UsuarioDTO> {
    const validated = ActualizarUsuarioSchema.parse(input);
    const store = AuthService.getUsersStore();
    const user = Array.from(store.values()).find(u => u.id === id);

    if (!user) {
      const error: any = new Error('Usuario no encontrado.');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (validated.nombre) user.nombre = validated.nombre.trim();
    if (validated.apellido) user.apellido = validated.apellido.trim();
    if (validated.telefono !== undefined) user.telefono = validated.telefono;
    if (validated.rol) user.rol = validated.rol;
    if (validated.empresaClienteId !== undefined) user.empresaClienteId = validated.empresaClienteId;
    if (validated.activo !== undefined) user.activo = validated.activo;
    if (validated.password) user.passwordHash = CryptoUtil.hashPassword(validated.password);

    store.set(user.email.toLowerCase(), user);
    logger.info('Usuario actualizado', { userId: user.id, email: user.email });

    const { passwordHash: _, ...usuarioDto } = user;
    return usuarioDto;
  }

  /**
   * Conmuta el estado de activación de una cuenta de usuario
   */
  static async cambiarEstado(id: string, activo: boolean): Promise<UsuarioDTO> {
    const store = AuthService.getUsersStore();
    const user = Array.from(store.values()).find(u => u.id === id);

    if (!user) {
      const error: any = new Error('Usuario no encontrado.');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    user.activo = activo;
    store.set(user.email.toLowerCase(), user);
    logger.info(`Estado de cuenta actualizado: ${activo ? 'ACTIVADO' : 'DESHABILITADO'}`, { userId: user.id, activo });

    const { passwordHash: _, ...usuarioDto } = user;
    return usuarioDto;
  }
}
