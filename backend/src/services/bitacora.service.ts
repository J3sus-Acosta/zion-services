import { prisma } from '../utils/prisma.js';
import { RegistrarBitacoraInput, QueryBitacoraInput } from '../validators/bitacora.validator.js';
import { RolUsuario, TipoEventoBitacora } from '@prisma/client';
import { logger } from '../utils/logger.js';

export class BitacoraError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'BITACORA_ERROR') {
    super(message);
    this.name = 'BitacoraError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class BitacoraService {
  /**
   * Eventos tipificados de alta prioridad que disparan alertas automáticas de operaciones
   */
  private static readonly EVENTOS_CRITICOS: TipoEventoBitacora[] = [
    TipoEventoBitacora.TRAFICO,
    TipoEventoBitacora.ACCESO_DENEGADO,
    TipoEventoBitacora.FALLA_EQUIPO,
    TipoEventoBitacora.VOLUMEN_DISCREPANTE
  ];

  /**
   * Registra una nueva incidencia o reporte en la bitácora de terreno (Anti-WhatsApp)
   */
  static async registrarIncidencia(
    data: RegistrarBitacoraInput,
    usuarioId?: string
  ) {
    const orden = await prisma.ordenServicio.findFirst({
      where: {
        OR: [
          { id: data.ordenServicioId },
          { folio: data.ordenServicioId }
        ]
      },
      include: {
        solicitudServicio: {
          include: {
            empresaCliente: true
          }
        },
        atencionProgramada: true
      }
    });

    if (!orden) {
      throw new BitacoraError(
        `Orden de servicio "${data.ordenServicioId}" no encontrada.`,
        404,
        'ORDER_NOT_FOUND'
      );
    }

    // Validar existencia de usuario si se suministra para evitar fallos de FK
    let validUserId: string | null = null;
    if (usuarioId) {
      const userExists = await prisma.usuario.findUnique({ where: { id: usuarioId } });
      if (userExists) {
        validUserId = usuarioId;
      }
    }

    const bitacora = await prisma.bitacoraServicio.create({
      data: {
        ordenServicioId: orden.id,
        tipoEvento: data.tipoEvento,
        descripcion: data.descripcion.trim(),
        latitud: data.latitud !== undefined ? data.latitud : null,
        longitud: data.longitud !== undefined ? data.longitud : null,
        fotoUrl: data.fotoUrl?.trim() || null,
        registradoPorId: validUserId
      },
      include: {
        registradoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            rol: true
          }
        }
      }
    });

    logger.info('Evento de bitácora registrado en terreno', {
      bitacoraId: bitacora.id,
      ordenId: orden.id,
      folio: orden.folio,
      tipoEvento: data.tipoEvento,
      registradoPorId: usuarioId
    });

    // Tarea 5.2: Disparo de Alerta / Notificación ante eventos tipificados críticos
    if (this.EVENTOS_CRITICOS.includes(data.tipoEvento)) {
      await this.emitirAlertaOperacional(bitacora, orden, usuarioId);
    }

    return bitacora;
  }

  /**
   * Consulta el timeline cronológico de eventos de la bitácora para una orden
   */
  static async obtenerTimeline(
    ordenServicioId: string,
    usuario?: { rol?: RolUsuario; empresaClienteId?: string | null },
    query?: QueryBitacoraInput
  ) {
    const orden = await prisma.ordenServicio.findFirst({
      where: {
        OR: [
          { id: ordenServicioId },
          { folio: ordenServicioId }
        ]
      },
      include: {
        solicitudServicio: {
          include: {
            empresaCliente: true
          }
        }
      }
    });

    if (!orden) {
      throw new BitacoraError(
        `Orden de servicio "${ordenServicioId}" no encontrada.`,
        404,
        'ORDER_NOT_FOUND'
      );
    }

    // Tenant Isolation para usuarios con rol CLIENTE
    if (
      usuario?.rol === RolUsuario.CLIENTE &&
      orden.solicitudServicio.empresaClienteId !== usuario.empresaClienteId
    ) {
      logger.error('Intento de violación de Tenant Isolation en bitácora', {
        userId: (usuario as any)?.userId,
        clienteAutenticado: usuario.empresaClienteId,
        empresaOrden: orden.solicitudServicio.empresaClienteId
      });
      throw new BitacoraError(
        'Acceso denegado: no puede consultar la bitácora de otra empresa cliente.',
        403,
        'TENANT_ISOLATION_VIOLATION'
      );
    }

    const where: any = {
      ordenServicioId: orden.id
    };

    if (query?.tipoEvento) {
      where.tipoEvento = query.tipoEvento;
    }

    const eventos = await prisma.bitacoraServicio.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        registradoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            rol: true
          }
        }
      }
    });

    return {
      ordenServicioId: orden.id,
      folio: orden.folio,
      cliente: orden.solicitudServicio.empresaCliente.razonSocial,
      totalEventos: eventos.length,
      timeline: eventos
    };
  }

  /**
   * Emite una alerta operacional formal en auditoría y notificaciones ante eventos tipificados
   */
  private static async emitirAlertaOperacional(
    bitacora: any,
    orden: any,
    usuarioId?: string
  ): Promise<void> {
    try {
      // 1. Registro en auditoría de eventos de sistema
      await prisma.auditoriaEvento.create({
        data: {
          usuarioId: usuarioId || null,
          accion: `ALERTA_BITACORA_${bitacora.tipoEvento}`,
          recurso: 'BitacoraServicio',
          recursoId: bitacora.id,
          detallesJson: {
            ordenServicioId: orden.id,
            folioOrden: orden.folio,
            tipoEvento: bitacora.tipoEvento,
            descripcion: bitacora.descripcion,
            empresaCliente: orden.solicitudServicio.empresaCliente.razonSocial,
            fechaAlerta: new Date().toISOString()
          }
        }
      });

      // 2. Notificación al Conductor asignado si existe atención programada
      if (orden.atencionProgramada?.conductorId) {
        await prisma.notificacionConductor.create({
          data: {
            conductorId: orden.atencionProgramada.conductorId,
            titulo: `Alerta de Terreno: ${bitacora.tipoEvento}`,
            mensaje: `Incidencia en OS ${orden.folio}: ${bitacora.descripcion.slice(0, 150)}`,
            metadata: { atencionId: orden.atencionProgramada.id },
            tipo: 'ALERTA_TERRENO'
          }
        }).catch((err) => {
          logger.warn('No se pudo registrar notificación a conductor para alerta', { error: err.message });
        });
      }

      logger.warn('ALERTA OPERACIONAL DISPARADA DESDE BITÁCORA DE TERRENO', {
        tipoEvento: bitacora.tipoEvento,
        folioOrden: orden.folio,
        cliente: orden.solicitudServicio.empresaCliente.razonSocial
      });
    } catch (err: any) {
      logger.error('Error al emitir alerta operacional de bitácora', { error: err.message });
    }
  }
}
