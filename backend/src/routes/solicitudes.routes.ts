import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RolUsuario, EstadoSolicitud, EstadoOrdenServicio } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { CommercialService, CrearSolicitudInput } from '../services/commercial.service.js';

export const solicitudesRouter = Router();

solicitudesRouter.use(authenticate);

/**
 * POST /api/solicitudes
 * Creación de nueva solicitud de servicio comercial / cliente
 */
solicitudesRouter.post(
  '/',
  authorize(RolUsuario.CLIENTE, RolUsuario.COMERCIAL, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tipoResiduo, descripcion, cantidadEstimada, unidadEstimada, fechaPreferente, sucursalFaenaId } = req.body;
      let empresaClienteId = req.body.empresaClienteId;

      // Tenant Isolation: el cliente solo puede solicitar para su propia empresa
      if (req.user?.rol === RolUsuario.CLIENTE) {
        empresaClienteId = req.user.empresaClienteId;
      }

      if (!empresaClienteId) {
        res.status(400).json({
          error: { code: 'MISSING_CLIENT_ID', message: 'empresaClienteId es requerido.' }
        });
        return;
      }

      // Validar que la empresa cliente exista
      const empresa = await prisma.empresaCliente.findUnique({
        where: { id: empresaClienteId }
      });
      if (!empresa) {
        res.status(404).json({
          error: { code: 'EMPRESA_NOT_FOUND', message: `La empresa cliente con ID "${empresaClienteId}" no existe.` }
        });
        return;
      }

      // Validar sucursal faena real desde la base de datos
      let sucursalId = sucursalFaenaId;
      if (!sucursalId) {
        const sucursalDefault = await prisma.sucursalFaena.findFirst({
          where: { empresaClienteId, activo: true }
        });
        if (!sucursalDefault) {
          res.status(404).json({
            error: { code: 'SUCURSAL_NOT_FOUND', message: 'No se encontró una sucursal activa para la empresa cliente especificada.' }
          });
          return;
        }
        sucursalId = sucursalDefault.id;
      } else {
        const sucursal = await prisma.sucursalFaena.findUnique({
          where: { id: sucursalId }
        });
        if (!sucursal) {
          res.status(404).json({
            error: { code: 'SUCURSAL_NOT_FOUND', message: `La sucursal faena con ID "${sucursalId}" no existe.` }
          });
          return;
        }
        if (sucursal.empresaClienteId !== empresaClienteId) {
          res.status(400).json({
            error: { code: 'INVALID_SUCURSAL', message: 'La sucursal faena no pertenece a la empresa cliente especificada.' }
          });
          return;
        }
      }

      const input: CrearSolicitudInput = {
        empresaClienteId,
        sucursalFaenaId: sucursalId,
        tipoResiduo,
        descripcion,
        cantidadEstimada: cantidadEstimada ? Number(cantidadEstimada) : undefined,
        unidadEstimada: unidadEstimada || 'KG',
        fechaPreferente: fechaPreferente ? new Date(fechaPreferente) : new Date()
      };

      const validado = CommercialService.crearSolicitud(input);

      const solicitud = await prisma.solicitudServicio.create({
        data: {
          folio: validado.folio,
          empresaClienteId: validado.empresaClienteId,
          sucursalFaenaId: sucursalId,
          tipoResiduo: validado.tipoResiduo,
          descripcion: validado.descripcion,
          cantidadEstimada: validado.cantidadEstimada,
          unidadEstimada: validado.unidadEstimada,
          fechaPreferente: input.fechaPreferente,
          estado: EstadoSolicitud.ENVIADA
        },
        include: {
          empresaCliente: true,
          sucursalFaena: true
        }
      });

      res.status(201).json({
        data: solicitud
      });
    } catch (error: any) {
      res.status(400).json({
        error: { code: 'REQUEST_CREATION_ERROR', message: error.message }
      });
    }
  }
);

/**
 * GET /api/solicitudes
 * Listado de solicitudes de servicio con aislamiento por cliente
 */
solicitudesRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where: any = {};

    if (req.user?.rol === RolUsuario.CLIENTE) {
      where.empresaClienteId = req.user.empresaClienteId;
    }

    const solicitudes = await prisma.solicitudServicio.findMany({
      where,
      include: {
        empresaCliente: { select: { id: true, razonSocial: true, rut: true } },
        sucursalFaena: true,
        ordenServicio: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      data: solicitudes
    });
  } catch (error: any) {
    res.status(500).json({
      error: { code: 'FETCH_ERROR', message: error.message }
    });
  }
});

/**
 * PATCH /api/solicitudes/:id/aprobar
 * Aprobación comercial de solicitud y emisión automática de Orden de Servicio
 */
solicitudesRouter.patch(
  '/:id/aprobar',
  authorize(RolUsuario.COMERCIAL, RolUsuario.ADMIN, RolUsuario.SUPERADMIN, RolUsuario.JEFE_OPERACIONES),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const solicitudId = req.params.id;
      const solicitud = await prisma.solicitudServicio.findUnique({
        where: { id: solicitudId },
        include: { ordenServicio: true }
      });

      if (!solicitud) {
        res.status(404).json({
          error: { code: 'REQUEST_NOT_FOUND', message: 'Solicitud no encontrada.' }
        });
        return;
      }

      if (solicitud.ordenServicio) {
        res.status(400).json({
          error: { code: 'ALREADY_APPROVED', message: 'La solicitud ya cuenta con una Orden de Servicio emitida.' }
        });
        return;
      }

      const folioOS = `OS-${Date.now().toString().slice(-6)}`;
      const aprobacion = CommercialService.aprobarYEmitirOS({
        solicitudId,
        folioOrdenServicio: folioOS
      });

      // Transacción atómica: actualizar solicitud y crear OS
      const [solicitudActualizada, nuevaOS] = await prisma.$transaction([
        prisma.solicitudServicio.update({
          where: { id: solicitudId },
          data: { estado: aprobacion.solicitudEstado }
        }),
        prisma.ordenServicio.create({
          data: {
            folio: folioOS,
            solicitudServicioId: solicitudId,
            estado: EstadoOrdenServicio.EMITIDA,
            cicloTransporte: {
              create: {}
            },
            expediente: {
              create: {}
            }
          },
          include: {
            cicloTransporte: true,
            expediente: true
          }
        })
      ]);

      res.status(200).json({
        data: {
          solicitud: solicitudActualizada,
          ordenServicio: nuevaOS,
          mensaje: `Solicitud aprobada y Orden de Servicio ${folioOS} emitida exitosamente.`
        }
      });
    } catch (error: any) {
      res.status(400).json({
        error: { code: 'APPROVAL_ERROR', message: error.message }
      });
    }
  }
);
