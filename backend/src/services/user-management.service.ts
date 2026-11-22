import { RolUsuario } from '@prisma/client';
import { UsuarioDTO, toUsuarioDTO } from './auth.service.js';
import { CryptoUtil } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../utils/prisma.js';
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

export const CambiarPasswordSchema = z.object({
  password: z.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres.')
    .refine((val) => /[A-Za-z]/.test(val) && /[0-9]/.test(val), {
      message: 'La contraseña debe contener al menos una letra y un número.'
    })
});

export const CambiarRolSchema = z.object({
  rol: z.nativeEnum(RolUsuario),
  empresaClienteId: z.string().optional().nullable()
});

export class UserManagementService {
  /**
   * Lista usuarios con filtros opcionales desde MySQL
   */
  static async listarUsuarios(filtros?: {
    rol?: RolUsuario;
    activo?: boolean;
    empresaClienteId?: string;
    busqueda?: string;
  }): Promise<UsuarioDTO[]> {
    const where: any = {};

    if (filtros) {
      if (filtros.rol) {
        where.rol = filtros.rol;
      }
      if (filtros.activo !== undefined) {
        where.activo = filtros.activo;
      }
      if (filtros.empresaClienteId) {
        where.empresaClienteId = filtros.empresaClienteId;
      }
      if (filtros.busqueda) {
        const query = filtros.busqueda.trim();
        where.OR = [
          { nombre: { contains: query } },
          { apellido: { contains: query } },
          { email: { contains: query } },
          { rut: { contains: query } }
        ];
      }
    }

    const users = await prisma.usuario.findMany({
      where,
      include: { conductor: true },
      orderBy: { createdAt: 'desc' }
    });

    return users.map(toUsuarioDTO);
  }

  /**
   * Crea un nuevo usuario persistente en MySQL
   */
  static async crearUsuario(input: unknown): Promise<UsuarioDTO> {
    const validated = CrearUsuarioSchema.parse(input);
    const emailKey = validated.email.toLowerCase().trim();

    const existing = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: emailKey },
          { rut: validated.rut.trim() }
        ]
      }
    });

    if (existing) {
      const error: any = new Error('Ya existe un usuario con este correo electrónico o RUT.');
      error.code = 'EMAIL_ALREADY_EXISTS';
      error.statusCode = 409;
      throw error;
    }

    // Asegurar que la empresa exista si se asigna un empresaClienteId
    if (validated.empresaClienteId) {
      await prisma.empresaCliente.upsert({
        where: { id: validated.empresaClienteId },
        update: {},
        create: {
          id: validated.empresaClienteId,
          rut: `RUT-${Date.now().toString().slice(-6)}`,
          razonSocial: `Empresa ${validated.empresaClienteId}`,
          tipo: 'SPOT',
          activo: true
        }
      });
    }

    const created = await prisma.usuario.create({
      data: {
        email: emailKey,
        passwordHash: CryptoUtil.hashPassword(validated.password),
        nombre: validated.nombre.trim(),
        apellido: validated.apellido.trim(),
        rut: validated.rut.trim(),
        rol: validated.rol,
        telefono: validated.telefono || null,
        activo: validated.activo !== undefined ? validated.activo : true,
        empresaClienteId: validated.empresaClienteId || null,
        conductor: validated.rol === RolUsuario.CONDUCTOR ? {
          create: {
            licenciaNumero: `LIC-${Date.now().toString().slice(-6)}`,
            licenciaClase: 'A4',
            licenciaVencimiento: new Date(Date.now() + 365 * 24 * 3600 * 1000 * 3)
          }
        } : undefined
      },
      include: { conductor: true }
    });

    logger.info('Usuario creado exitosamente', { userId: created.id, rol: created.rol, email: created.email });
    return toUsuarioDTO(created);
  }

  /**
   * Obtiene un usuario por su ID
   */
  static async obtenerUsuarioPorId(id: string): Promise<UsuarioDTO> {
    const user = await prisma.usuario.findUnique({
      where: { id },
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

  /**
   * Actualiza datos de un usuario en MySQL
   */
  static async actualizarUsuario(id: string, input: unknown): Promise<UsuarioDTO> {
    const validated = ActualizarUsuarioSchema.parse(input);
    const user = await prisma.usuario.findUnique({ where: { id } });

    if (!user) {
      const error: any = new Error('Usuario no encontrado.');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (validated.empresaClienteId) {
      await prisma.empresaCliente.upsert({
        where: { id: validated.empresaClienteId },
        update: {},
        create: {
          id: validated.empresaClienteId,
          rut: `RUT-${Date.now().toString().slice(-6)}`,
          razonSocial: `Empresa ${validated.empresaClienteId}`,
          tipo: 'SPOT',
          activo: true
        }
      });
    }

    const data: any = {};
    if (validated.nombre !== undefined) data.nombre = validated.nombre.trim();
    if (validated.apellido !== undefined) data.apellido = validated.apellido.trim();
    if (validated.telefono !== undefined) data.telefono = validated.telefono;
    if (validated.rol !== undefined) data.rol = validated.rol;
    if (validated.empresaClienteId !== undefined) data.empresaClienteId = validated.empresaClienteId;
    if (validated.activo !== undefined) data.activo = validated.activo;
    if (validated.password !== undefined) data.passwordHash = CryptoUtil.hashPassword(validated.password);

    const updated = await prisma.usuario.update({
      where: { id },
      data,
      include: { conductor: true }
    });

    logger.info('Usuario actualizado', { userId: updated.id, email: updated.email });
    return toUsuarioDTO(updated);
  }

  /**
   * Conmuta el estado de activación de una cuenta de usuario
   */
  static async cambiarEstado(id: string, activo: boolean): Promise<UsuarioDTO> {
    const user = await prisma.usuario.findUnique({ where: { id } });

    if (!user) {
      const error: any = new Error('Usuario no encontrado.');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data: { activo },
      include: { conductor: true }
    });

    logger.info(`Estado de cuenta actualizado: ${activo ? 'ACTIVADO' : 'DESHABILITADO'}`, { userId: updated.id, activo });
    return toUsuarioDTO(updated);
  }

  /**
   * Cambia la contraseña de un usuario aplicando validación Zod y hash CryptoUtil
   */
  static async cambiarPassword(id: string, input: unknown): Promise<UsuarioDTO> {
    const validated = CambiarPasswordSchema.parse(input);
    const user = await prisma.usuario.findUnique({ where: { id } });

    if (!user) {
      const error: any = new Error('Usuario no encontrado.');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const passwordHash = CryptoUtil.hashPassword(validated.password);

    const updated = await prisma.usuario.update({
      where: { id },
      data: { passwordHash },
      include: { conductor: true }
    });

    logger.info('Contraseña actualizada exitosamente', { userId: updated.id, email: updated.email });
    return toUsuarioDTO(updated);
  }

  /**
   * Modifica el rol de un usuario y gestiona dependencias como empresa cliente y perfil conductor
   */
  static async cambiarRol(id: string, input: unknown): Promise<UsuarioDTO> {
    const validated = CambiarRolSchema.parse(input);
    const user = await prisma.usuario.findUnique({
      where: { id },
      include: { conductor: true }
    });

    if (!user) {
      const error: any = new Error('Usuario no encontrado.');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const targetEmpresaId = validated.empresaClienteId ?? user.empresaClienteId;

    if (validated.rol === RolUsuario.CLIENTE && !targetEmpresaId) {
      const error: any = new Error('Los usuarios con rol CLIENTE deben estar asociados a una empresaClienteId.');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 400;
      throw error;
    }

    if (validated.rol === RolUsuario.CLIENTE && targetEmpresaId) {
      await prisma.empresaCliente.upsert({
        where: { id: targetEmpresaId },
        update: {},
        create: {
          id: targetEmpresaId,
          rut: `RUT-${Date.now().toString().slice(-6)}`,
          razonSocial: `Empresa ${targetEmpresaId}`,
          tipo: 'SPOT',
          activo: true
        }
      });
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data: {
        rol: validated.rol,
        empresaClienteId: validated.rol === RolUsuario.CLIENTE ? targetEmpresaId : null,
        conductor: validated.rol === RolUsuario.CONDUCTOR && !user.conductor ? {
          create: {
            licenciaNumero: `LIC-${Date.now().toString().slice(-6)}`,
            licenciaClase: 'A4',
            licenciaVencimiento: new Date(Date.now() + 365 * 24 * 3600 * 1000 * 3)
          }
        } : undefined
      },
      include: { conductor: true }
    });

    logger.info('Rol de usuario actualizado exitosamente', {
      userId: updated.id,
      rolAnterior: user.rol,
      rolNuevo: updated.rol
    });

    return toUsuarioDTO(updated);
  }
}
