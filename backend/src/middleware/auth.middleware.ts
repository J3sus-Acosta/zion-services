import { Request, Response, NextFunction } from 'express';
import { TokenService, TokenPayload } from '../services/token.service.js';
import { RolUsuario } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

// 1. Middleware de Autenticación JWT via Cookies HTTP-Only o Bearer Header
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Acceso no autorizado: token no proporcionado.'
      }
    });
    return;
  }

  try {
    const payload = TokenService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    logger.warn('Token inválido o expirado', { error: (error as Error).message });
    res.status(401).json({
      error: {
        code: 'TOKEN_EXPIRED_OR_INVALID',
        message: 'Sesión expirada o token inválido.'
      }
    });
  }
}

// 2. Middleware de Autorización RBAC
export function authorize(...rolesPermitidos: RolUsuario[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' }
      });
      return;
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      logger.warn('Acceso denegado por rol insuficiente', {
        userId: req.user.userId,
        rolUsuario: req.user.rol,
        rolesPermitidos
      });
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'No posee los permisos necesarios para realizar esta acción.'
        }
      });
      return;
    }

    next();
  };
}

// 3. Middleware de Tenant Isolation (Aislamiento Estricto de Clientes)
export function enforceTenantIsolation(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } });
    return;
  }

  // Si es usuario con rol CLIENTE, solo puede ver y operar sobre su propia empresa
  if (req.user.rol === RolUsuario.CLIENTE) {
    const targetEmpresaId = req.params.empresaClienteId || req.body?.empresaClienteId || req.query?.empresaClienteId;
    if (targetEmpresaId && targetEmpresaId !== req.user.empresaClienteId) {
      logger.error('Intento de violación de Tenant Isolation detectado', {
        userId: req.user.userId,
        clienteAutenticado: req.user.empresaClienteId,
        empresaObjetivo: targetEmpresaId
      });
      res.status(403).json({
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
