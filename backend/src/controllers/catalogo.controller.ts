import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { CatalogoService } from '../services/catalogo.service.js';
import { logger } from '../utils/logger.js';

export class CatalogoController {
  /**
   * GET /api/planning/catalogo-servicios
   * Retorna los servicios de catálogo activos.
   */
  static async listarServicios(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const servicios = await CatalogoService.listarServiciosActivos();
      res.status(200).json({
        success: true,
        data: servicios
      });
    } catch (error) {
      logger.error('Error al listar catálogo de servicios', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: {
          code: 'CATALOG_ERROR',
          message: 'Error al obtener el catálogo de servicios.'
        }
      });
    }
  }

  /**
   * GET /api/planning/plantas-destino
   * Retorna las plantas de descarga autorizadas activas.
   */
  static async listarPlantas(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const plantas = await CatalogoService.listarPlantasDestinoActivas();
      res.status(200).json({
        success: true,
        data: plantas
      });
    } catch (error) {
      logger.error('Error al listar plantas de destino', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: {
          code: 'DESTINATIONS_ERROR',
          message: 'Error al obtener las plantas de destino.'
        }
      });
    }
  }
}
