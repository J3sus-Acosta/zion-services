import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RolUsuario, EstadoCicloTransporte, TipoRecepcion } from '@prisma/client';
import {
  TransportCycleService,
  MarcarLlegadaInput,
  FirmarOrdenTrabajoInput,
  CargarFotoFaenaEPPInput,
  FinalizarRecepcionInput
} from '../services/transport-cycle.service.js';

export const cicloTransporteRouter = Router();

cicloTransporteRouter.use(authenticate);

/**
 * POST /api/ciclo-transporte/llegada
 * Registro de hora y coordenadas exactas de llegada a la faena del cliente (CU-16)
 */
cicloTransporteRouter.post(
  '/llegada',
  authorize(RolUsuario.CONDUCTOR, RolUsuario.JEFE_OPERACIONES, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { cicloTransporteId, horaLlegada, coordenadas } = req.body;

      if (!cicloTransporteId) {
        res.status(400).json({
          error: { code: 'INVALID_INPUT', message: 'cicloTransporteId es obligatorio.' }
        });
        return;
      }

      const input: MarcarLlegadaInput = {
        cicloTransporteId,
        horaLlegada: horaLlegada ? new Date(horaLlegada) : new Date(),
        coordenadas
      };

      const resultado = TransportCycleService.registrarLlegada(input);

      res.status(200).json({
        data: {
          cicloTransporteId,
          ...resultado
        }
      });
    } catch (error: any) {
      res.status(400).json({
        error: { code: 'ARRIVAL_REGISTRATION_ERROR', message: error.message }
      });
    }
  }
);

/**
 * POST /api/ciclo-transporte/autorizar-faena
 * Autorización de inicio de faena mediante firma táctil corta en pantalla (CU-17)
 * Registra obligatoriamente: trazo táctil, Nombre, Apellido y RUT del encargado
 */
cicloTransporteRouter.post(
  '/autorizar-faena',
  authorize(RolUsuario.CONDUCTOR, RolUsuario.JEFE_OPERACIONES, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { cicloTransporteId, encargadoNombre, encargadoApellido, encargadoRut, firmaDataUrl, firmaSvg } = req.body;

      if (!cicloTransporteId) {
        res.status(400).json({
          error: { code: 'INVALID_INPUT', message: 'cicloTransporteId es obligatorio.' }
        });
        return;
      }

      const nombre = encargadoNombre || req.body.nombreCliente;
      const apellido = encargadoApellido || '';
      const rut = encargadoRut || req.body.rutCliente;
      const firma = firmaDataUrl || firmaSvg;

      if (!nombre || nombre.trim() === '') {
        res.status(400).json({
          error: { code: 'MISSING_NAME', message: 'El nombre del encargado del cliente es obligatorio.' }
        });
        return;
      }

      if (!apellido && !req.body.nombreCliente) {
        res.status(400).json({
          error: { code: 'MISSING_LASTNAME', message: 'El apellido del encargado del cliente es obligatorio.' }
        });
        return;
      }

      if (!rut || rut.trim() === '') {
        res.status(400).json({
          error: { code: 'MISSING_RUT', message: 'El RUT del encargado del cliente es obligatorio.' }
        });
        return;
      }

      if (!firma || firma.trim() === '') {
        res.status(400).json({
          error: { code: 'MISSING_SIGNATURE', message: 'El trazo manuscrito de la firma táctil es obligatorio.' }
        });
        return;
      }

      const input: FirmarOrdenTrabajoInput = {
        cicloTransporteId,
        nombreCliente: apellido ? `${nombre.trim()} ${apellido.trim()}` : nombre.trim(),
        rutCliente: rut.trim(),
        firmaSvg: firma,
        fechaHora: new Date()
      };

      const resultado = TransportCycleService.autorizarInicioFaena(input);

      res.status(200).json({
        data: {
          cicloTransporteId,
          encargado: {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            rut: rut.trim()
          },
          ...resultado
        }
      });
    } catch (error: any) {
      res.status(400).json({
        error: { code: 'AUTHORIZATION_ERROR', message: error.message }
      });
    }
  }
);

/**
 * POST /api/ciclo-transporte/evidencias
 * Carga de fotografías de faena y cuadrilla EPP en terreno (CU-18)
 */
cicloTransporteRouter.post(
  '/evidencias',
  authorize(RolUsuario.CONDUCTOR, RolUsuario.JEFE_OPERACIONES, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { cicloTransporteId, archivoUrl, descripcion, estadoCiclo } = req.body;

      if (!cicloTransporteId || !archivoUrl || !descripcion) {
        res.status(400).json({
          error: { code: 'INVALID_INPUT', message: 'cicloTransporteId, archivoUrl y descripcion son obligatorios.' }
        });
        return;
      }

      const input: CargarFotoFaenaEPPInput = {
        cicloTransporteId,
        archivoUrl,
        descripcion
      };

      const estado = (estadoCiclo as EstadoCicloTransporte) || EstadoCicloTransporte.FAENA_AUTORIZADA;
      const resultado = TransportCycleService.registrarFotoFaena(estado, input);

      res.status(201).json({
        data: {
          cicloTransporteId,
          ...resultado,
          fechaRegistro: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        error: { code: 'EVIDENCE_ERROR', message: error.message }
      });
    }
  }
);

/**
 * POST /api/ciclo-transporte/recepcion-conforme
 * Acta de recepción conforme, observaciones o sin firma (CU-19)
 */
cicloTransporteRouter.post(
  '/recepcion-conforme',
  authorize(RolUsuario.CONDUCTOR, RolUsuario.JEFE_OPERACIONES, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { cicloTransporteId, tipoRecepcion, nombreFirmante, rutFirmante, firmaDataUrl, firmaSvg, observaciones, fotoRespaldoUrl } = req.body;

      if (!cicloTransporteId || !tipoRecepcion) {
        res.status(400).json({
          error: { code: 'INVALID_INPUT', message: 'cicloTransporteId y tipoRecepcion son obligatorios.' }
        });
        return;
      }

      const input: FinalizarRecepcionInput = {
        cicloTransporteId,
        tipoRecepcion: tipoRecepcion as TipoRecepcion,
        nombreFirmante,
        rutFirmante,
        firmaSvg: firmaDataUrl || firmaSvg,
        observaciones,
        fotoRespaldoUrl
      };

      const resultado = TransportCycleService.finalizarRecepcion(input);

      res.status(200).json({
        data: {
          cicloTransporteId,
          ...resultado
        }
      });
    } catch (error: any) {
      res.status(400).json({
        error: { code: 'RECEPTION_ERROR', message: error.message }
      });
    }
  }
);
