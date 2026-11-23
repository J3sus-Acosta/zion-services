import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RolUsuario } from '@prisma/client';
import { ClienteController } from '../controllers/cliente.controller.js';
import { prisma } from '../utils/prisma.js';

export const sucursalRouter = Router();

// Middleware de autenticación global para sucursales
sucursalRouter.use(authenticate);

/**
 * Middleware para aislar búsquedas de sucursales si el usuario es CLIENTE
 */
function restrictClienteSucursales(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (req.user?.rol === RolUsuario.CLIENTE) {
    req.query.empresaClienteId = req.user.empresaClienteId || '__UNASSIGNED__';
  }
  next();
}

/**
 * Middleware para verificar Tenant Isolation en detalle de sucursal
 */
async function checkSucursalTenant(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  if (req.user?.rol === RolUsuario.CLIENTE) {
    const sucursal = await prisma.sucursalFaena.findUnique({
      where: { id: req.params.id },
      select: { empresaClienteId: true }
    });
    if (sucursal && sucursal.empresaClienteId !== req.user.empresaClienteId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ISOLATION_VIOLATION',
          message: 'Acceso denegado: no puede acceder a sucursales de otra empresa cliente.'
        }
      });
      return;
    }
  }
  next();
}

// 1. GET /api/sucursales - Listar sucursales
sucursalRouter.get(
  '/',
  authorize(
    RolUsuario.SUPERADMIN,
    RolUsuario.ADMIN,
    RolUsuario.JEFE_OPERACIONES,
    RolUsuario.OPERACIONES,
    RolUsuario.COMERCIAL,
    RolUsuario.CLIENTE
  ),
  restrictClienteSucursales,
  ClienteController.listarSucursales
);

// 2. GET /api/sucursales/:id - Detalle de sucursal
sucursalRouter.get(
  '/:id',
  authorize(
    RolUsuario.SUPERADMIN,
    RolUsuario.ADMIN,
    RolUsuario.JEFE_OPERACIONES,
    RolUsuario.OPERACIONES,
    RolUsuario.COMERCIAL,
    RolUsuario.CLIENTE
  ),
  checkSucursalTenant,
  ClienteController.obtenerSucursalPorId
);

// 3. POST /api/sucursales - Crear sucursal faena
sucursalRouter.post(
  '/',
  authorize(
    RolUsuario.SUPERADMIN,
    RolUsuario.ADMIN,
    RolUsuario.JEFE_OPERACIONES,
    RolUsuario.COMERCIAL
  ),
  ClienteController.crearSucursal
);

// 4. PUT /api/sucursales/:id - Actualizar sucursal faena
sucursalRouter.put(
  '/:id',
  authorize(
    RolUsuario.SUPERADMIN,
    RolUsuario.ADMIN,
    RolUsuario.JEFE_OPERACIONES,
    RolUsuario.COMERCIAL
  ),
  ClienteController.actualizarSucursal
);

// 5. DELETE /api/sucursales/:id - Desactivar (soft-delete) sucursal faena
sucursalRouter.delete(
  '/:id',
  authorize(RolUsuario.SUPERADMIN, RolUsuario.ADMIN),
  ClienteController.eliminarSucursal
);
