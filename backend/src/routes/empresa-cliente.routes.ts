import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RolUsuario } from '@prisma/client';
import { ClienteController } from '../controllers/cliente.controller.js';

export const empresaClienteRouter = Router();

// Middleware de autenticación global para empresas clientes
empresaClienteRouter.use(authenticate);

/**
 * Middleware para validar Tenant Isolation en acceso individual de CLIENTE
 */
function checkClienteTenant(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.user?.rol === RolUsuario.CLIENTE) {
    if (req.params.id !== req.user.empresaClienteId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ISOLATION_VIOLATION',
          message: 'Acceso denegado: no puede acceder a información de otra empresa cliente.'
        }
      });
      return;
    }
  }
  next();
}

// 1. GET /api/empresas-clientes - Listar empresas
empresaClienteRouter.get(
  '/',
  authorize(
    RolUsuario.SUPERADMIN,
    RolUsuario.ADMIN,
    RolUsuario.JEFE_OPERACIONES,
    RolUsuario.OPERACIONES,
    RolUsuario.COMERCIAL
  ),
  ClienteController.listarEmpresas
);

// 2. GET /api/empresas-clientes/:id - Detalle de empresa con sucursales
empresaClienteRouter.get(
  '/:id',
  authorize(
    RolUsuario.SUPERADMIN,
    RolUsuario.ADMIN,
    RolUsuario.JEFE_OPERACIONES,
    RolUsuario.OPERACIONES,
    RolUsuario.COMERCIAL,
    RolUsuario.CLIENTE
  ),
  checkClienteTenant,
  ClienteController.obtenerEmpresaPorId
);

// 3. POST /api/empresas-clientes - Crear empresa cliente
empresaClienteRouter.post(
  '/',
  authorize(
    RolUsuario.SUPERADMIN,
    RolUsuario.ADMIN,
    RolUsuario.JEFE_OPERACIONES,
    RolUsuario.COMERCIAL
  ),
  ClienteController.crearEmpresa
);

// 4. PUT /api/empresas-clientes/:id - Actualizar empresa cliente
empresaClienteRouter.put(
  '/:id',
  authorize(
    RolUsuario.SUPERADMIN,
    RolUsuario.ADMIN,
    RolUsuario.JEFE_OPERACIONES,
    RolUsuario.COMERCIAL
  ),
  ClienteController.actualizarEmpresa
);

// 5. DELETE /api/empresas-clientes/:id - Desactivar (soft-delete) empresa cliente
empresaClienteRouter.delete(
  '/:id',
  authorize(RolUsuario.SUPERADMIN, RolUsuario.ADMIN),
  ClienteController.eliminarEmpresa
);
