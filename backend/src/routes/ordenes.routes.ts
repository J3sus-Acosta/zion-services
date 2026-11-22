import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RolUsuario, EstadoOrdenServicio } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export const ordenesRouter = Router();

ordenesRouter.use(authenticate);

/**
 * POST /api/ordenes
 * Creación directa de una Orden de Servicio vinculada a una solicitud existente
 */
ordenesRouter.post(
  '/',
  authorize(RolUsuario.COMERCIAL, RolUsuario.JEFE_OPERACIONES, RolUsuario.ADMIN, RolUsuario.SUPERADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { solicitudServicioId, folio, observaciones } = req.body;

      if (!solicitudServicioId) {
        res.status(400).json({
          error: { code: 'MISSING_REQUEST_ID', message: 'solicitudServicioId es requerido.' }
        });
        return;
      }

      const solicitud = await prisma.solicitudServicio.findUnique({
        where: { id: solicitudServicioId }
      });

      if (!solicitud) {
        res.status(404).json({
          error: { code: 'REQUEST_NOT_FOUND', message: 'Solicitud de servicio no encontrada.' }
        });
        return;
      }

      const folioOS = folio || `OS-${Date.now().toString().slice(-6)}`;

      const orden = await prisma.ordenServicio.create({
        data: {
          folio: folioOS,
          solicitudServicioId,
          observaciones,
          estado: EstadoOrdenServicio.EMITIDA,
          cicloTransporte: {
            create: {}
          },
          expediente: {
            create: {}
          }
        },
        include: {
          solicitudServicio: {
            include: { empresaCliente: true, sucursalFaena: true }
          },
          cicloTransporte: true,
          expediente: true
        }
      });

      res.status(201).json({
        data: orden
      });
    } catch (error: any) {
      res.status(400).json({
        error: { code: 'ORDER_CREATION_ERROR', message: error.message }
      });
    }
  }
);

/**
 * GET /api/ordenes
 * Listado de Órdenes de Servicio con aislamiento por tenant para clientes
 */
ordenesRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where: any = {};

    if (req.user?.rol === RolUsuario.CLIENTE) {
      where.solicitudServicio = {
        empresaClienteId: req.user.empresaClienteId
      };
    }

    const ordenes = await prisma.ordenServicio.findMany({
      where,
      include: {
        solicitudServicio: {
          include: {
            empresaCliente: { select: { id: true, razonSocial: true, rut: true } },
            sucursalFaena: true
          }
        },
        cicloTransporte: true,
        expediente: true,
        tramosRuta: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      data: ordenes
    });
  } catch (error: any) {
    res.status(500).json({
      error: { code: 'FETCH_ORDERS_ERROR', message: error.message }
    });
  }
});

/**
 * GET /api/ordenes/:id
 * Consulta de orden específica por ID o Folio
 */
ordenesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const idOrFolio = req.params.id;

    const orden = await prisma.ordenServicio.findFirst({
      where: {
        OR: [
          { id: idOrFolio },
          { folio: idOrFolio }
        ]
      },
      include: {
        solicitudServicio: {
          include: {
            empresaCliente: true,
            sucursalFaena: true
          }
        },
        cicloTransporte: true,
        expediente: {
          include: {
            documentos: true
          }
        },
        tramosRuta: true
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
        error: { code: 'TENANT_ISOLATION_VIOLATION', message: 'No tiene permisos para ver esta orden de servicio.' }
      });
      return;
    }

    res.status(200).json({
      data: orden
    });
  } catch (error: any) {
    res.status(500).json({
      error: { code: 'FETCH_ORDER_ERROR', message: error.message }
    });
  }
});
