import { Router, Response, NextFunction } from 'express';
import { RolUsuario } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../utils/prisma.js';

export const conductorRouter = Router();

conductorRouter.use(authenticate);

const ROLES_GESTION: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.ADMIN,
  RolUsuario.JEFE_OPERACIONES
];

/**
 * GET /api/conductores/notificaciones
 * Consultar notificaciones del conductor autenticado
 */
conductorRouter.get(
  '/notificaciones',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const leidaQuery = req.query.leida;
      const leida =
        leidaQuery === 'true' ? true : leidaQuery === 'false' ? false : undefined;

      const where: Prisma.NotificacionConductorWhereInput = {};
      if (leida !== undefined) {
        where.leida = leida;
      }

      // Si es CONDUCTOR, forzar filtrado estricto por su propio usuarioId
      if (req.user?.rol === RolUsuario.CONDUCTOR) {
        where.conductorId = req.user.userId;
      } else if (req.user?.rol && ROLES_GESTION.includes(req.user.rol)) {
        // Roles de gestión pueden consultar de un conductor específico vía query o las suyas
        if (req.query.conductorId) {
          where.conductorId = String(req.query.conductorId);
        }
      } else {
        // Otros roles (CLIENTE, COMERCIAL, OPERACIONES) no tienen acceso a notificaciones de conductor
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'No posee los permisos necesarios para acceder a las notificaciones de conductor.'
          }
        });
        return;
      }

      const notificaciones = await prisma.notificacionConductor.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json({ data: { notificaciones } });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/conductores/notificaciones/:id/leida
 * Marcar una notificación in-app como leída
 */
conductorRouter.patch(
  '/notificaciones/:id/leida',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const notificacion = await prisma.notificacionConductor.findUnique({
        where: { id }
      });

      if (!notificacion) {
        res.status(404).json({
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Notificación no encontrada.'
          }
        });
        return;
      }

      // Conductor solo puede marcar sus propias notificaciones
      if (
        req.user?.rol === RolUsuario.CONDUCTOR &&
        notificacion.conductorId !== req.user.userId
      ) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'No tiene permisos para modificar una notificación asignada a otro conductor.'
          }
        });
        return;
      }

      const actualizada = await prisma.notificacionConductor.update({
        where: { id },
        data: { leida: true }
      });

      res.status(200).json({ data: { notificacion: actualizada } });
    } catch (error) {
      next(error);
    }
  }
);
