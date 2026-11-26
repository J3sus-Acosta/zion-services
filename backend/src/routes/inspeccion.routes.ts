import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RolUsuario } from '@prisma/client';
import { InspectionService, InspeccionSalidaInput } from '../services/inspection.service.js';
import { FleetService, FleetError } from '../services/fleet.service.js';

export const inspeccionRouter = Router();

// Todas las rutas de inspección requieren autenticación
inspeccionRouter.use(authenticate);

/**
 * POST /api/inspecciones/salida
 * Registro y evaluación del checklist de salida F-GMT-MAN-004 y fotos 360° con persistencia física y en MySQL
 */
inspeccionRouter.post(
  '/salida',
  authorize(RolUsuario.CONDUCTOR, RolUsuario.JEFE_OPERACIONES, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { vehiculoId, kilometraje, horometro, items, fotos360, observaciones } = req.body;
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

      // Tarea 3.3: assertDespachable antes de evaluar
      await FleetService.assertDespachable(vehiculoId);

      const input: InspeccionSalidaInput = {
        vehiculoId,
        conductorId,
        kilometraje: Number(kilometraje) || undefined,
        horometro: Number(horometro) || undefined,
        items,
        fotos360,
        observaciones
      };

      const { inspeccion, evaluacion } = await InspectionService.registrarInspeccionSalida(
        input,
        { userId: req.user?.userId, ip: req.ip }
      );

      res.status(201).json({
        data: {
          id: inspeccion.id,
          vehiculoId: inspeccion.vehiculoId,
          conductorId: inspeccion.conductorId,
          estado: inspeccion.estado,
          bloqueado: evaluacion.bloqueado,
          motivoBloqueo: evaluacion.motivoBloqueo,
          fotosRecibidas: inspeccion.fotos360.length,
          fotos360: inspeccion.fotos360,
          fechaHora: inspeccion.fechaHora.toISOString(),
          mensaje: evaluacion.bloqueado
            ? 'Inspección completada con fallas críticas. Unidad bloqueada para operación.'
            : 'Checklist de salida aprobado satisfactoriamente.'
        }
      });
    } catch (error: any) {
      if (error instanceof FleetError || error.statusCode) {
        res.status(error.statusCode).json({
          error: {
            code: error.code || 'FLEET_ERROR',
            message: error.message
          }
        });
        return;
      }

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
 * Captura individual o por lote de fotografías perimetrales 360° del camión con persistencia física en disco
 */
inspeccionRouter.post(
  '/fotos-360',
  authorize(RolUsuario.CONDUCTOR, RolUsuario.JEFE_OPERACIONES, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { vehiculoId, jornadaId, fotos, inspeccionSalidaId, inspeccionRetornoId } = req.body;

      if (!vehiculoId || !Array.isArray(fotos) || fotos.length === 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_PHOTOS_PAYLOAD',
            message: 'vehiculoId y un arreglo fotos [{ tipo, archivoUrl }] son obligatorios.'
          }
        });
        return;
      }

      const fotosGuardadas = await InspectionService.registrarFotos360({
        vehiculoId,
        jornadaId,
        inspeccionSalidaId,
        inspeccionRetornoId,
        fotos
      });

      res.status(201).json({
        data: {
          vehiculoId,
          jornadaId: jornadaId || null,
          totalFotos: fotosGuardadas.length,
          fotos: fotosGuardadas,
          mensaje: 'Fotografías 360° guardadas y persistidas correctamente.'
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
 * Checklist de retorno a planta, fotos de cierre y cierre de jornada con persistencia en MySQL
 */
inspeccionRouter.post(
  '/retorno',
  authorize(RolUsuario.CONDUCTOR, RolUsuario.JEFE_OPERACIONES, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        vehiculoId,
        kilometrajeRetorno,
        horometroRetorno,
        items,
        novedades,
        observaciones,
        danosDetectados,
        herramientasOK,
        estadoGeneral,
        nivelCombustible,
        fotosRetorno,
        fotos360
      } = req.body;
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

      const fotos = fotosRetorno || fotos360 || [];

      const inspeccionRetorno = await InspectionService.registrarInspeccionRetorno(
        {
          vehiculoId,
          conductorId,
          kilometrajeFinal: Number(kilometrajeRetorno) || undefined,
          horometroFinal: Number(horometroRetorno) || undefined,
          estadoGeneral: estadoGeneral || 'CONFORME',
          danosDetectados,
          herramientasOK,
          observaciones: observaciones || novedades || (nivelCombustible ? `Nivel combustible: ${nivelCombustible}` : undefined),
          fotosRetorno: fotos
        },
        { userId: req.user?.userId, ip: req.ip }
      );

      res.status(201).json({
        data: {
          id: inspeccionRetorno.id,
          vehiculoId: inspeccionRetorno.vehiculoId,
          conductorId: inspeccionRetorno.conductorId,
          kilometrajeRetorno: inspeccionRetorno.kilometrajeFinal,
          horometroRetorno: inspeccionRetorno.horometroFinal,
          nivelCombustible: nivelCombustible || '3/4',
          totalItemsRevisados: Array.isArray(items) ? items.length : 0,
          novedades: inspeccionRetorno.observaciones || 'Sin novedades en el retorno',
          fechaHoraRetorno: inspeccionRetorno.fechaHora.toISOString(),
          estadoRetorno: inspeccionRetorno.estadoGeneral,
          fotosRetorno: inspeccionRetorno.fotos360Retorno,
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
