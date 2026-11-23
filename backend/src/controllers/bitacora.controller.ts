import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { BitacoraService, BitacoraError } from '../services/bitacora.service.js';
import { registrarBitacoraSchema, queryBitacoraSchema } from '../validators/bitacora.validator.js';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class BitacoraController {
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

  private static handleError(error: unknown, res: Response, fallbackMessage: string): void {
    if (error instanceof ZodError) {
      BitacoraController.handleZodError(error, res);
      return;
    }

    if (error instanceof BitacoraError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
      return;
    }

    const err = error as Error;
    logger.error(fallbackMessage, { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: fallbackMessage
      }
    });
  }

  /**
   * POST /api/bitacora o POST /api/ordenes/:ordenId/bitacora
   * Registra un nuevo evento o incidencia en terreno
   */
  static async registrarEvento(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const payload = {
        ...req.body,
        ordenServicioId: req.params.ordenId || req.body.ordenServicioId
      };

      const parsed = registrarBitacoraSchema.safeParse(payload);
      if (!parsed.success) {
        BitacoraController.handleZodError(parsed.error, res);
        return;
      }

      const bitacora = await BitacoraService.registrarIncidencia(parsed.data, req.user?.userId);
      res.status(201).json({
        success: true,
        data: bitacora
      });
    } catch (error) {
      BitacoraController.handleError(error, res, 'Error al registrar evento en bitácora.');
    }
  }

  /**
   * GET /api/bitacora/:ordenId
   * Consulta el timeline de incidencias de una orden
   */
  static async obtenerTimeline(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ordenId } = req.params;
      const parsedQuery = queryBitacoraSchema.safeParse(req.query);
      if (!parsedQuery.success) {
        BitacoraController.handleZodError(parsedQuery.error, res);
        return;
      }

      const timeline = await BitacoraService.obtenerTimeline(
        ordenId,
        req.user,
        parsedQuery.data
      );

      res.status(200).json({
        success: true,
        data: timeline
      });
    } catch (error) {
      BitacoraController.handleError(error, res, 'Error al consultar timeline de bitácora.');
    }
  }
}
