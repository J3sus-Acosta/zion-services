import { Router, Response } from 'express';
import { authenticate, authorize, enforceTenantIsolation, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RolUsuario } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export const trackingRouter = Router();

// -------------------------------------------------------------
// 1. ENDPOINTS DE CLIENTES (TENANT ISOLATED)
// -------------------------------------------------------------

/**
 * GET /api/clientes/ordenes/:id/tracking
 * Obtiene la última posición GPS real de la orden desde MySQL
 */
trackingRouter.get(
  '/clientes/ordenes/:id/tracking',
  authenticate,
  enforceTenantIsolation,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ordenId = req.params.id;

      // Buscar orden por ID o por Folio
      const orden = await prisma.ordenServicio.findFirst({
        where: {
          OR: [{ id: ordenId }, { folio: ordenId }]
        },
        include: {
          solicitudServicio: {
            include: { empresaCliente: true }
          },
          cicloTransporte: true,
          atencionProgramada: {
            include: {
              vehiculo: true,
              conductor: true
            }
          }
        }
      });

      if (!orden) {
        res.status(404).json({
          error: { code: 'ORDER_NOT_FOUND', message: 'Orden de servicio no encontrada.' }
        });
        return;
      }

      // Tenant Isolation
      if (req.user?.rol === RolUsuario.CLIENTE && orden.solicitudServicio.empresaClienteId !== req.user.empresaClienteId) {
        res.status(403).json({
          error: { code: 'TENANT_ISOLATION_VIOLATION', message: 'No tiene acceso al tracking de esta orden.' }
        });
        return;
      }

      // Consultar última posición registrada en MySQL
      const ultimaPosicion = await prisma.registroTelemetriaGPS.findFirst({
        where: {
          OR: [
            { ordenServicioId: orden.id },
            ...(orden.atencionProgramada?.jornadaId ? [{ jornadaId: orden.atencionProgramada.jornadaId }] : [])
          ]
        },
        orderBy: { timestamp: 'desc' }
      });

      const estadoCiclo = orden.cicloTransporte?.estado || 'PENDIENTE';
      const ventanaActiva =
        estadoCiclo === 'EN_RUTA_CLIENTE' ||
        estadoCiclo === 'EN_FAENA' ||
        estadoCiclo === 'FAENA_AUTORIZADA';

      const vehiculo = orden.atencionProgramada?.vehiculo;
      const conductor = orden.atencionProgramada?.conductor;

      if (!ventanaActiva || !ultimaPosicion) {
        res.status(200).json({
          data: {
            ordenServicioId: orden.id,
            trackingDisponible: false,
            motivo: !ventanaActiva
              ? 'El camión no se encuentra en ventana activa de traslado o faena hacia sus instalaciones.'
              : 'Sin coordenadas de telemetría GPS registradas para esta orden.',
            estadoTramo: estadoCiclo
          }
        });
        return;
      }

      res.status(200).json({
        data: {
          ordenServicioId: orden.id,
          patente: vehiculo?.patente || 'RVFL-92',
          conductorNombre: conductor ? `${conductor.nombre} ${conductor.apellido}` : 'Conductor Asignado',
          trackingDisponible: true,
          estadoTramo: estadoCiclo,
          coordenadas: {
            latitud: ultimaPosicion.latitud,
            longitud: ultimaPosicion.longitud,
            precisionMts: ultimaPosicion.precisionMts || 5,
            velocidadKmh: ultimaPosicion.velocidadKmh || null,
            rumbo: ultimaPosicion.rumbo || null,
            ultimaActualizacion: ultimaPosicion.timestamp.toISOString()
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({
        error: { code: 'TRACKING_QUERY_ERROR', message: error.message }
      });
    }
  }
);

/**
 * GET /api/clientes/ordenes/:id/expediente-en-vivo
 * Consulta en vivo de evidencias y actas persistidas en la orden
 */
trackingRouter.get(
  '/clientes/ordenes/:id/expediente-en-vivo',
  authenticate,
  enforceTenantIsolation,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ordenId = req.params.id;

      const orden = await prisma.ordenServicio.findFirst({
        where: {
          OR: [{ id: ordenId }, { folio: ordenId }]
        },
        include: {
          solicitudServicio: true,
          expediente: {
            include: {
              documentos: {
                where: req.user?.rol === RolUsuario.CLIENTE ? { visibleParaCliente: true } : {},
                orderBy: { fechaCarga: 'desc' }
              }
            }
          },
          cicloTransporte: {
            include: {
              fotosFaenaEPP: true,
              autorizacionFaena: true,
              actaRecepcion: true
            }
          }
        }
      });

      if (!orden) {
        res.status(404).json({
          error: { code: 'ORDER_NOT_FOUND', message: 'Orden de servicio no encontrada.' }
        });
        return;
      }

      if (req.user?.rol === RolUsuario.CLIENTE && orden.solicitudServicio.empresaClienteId !== req.user.empresaClienteId) {
        res.status(403).json({
          error: { code: 'TENANT_ISOLATION_VIOLATION', message: 'Acceso denegado a este expediente.' }
        });
        return;
      }

      const evidencias: { id: string; tipo: string; titulo: string; archivoUrl: string; fechaHora: string }[] = [];

      // 1. Documentos indexados en el expediente oficial
      if (orden.expediente?.documentos) {
        for (const doc of orden.expediente.documentos) {
          evidencias.push({
            id: doc.id,
            tipo: doc.categoria,
            titulo: doc.nombreArchivo,
            archivoUrl: doc.rutaAlmacenamiento,
            fechaHora: doc.fechaCarga.toISOString()
          });
        }
      }

      // 2. Fotos de faena registradas en el ciclo
      if (orden.cicloTransporte?.fotosFaenaEPP) {
        for (const f of orden.cicloTransporte.fotosFaenaEPP) {
          if (!evidencias.some(e => e.archivoUrl === f.archivoUrl)) {
            evidencias.push({
              id: f.id,
              tipo: 'FOTO_FAENA',
              titulo: f.descripcion || 'Foto Faena',
              archivoUrl: f.archivoUrl,
              fechaHora: f.fechaHora.toISOString()
            });
          }
        }
      }

      res.status(200).json({
        data: {
          ordenServicioId: orden.id,
          totalEvidenciasCargadas: evidencias.length,
          evidencias,
          descargaDisponible: evidencias.length > 0
        }
      });
    } catch (error: any) {
      res.status(500).json({
        error: { code: 'LIVE_DOSSIER_ERROR', message: error.message }
      });
    }
  }
);

// -------------------------------------------------------------
// 2. ENDPOINTS OPERATIVOS (JEFE OPERACIONES / CONDUCTOR)
// -------------------------------------------------------------

/**
 * GET /api/operaciones/flota-en-vivo
 * Consulta la última ubicación de todas las jornadas operativas activas
 */
trackingRouter.get(
  '/operaciones/flota-en-vivo',
  authenticate,
  authorize(RolUsuario.JEFE_OPERACIONES, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const jornadasActivas = await prisma.jornada.findMany({
        where: {
          estado: 'EN_CURSO'
        },
        include: {
          vehiculo: true,
          conductor: { include: { usuario: true } },
          atencionesProgramadas: {
            where: { estado: 'EN_CURSO' },
            include: {
              ordenServicio: {
                include: {
                  solicitudServicio: { include: { empresaCliente: true } },
                  cicloTransporte: true
                }
              }
            }
          },
          registrosTelemetria: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      });

      const unidades = jornadasActivas.map(j => {
        const ultima = j.registrosTelemetria?.[0];
        const atencion = j.atencionesProgramadas?.[0];
        const orden = atencion?.ordenServicio;
        return {
          vehiculoId: j.vehiculoId,
          patente: j.vehiculo.patente,
          conductorId: j.conductorId,
          conductorNombre: j.conductor?.usuario ? `${j.conductor.usuario.nombre} ${j.conductor.usuario.apellido}` : 'Conductor',
          ordenServicioId: orden?.id || null,
          empresaClienteId: orden?.solicitudServicio?.empresaClienteId || null,
          estadoTramo: orden?.cicloTransporte?.estado || 'EN_RUTA_CLIENTE',
          latitud: ultima?.latitud || -33.4372,
          longitud: ultima?.longitud || -70.6506,
          precisionMts: ultima?.precisionMts || 5,
          ultimaActualizacion: (ultima?.timestamp || new Date()).toISOString(),
          velocidadKmh: ultima?.velocidadKmh || null
        };
      });

      res.status(200).json({
        data: {
          totalUnidadesActivas: unidades.length,
          unidades
        }
      });
    } catch (error: any) {
      res.status(500).json({
        error: { code: 'FLEET_LIVE_ERROR', message: error.message }
      });
    }
  }
);

/**
 * POST /api/jornadas/:id/geolocalizacion
 * POST /api/tracking/posicion
 * Ingesta transaccional de puntos GPS en MySQL (RegistroTelemetriaGPS)
 */
trackingRouter.post(
  ['/jornadas/:id/geolocalizacion', '/tracking/posicion'],
  authenticate,
  authorize(RolUsuario.CONDUCTOR, RolUsuario.JEFE_OPERACIONES, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const jornadaId = req.params.id || req.body.jornadaId;
      const { latitud, longitud, precisionMts, velocidadKmh, rumbo, ordenServicioId } = req.body;

      if (typeof latitud !== 'number' || typeof longitud !== 'number') {
        res.status(400).json({
          error: { code: 'INVALID_COORDINATES', message: 'Coordenadas latitud y longitud requeridas en formato numérico.' }
        });
        return;
      }

      // Validar si existe la jornada en BD
      let resolvedJornadaId: string | null = null;
      if (jornadaId) {
        const jornada = await prisma.jornada.findUnique({ where: { id: jornadaId } });
        if (jornada) resolvedJornadaId = jornada.id;
      }

      // Validar si existe la orden en BD
      let resolvedOrdenId: string | null = null;
      if (ordenServicioId) {
        const orden = await prisma.ordenServicio.findFirst({
          where: { OR: [{ id: ordenServicioId }, { folio: ordenServicioId }] }
        });
        if (orden) resolvedOrdenId = orden.id;
      }

      const registro = await prisma.registroTelemetriaGPS.create({
        data: {
          jornadaId: resolvedJornadaId,
          ordenServicioId: resolvedOrdenId,
          latitud: Number(latitud),
          longitud: Number(longitud),
          precisionMts: precisionMts !== undefined ? Number(precisionMts) : 5.0,
          velocidadKmh: velocidadKmh !== undefined ? Number(velocidadKmh) : null,
          rumbo: rumbo !== undefined ? Number(rumbo) : null,
          timestamp: new Date()
        }
      });

      res.status(200).json({
        data: {
          id: registro.id,
          message: 'Coordenadas GPS registradas correctamente.',
          timestamp: registro.timestamp.toISOString()
        }
      });
    } catch (error: any) {
      res.status(500).json({
        error: { code: 'GPS_RECORD_ERROR', message: error.message }
      });
    }
  }
);
