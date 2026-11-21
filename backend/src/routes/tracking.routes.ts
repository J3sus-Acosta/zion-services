import { Router, Response } from 'express';
import { authenticate, authorize, enforceTenantIsolation, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RolUsuario } from '@prisma/client';

export const trackingRouter = Router();

// Store en memoria para estado y telemetría de jornadas y órdenes
interface TelemetriaUnidad {
  vehiculoId: string;
  patente: string;
  conductorId: string;
  conductorNombre: string;
  ordenServicioId: string;
  empresaClienteId: string;
  estadoTramo: 'EN_RUTA_CLIENTE' | 'EN_FAENA' | 'HACIA_ROMANA' | 'RETORNANDO' | 'FINALIZADO';
  latitud: number;
  longitud: number;
  precisionMts: number;
  ultimaActualizacion: string;
  velocidadKmh?: number;
}

const TELEMETRIA_STORE = new Map<string, TelemetriaUnidad>([
  [
    'OS-000561',
    {
      vehiculoId: 'veh-01',
      patente: 'RVFL-92',
      conductorId: 'cond-01',
      conductorNombre: 'Carlos Sánchez',
      ordenServicioId: 'OS-000561',
      empresaClienteId: 'empresa-horse',
      estadoTramo: 'EN_RUTA_CLIENTE',
      latitud: -33.4372,
      longitud: -70.6506,
      precisionMts: 8,
      ultimaActualizacion: new Date().toISOString(),
      velocidadKmh: 45
    }
  ]
]);

// Evidencias cargadas en tiempo real por la tablet
interface EvidenciaItem {
  id: string;
  tipo: 'FOTO_SALIDA' | 'FOTO_FAENA' | 'FIRMA_OT' | 'FIRMA_RECEPCION' | 'FOTO_SIDREP' | 'FOTO_RETORNO';
  titulo: string;
  archivoUrl: string;
  fechaHora: string;
  coordenadas?: { lat: number; lng: number };
}

const EVIDENCIAS_STORE = new Map<string, EvidenciaItem[]>([
  [
    'OS-000561',
    [
      {
        id: 'ev-01',
        tipo: 'FOTO_SALIDA',
        titulo: 'Inspección Salida - Frontal',
        archivoUrl: '/uploads/inspecciones/salida-frontal.jpg',
        fechaHora: new Date(Date.now() - 3600000).toISOString(),
        coordenadas: { lat: -33.4569, lng: -70.6482 }
      },
      {
        id: 'ev-02',
        tipo: 'FOTO_SALIDA',
        titulo: 'Inspección Salida - Lateral Izq',
        archivoUrl: '/uploads/inspecciones/salida-lat-izq.jpg',
        fechaHora: new Date(Date.now() - 3550000).toISOString()
      }
    ]
  ]
]);

// -------------------------------------------------------------
// 1. ENDPOINTS DE CLIENTES (TENANT ISOLATED)
// -------------------------------------------------------------

// GET /api/clientes/ordenes/:id/tracking
trackingRouter.get(
  '/clientes/ordenes/:id/tracking',
  authenticate,
  enforceTenantIsolation,
  async (req: AuthenticatedRequest, res: Response) => {
    const ordenId = req.params.id;
    const telemetria = TELEMETRIA_STORE.get(ordenId);

    if (!telemetria) {
      res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Orden de servicio no encontrada.' }
      });
      return;
    }

    // Tenant Isolation: el cliente solo puede consultar si es de su empresa
    if (req.user?.rol === RolUsuario.CLIENTE && telemetria.empresaClienteId !== req.user.empresaClienteId) {
      res.status(403).json({
        error: { code: 'TENANT_ISOLATION_VIOLATION', message: 'No tiene acceso al tracking de esta orden.' }
      });
      return;
    }

    // Regla de ventana de servicio activa: solo se muestra en ruta al cliente o en faena
    const ventanaActiva = telemetria.estadoTramo === 'EN_RUTA_CLIENTE' || telemetria.estadoTramo === 'EN_FAENA';

    if (!ventanaActiva) {
      res.status(200).json({
        data: {
          ordenServicioId: telemetria.ordenServicioId,
          trackingDisponible: false,
          motivo: 'El camión no se encuentra en ventana activa de traslado o faena hacia sus instalaciones.',
          estadoTramo: telemetria.estadoTramo
        }
      });
      return;
    }

    res.status(200).json({
      data: {
        ordenServicioId: telemetria.ordenServicioId,
        patente: telemetria.patente,
        conductorNombre: telemetria.conductorNombre,
        trackingDisponible: true,
        estadoTramo: telemetria.estadoTramo,
        coordenadas: {
          latitud: telemetria.latitud,
          longitud: telemetria.longitud,
          precisionMts: telemetria.precisionMts,
          ultimaActualizacion: telemetria.ultimaActualizacion
        }
      }
    });
  }
);

// GET /api/clientes/ordenes/:id/expediente-en-vivo
trackingRouter.get(
  '/clientes/ordenes/:id/expediente-en-vivo',
  authenticate,
  enforceTenantIsolation,
  async (req: AuthenticatedRequest, res: Response) => {
    const ordenId = req.params.id;
    const telemetria = TELEMETRIA_STORE.get(ordenId);

    if (telemetria && req.user?.rol === RolUsuario.CLIENTE && telemetria.empresaClienteId !== req.user.empresaClienteId) {
      res.status(403).json({
        error: { code: 'TENANT_ISOLATION_VIOLATION', message: 'Acceso denegado a este expediente.' }
      });
      return;
    }

    const evidencias = EVIDENCIAS_STORE.get(ordenId) || [];

    res.status(200).json({
      data: {
        ordenServicioId: ordenId,
        totalEvidenciasCargadas: evidencias.length,
        evidencias,
        descargaDisponible: evidencias.length > 0
      }
    });
  }
);

// -------------------------------------------------------------
// 2. ENDPOINTS OPERATIVOS (JEFE OPERACIONES / CONDUCTOR)
// -------------------------------------------------------------

// GET /api/operaciones/flota-en-vivo
trackingRouter.get(
  '/operaciones/flota-en-vivo',
  authenticate,
  authorize(RolUsuario.JEFE_OPERACIONES, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  (_req: AuthenticatedRequest, res: Response) => {
    const unidades = Array.from(TELEMETRIA_STORE.values());
    res.status(200).json({
      data: {
        totalUnidadesActivas: unidades.length,
        unidades
      }
    });
  }
);

// POST /api/jornadas/:id/geolocalizacion
trackingRouter.post(
  '/jornadas/:id/geolocalizacion',
  authenticate,
  authorize(RolUsuario.CONDUCTOR, RolUsuario.JEFE_OPERACIONES, RolUsuario.SUPERADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const { latitud, longitud, precisionMts, ordenServicioId, estadoTramo } = req.body;

    if (typeof latitud !== 'number' || typeof longitud !== 'number') {
      res.status(400).json({
        error: { code: 'INVALID_COORDINATES', message: 'Coordenadas latitud y longitud requeridas en formato numérico.' }
      });
      return;
    }

    if (ordenServicioId && TELEMETRIA_STORE.has(ordenServicioId)) {
      const reg = TELEMETRIA_STORE.get(ordenServicioId)!;
      reg.latitud = latitud;
      reg.longitud = longitud;
      reg.precisionMts = precisionMts || 10;
      reg.ultimaActualizacion = new Date().toISOString();
      if (estadoTramo) reg.estadoTramo = estadoTramo;
      TELEMETRIA_STORE.set(ordenServicioId, reg);
    }

    res.status(200).json({
      data: {
        message: 'Coordenadas GPS registradas correctamente.',
        timestamp: new Date().toISOString()
      }
    });
  }
);
