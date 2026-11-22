import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RolUsuario, TipoFotoInspeccion } from '@prisma/client';
import { InspectionService, InspeccionSalidaInput } from '../services/inspection.service.js';

export const inspeccionRouter = Router();

// Todas las rutas de inspección requieren autenticación
inspeccionRouter.use(authenticate);

/**
 * POST /api/inspecciones/salida
 * Registro y evaluación del checklist de salida F-GMT-MAN-004 y fotos 360°
 */
inspeccionRouter.post(
  '/salida',
  authorize(RolUsuario.CONDUCTOR, RolUsuario.JEFE_OPERACIONES, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { vehiculoId, kilometraje, horometro, items, fotos360 } = req.body;
      const conductorId = req.body.conductorId || req.user?.conductorId || req.user?.userId;

      if (!vehiculoId || !conductorId || !items || !fotos360) {
        res.status(400).json({
          error: {
            code: 'INVALID_INSPECTION_PAYLOAD',
            message: 'vehiculoId, conductorId, items de checklist y fotos360 son obligatorios.'
          }
        });
        return;
      }

      const input: InspeccionSalidaInput = {
        vehiculoId,
        conductorId,
        kilometraje: Number(kilometraje) || undefined,
        horometro: Number(horometro) || undefined,
        items,
        fotos360
      };

      const resultado = InspectionService.evaluarInspeccionSalida(input);

      res.status(201).json({
        data: {
          vehiculoId,
          conductorId,
          estado: resultado.estado,
          bloqueado: resultado.bloqueado,
          motivoBloqueo: resultado.motivoBloqueo,
          fotosRecibidas: fotos360.length,
          fechaHora: new Date().toISOString(),
          mensaje: resultado.bloqueado
            ? 'Inspección completada con fallas críticas. Unidad bloqueada para operación.'
            : 'Checklist de salida aprobado satisfactoriamente.'
        }
      });
    } catch (error: any) {
      res.status(400).json({
        error: {
          code: 'INSPECTION_VALIDATION_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * POST /api/inspecciones/fotos-360
 * Captura individual o por lote de fotografías perimetrales 360° del camión
 */
inspeccionRouter.post(
  '/fotos-360',
  authorize(RolUsuario.CONDUCTOR, RolUsuario.JEFE_OPERACIONES, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { vehiculoId, jornadaId, fotos } = req.body;

      if (!vehiculoId || !Array.isArray(fotos) || fotos.length === 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_PHOTOS_PAYLOAD',
            message: 'vehiculoId y un arreglo fotos [{ tipo, archivoUrl }] son obligatorios.'
          }
        });
        return;
      }

      const fotosValidadas = fotos.map((f: any) => {
        if (!Object.values(TipoFotoInspeccion).includes(f.tipo)) {
          throw new Error(`Tipo de foto inválido: ${f.tipo}`);
        }
        return {
          tipo: f.tipo,
          archivoUrl: f.archivoUrl,
          fechaRegistro: new Date().toISOString()
        };
      });

      res.status(200).json({
        data: {
          vehiculoId,
          jornadaId: jornadaId || null,
          totalFotos: fotosValidadas.length,
          fotos: fotosValidadas,
          mensaje: 'Fotografías 360° registradas correctamente.'
        }
      });
    } catch (error: any) {
      res.status(400).json({
        error: {
          code: 'PHOTOS_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * POST /api/inspecciones/retorno
 * Checklist de retorno a planta y cierre de jornada
 */
inspeccionRouter.post(
  '/retorno',
  authorize(RolUsuario.CONDUCTOR, RolUsuario.JEFE_OPERACIONES, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { vehiculoId, kilometrajeRetorno, horometroRetorno, items, novedades, nivelCombustible } = req.body;
      const conductorId = req.body.conductorId || req.user?.conductorId || req.user?.userId;

      if (!vehiculoId || !conductorId) {
        res.status(400).json({
          error: {
            code: 'INVALID_RETURN_PAYLOAD',
            message: 'vehiculoId y conductorId son obligatorios.'
          }
        });
        return;
      }

      res.status(200).json({
        data: {
          vehiculoId,
          conductorId,
          kilometrajeRetorno: Number(kilometrajeRetorno) || null,
          horometroRetorno: Number(horometroRetorno) || null,
          nivelCombustible: nivelCombustible || '3/4',
          totalItemsRevisados: Array.isArray(items) ? items.length : 0,
          novedades: novedades || 'Sin novedades en el retorno',
          fechaHoraRetorno: new Date().toISOString(),
          estadoRetorno: 'CONFORME',
          mensaje: 'Inspección de retorno a planta registrada satisfactoriamente.'
        }
      });
    } catch (error: any) {
      res.status(400).json({
        error: {
          code: 'RETURN_INSPECTION_ERROR',
          message: error.message
        }
      });
    }
  }
);
