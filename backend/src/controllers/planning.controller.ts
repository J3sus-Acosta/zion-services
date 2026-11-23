import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { PlanningService } from '../services/planning.service.js';
import { ConflictError } from '../services/planning-conflict.service.js';
import {
  agendaQuerySchema,
  solicitudMultiAtencionSchema,
  asignarAtencionSchema,
  reasignarAtencionSchema
} from '../validators/planning.validator.js';
import { RolUsuario } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class PlanningController {
  /**
   * Helper para formatear errores Zod consistentes
   */
  private static handleZodError(error: ZodError, res: Response): void {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.errors[0]?.message || 'Error de validación de datos de entrada.',
        details: error.errors.map((e) => ({
          campo: e.path.join('.'),
          mensaje: e.message
        }))
      }
    });
  }

  /**
   * GET /api/planning/agenda
   * Consulta el calendario operativo filtrado por rango temporal.
   */
  static async getAgenda(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const parsedQuery = agendaQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        PlanningController.handleZodError(parsedQuery.error, res);
        return;
      }

      const agenda = await PlanningService.obtenerAgenda(parsedQuery.data);
      res.status(200).json({
        success: true,
        data: agenda
      });
    } catch (error) {
      logger.error('Error al obtener agenda de planificación', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: {
          code: 'PLANNING_AGENDA_ERROR',
          message: 'Error al consultar la agenda de servicios.'
        }
      });
    }
  }

  /**
   * POST /api/planning/solicitudes-multi
   * Registra una solicitud agrupando múltiples atenciones programadas.
   */
  static async crearSolicitudMulti(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const parsedBody = solicitudMultiAtencionSchema.safeParse(req.body);
      if (!parsedBody.success) {
        PlanningController.handleZodError(parsedBody.error, res);
        return;
      }

      const input = parsedBody.data;

      // Tenant Isolation: Clientes solo pueden crear solicitudes para su propia empresa
      if (req.user?.rol === RolUsuario.CLIENTE) {
        if (!req.user.empresaClienteId || req.user.empresaClienteId !== input.empresaClienteId) {
          logger.warn('Violación de Tenant Isolation en solicitud multi-atención', {
            userId: req.user.userId,
            clienteAutenticado: req.user.empresaClienteId,
            empresaObjetivo: input.empresaClienteId
          });
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'No está autorizado para emitir solicitudes para otra empresa cliente.'
            }
          });
          return;
        }
      }

      const operador = {
        id: req.user?.userId,
        rol: req.user?.rol
      };

      const data = await PlanningService.crearSolicitudMultiAtencion(input, operador, req.ip);

      res.status(201).json({
        success: true,
        message: 'Solicitud multi-atención creada exitosamente',
        data
      });
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code || (error.statusCode === 404 ? 'NOT_FOUND' : 'ERROR'),
            message: error.message
          }
        });
        return;
      }

      logger.error('Error al crear solicitud multi-atención', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'PLANNING_MULTI_REQUEST_ERROR',
          message: 'Error al procesar la solicitud multi-atención.'
        }
      });
    }
  }

  /**
   * PUT /api/planning/atenciones/:id/asignar
   * Asigna recursos operativos a una atención programada.
   */
  static async asignarAtencion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const atencionId = req.params.id;
      if (!atencionId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAM', message: 'ID de atención programada requerido.' }
        });
        return;
      }

      const parsedBody = asignarAtencionSchema.safeParse(req.body);
      if (!parsedBody.success) {
        PlanningController.handleZodError(parsedBody.error, res);
        return;
      }

      const operador = {
        id: req.user?.userId,
        rol: req.user?.rol
      };

      const resultado = await PlanningService.asignarAtencion(atencionId, parsedBody.data, operador, req.ip);

      res.status(200).json({
        success: true,
        message: 'Atención programada y confirmada exitosamente',
        data: resultado
      });
    } catch (error: any) {
      if (error instanceof ConflictError) {
        if (error.code === 'ERROR_SOLAPAMIENTO_HORARIO') {
          res.status(409).json({
            success: false,
            code: 'ERROR_SOLAPAMIENTO_HORARIO',
            message: error.message,
            conflictos: error.conflictos
          });
          return;
        }

        if (error.code === 'WARNING_INTERVALO_TRASLADO') {
          res.status(409).json({
            success: false,
            code: 'WARNING_INTERVALO_TRASLADO',
            message: error.message,
            detalles: error.detalles
          });
          return;
        }
      }

      if (error.statusCode) {
        res.status(error.statusCode).json({
          success: false,
          error: { code: error.code || 'ERROR', message: error.message }
        });
        return;
      }

      logger.error('Error al asignar atención programada', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'PLANNING_ASSIGN_ERROR',
          message: 'Error interno al asignar recursos a la atención.'
        }
      });
    }
  }

  /**
   * PUT /api/planning/atenciones/:id/reasignar
   * Modifica asignación de recursos o reprograma horario de una atención.
   */
  static async reasignarAtencion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const atencionId = req.params.id;
      if (!atencionId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAM', message: 'ID de atención programada requerido.' }
        });
        return;
      }

      const parsedBody = reasignarAtencionSchema.safeParse(req.body);
      if (!parsedBody.success) {
        PlanningController.handleZodError(parsedBody.error, res);
        return;
      }

      const operador = {
        id: req.user?.userId,
        rol: req.user?.rol
      };

      const resultado = await PlanningService.reasignarAtencion(atencionId, parsedBody.data, operador, req.ip);

      res.status(200).json({
        success: true,
        message: 'Atención reasignada exitosamente',
        data: resultado
      });
    } catch (error: any) {
      if (error instanceof ConflictError) {
        if (error.code === 'ERROR_SOLAPAMIENTO_HORARIO') {
          res.status(409).json({
            success: false,
            code: 'ERROR_SOLAPAMIENTO_HORARIO',
            message: error.message,
            conflictos: error.conflictos
          });
          return;
        }

        if (error.code === 'WARNING_INTERVALO_TRASLADO') {
          res.status(409).json({
            success: false,
            code: 'WARNING_INTERVALO_TRASLADO',
            message: error.message,
            detalles: error.detalles
          });
          return;
        }
      }

      if (error.statusCode) {
        res.status(error.statusCode).json({
          success: false,
          error: { code: error.code || 'ERROR', message: error.message }
        });
        return;
      }

      logger.error('Error al reasignar atención programada', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'PLANNING_REASSIGN_ERROR',
          message: 'Error interno al reasignar recursos a la atención.'
        }
      });
    }
  }
}
