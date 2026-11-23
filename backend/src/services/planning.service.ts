import { Prisma, EstadoAtencionProgramada, EstadoSolicitud, EstadoOrdenServicio } from '@prisma/client';
import { prisma as defaultPrisma } from '../utils/prisma.js';
import {
  SolicitudMultiAtencionInput,
  AsignarAtencionInput,
  ReasignarAtencionInput,
  AgendaQueryParams
} from '../validators/planning.validator.js';
import { PlanningConflictService } from './planning-conflict.service.js';
import { AuditService } from './audit.service.js';
import { EmailService } from './email.service.js';
import { logger } from '../utils/logger.js';

export interface UsuarioOperadorContext {
  id?: string;
  rol?: string;
}

export class PlanningService {
  /**
   * Obtiene la agenda de atenciones programadas filtradas por ventana temporal y criterios opcionales.
   */
  static async obtenerAgenda(filtros: AgendaQueryParams, prismaClient = defaultPrisma) {
    const fechaDesde = new Date(filtros.fechaDesde);
    const fechaHasta = new Date(filtros.fechaHasta);

    const atenciones = await prismaClient.atencionProgramada.findMany({
      where: {
        fechaHoraInicio: {
          gte: fechaDesde,
          lte: fechaHasta
        },
        vehiculoId: filtros.vehiculoId || undefined,
        conductorId: filtros.conductorId || undefined,
        sucursalFaenaId: filtros.sucursalId || undefined,
        estado: filtros.estado || undefined
      },
      include: {
        solicitudServicio: {
          include: {
            empresaCliente: {
              select: { id: true, razonSocial: true }
            }
          }
        },
        sucursalFaena: {
          select: { id: true, nombre: true, comuna: true, direccion: true }
        },
        vehiculo: {
          select: { id: true, patente: true, modelo: true }
        },
        conductor: {
          select: { id: true, nombre: true, apellido: true }
        },
        plantaDestino: {
          select: { id: true, nombre: true }
        },
        servicios: {
          include: {
            servicioCatalogo: {
              select: { id: true, codigo: true, nombre: true }
            }
          }
        },
        ordenServicio: {
          select: { id: true, folio: true }
        }
      },
      orderBy: { fechaHoraInicio: 'asc' }
    });

    return atenciones.map((a) => ({
      id: a.id,
      folio: a.folio,
      solicitudServicioId: a.solicitudServicioId,
      cliente: {
        id: a.solicitudServicio.empresaCliente.id,
        razonSocial: a.solicitudServicio.empresaCliente.razonSocial
      },
      sucursalFaena: {
        id: a.sucursalFaena.id,
        nombre: a.sucursalFaena.nombre,
        comuna: a.sucursalFaena.comuna,
        direccion: a.sucursalFaena.direccion
      },
      fechaHoraInicio: a.fechaHoraInicio.toISOString(),
      fechaHoraFinEstimada: a.fechaHoraFinEstimada.toISOString(),
      duracionEstimadaMinutos: a.duracionEstimadaMinutos,
      estado: a.estado,
      vehiculo: a.vehiculo
        ? { id: a.vehiculo.id, patente: a.vehiculo.patente, modelo: a.vehiculo.modelo }
        : null,
      conductor: a.conductor
        ? { id: a.conductor.id, nombre: a.conductor.nombre, apellido: a.conductor.apellido }
        : null,
      plantaDestino: a.plantaDestino
        ? { id: a.plantaDestino.id, nombre: a.plantaDestino.nombre }
        : null,
      servicios: a.servicios.map((s) => ({
        id: s.servicioCatalogo.id,
        codigo: s.servicioCatalogo.codigo,
        nombre: s.servicioCatalogo.nombre,
        cantidad: s.cantidad
      })),
      ordenServicioId: a.ordenServicio?.id || null,
      ordenServicioFolio: a.ordenServicio?.folio || null
    }));
  }

  /**
   * Registro transaccional de una solicitud multi-atención con generación de folios y detalle de servicios.
   */
  static async crearSolicitudMultiAtencion(
    input: SolicitudMultiAtencionInput,
    usuarioOperador?: UsuarioOperadorContext,
    ipAddress?: string,
    prismaClient = defaultPrisma
  ) {
    return prismaClient.$transaction(async (tx) => {
      // Validar empresa cliente
      const empresa = await tx.empresaCliente.findUnique({
        where: { id: input.empresaClienteId }
      });
      if (!empresa) {
        const error = new Error('Empresa cliente no encontrada.');
        (error as any).statusCode = 404;
        (error as any).code = 'CLIENT_NOT_FOUND';
        throw error;
      }

      // Validar sucursal base y tenant isolation (SEC-01)
      const sucursal = await tx.sucursalFaena.findUnique({
        where: { id: input.sucursalFaenaId }
      });
      if (!sucursal) {
        const error = new Error('Sucursal faena no encontrada.');
        (error as any).statusCode = 404;
        (error as any).code = 'BRANCH_NOT_FOUND';
        throw error;
      }
      if (sucursal.empresaClienteId !== input.empresaClienteId) {
        const error = new Error('La sucursal faena principal no pertenece a la empresa cliente indicada.');
        (error as any).statusCode = 403;
        (error as any).code = 'FORBIDDEN_BRANCH_ACCESS';
        throw error;
      }

      // Generar folio único para SolicitudServicio
      const solCount = await tx.solicitudServicio.count();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const solFolio = `SOL-${new Date().getFullYear()}-${String(solCount + 1).padStart(4, '0')}-${randomSuffix}`;

      // Fecha preferente: fecha de la primera atención
      const fechaPreferente = new Date(input.atenciones[0]!.fechaHoraInicio);

      const solicitud = await tx.solicitudServicio.create({
        data: {
          folio: solFolio,
          empresaClienteId: input.empresaClienteId,
          sucursalFaenaId: input.sucursalFaenaId,
          tipoResiduo: input.tipoResiduo,
          descripcion: input.descripcion || null,
          cantidadEstimada: input.cantidadEstimada ? new Prisma.Decimal(input.cantidadEstimada) : null,
          unidadEstimada: input.unidadEstimada,
          fechaPreferente,
          estado: EstadoSolicitud.ENVIADA
        }
      });

      const atencionesCreadas: Array<{
        id: string;
        folio: string;
        fechaHoraInicio: Date;
        estado: EstadoAtencionProgramada;
      }> = [];

      let atencionIndex = 1;
      for (const item of input.atenciones) {
        // Validar sub-sucursal faena y tenant isolation si se especifica a nivel de atención (SEC-01)
        if (item.sucursalFaenaId) {
          const subSucursal = item.sucursalFaenaId === input.sucursalFaenaId
            ? sucursal
            : await tx.sucursalFaena.findUnique({ where: { id: item.sucursalFaenaId } });

          if (!subSucursal) {
            const error = new Error(`Sucursal faena ${item.sucursalFaenaId} no encontrada.`);
            (error as any).statusCode = 404;
            (error as any).code = 'BRANCH_NOT_FOUND';
            throw error;
          }

          if (subSucursal.empresaClienteId !== input.empresaClienteId) {
            const error = new Error(`La sucursal faena ${item.sucursalFaenaId} no pertenece a la empresa cliente indicada.`);
            (error as any).statusCode = 403;
            (error as any).code = 'FORBIDDEN_BRANCH_ACCESS';
            throw error;
          }
        }

        const apCount = await tx.atencionProgramada.count();
        const apRandom = Math.floor(100 + Math.random() * 900);
        const apFolio = `AP-${new Date().getFullYear()}-${String(apCount + atencionIndex).padStart(4, '0')}-${apRandom}`;
        atencionIndex++;

        const inicio = new Date(item.fechaHoraInicio);
        const fin = new Date(inicio.getTime() + item.duracionEstimadaMinutos * 60000);

        const atencion = await tx.atencionProgramada.create({
          data: {
            folio: apFolio,
            solicitudServicioId: solicitud.id,
            sucursalFaenaId: item.sucursalFaenaId || input.sucursalFaenaId,
            plantaDestinoId: item.plantaDestinoId || null,
            fechaHoraInicio: inicio,
            fechaHoraFinEstimada: fin,
            duracionEstimadaMinutos: item.duracionEstimadaMinutos,
            estado: EstadoAtencionProgramada.PENDIENTE_CONFIRMACION
          }
        });

        // Registrar detalle de servicios del catálogo
        for (const serv of item.servicios) {
          await tx.atencionServicioItem.create({
            data: {
              atencionProgramadaId: atencion.id,
              servicioCatalogoId: serv.servicioCatalogoId,
              cantidad: serv.cantidad,
              observaciones: serv.observaciones || null
            }
          });
        }

        atencionesCreadas.push({
          id: atencion.id,
          folio: atencion.folio,
          fechaHoraInicio: atencion.fechaHoraInicio,
          estado: atencion.estado
        });
      }

      // Validar si el usuarioId existe para FK de auditoría
      let auditoriaUsuarioId: string | null = null;
      if (usuarioOperador?.id) {
        const userExists = await tx.usuario.findUnique({
          where: { id: usuarioOperador.id },
          select: { id: true }
        });
        if (userExists) {
          auditoriaUsuarioId = userExists.id;
        }
      }

      // Registro de Auditoría
      await AuditService.registrar(tx, {
        usuarioId: auditoriaUsuarioId,
        accion: 'CREAR_SOLICITUD_MULTI_ATENCION',
        recurso: 'SolicitudServicio',
        recursoId: solicitud.id,
        detallesJson: {
          solicitudFolio: solicitud.folio,
          totalAtenciones: atencionesCreadas.length,
          atenciones: atencionesCreadas.map((a) => ({
            id: a.id,
            folio: a.folio,
            fechaHoraInicio: a.fechaHoraInicio.toISOString()
          }))
        },
        ipAddress: ipAddress || null
      });

      return {
        solicitudId: solicitud.id,
        solicitudFolio: solicitud.folio,
        totalAtencionesCreadas: atencionesCreadas.length,
        atenciones: atencionesCreadas.map((a) => ({
          id: a.id,
          folio: a.folio,
          fechaHoraInicio: a.fechaHoraInicio.toISOString(),
          estado: a.estado
        }))
      };
    });
  }

  /**
   * Asignación operativa de recursos (vehículo, conductor, planta, horario) a una atención programada.
   * Valida colisión dura y margen de traslado, genera Orden de Servicio 1:1, emite notificación in-app y audita.
   */
  static async asignarAtencion(
    atencionId: string,
    input: AsignarAtencionInput,
    usuarioOperador?: UsuarioOperadorContext,
    ipAddress?: string,
    prismaClient = defaultPrisma
  ) {
    let emailAviso: {
      destinatarioEmail: string;
      clienteNombre: string;
      folioAtencion: string;
      fechaHoraInicio: Date;
      duracionMinutos: number;
      sucursalNombre: string;
      sucursalComuna: string;
      vehiculoPatente?: string;
    } | null = null;

    const resultadoTransaccion = await prismaClient.$transaction(async (tx) => {
      const atencion = await tx.atencionProgramada.findUnique({
        where: { id: atencionId },
        include: {
          sucursalFaena: true,
          solicitudServicio: {
            include: {
              empresaCliente: true,
              ordenServicio: true
            }
          },
          vehiculo: true,
          conductor: true,
          ordenServicio: true
        }
      });

      if (!atencion) {
        const error = new Error('Atención programada no encontrada.');
        (error as any).statusCode = 404;
        (error as any).code = 'ATTENTION_NOT_FOUND';
        throw error;
      }

      // Bloqueo pesimista sobre vehículo y conductor para prevenir colisiones concurrentes (SEC-02)
      await tx.$executeRaw`SELECT id FROM vehiculos WHERE id = ${input.vehiculoId} FOR UPDATE`;
      await tx.$executeRaw`SELECT id FROM usuarios WHERE id = ${input.conductorId} FOR UPDATE`;

      // Validar existencia de vehículo y conductor
      const vehiculo = await tx.vehiculo.findUnique({
        where: { id: input.vehiculoId }
      });
      if (!vehiculo) {
        const error = new Error('Vehículo no encontrado.');
        (error as any).statusCode = 404;
        (error as any).code = 'VEHICLE_NOT_FOUND';
        throw error;
      }
      if (vehiculo.estado !== 'HABILITADO' || !vehiculo.activo) {
        const error = new Error(`El vehículo ${vehiculo.patente} no se encuentra habilitado para operar (estado: ${vehiculo.estado}).`);
        (error as any).statusCode = 400;
        (error as any).code = 'VEHICLE_NOT_OPERATIONAL';
        throw error;
      }

      const conductor = await tx.usuario.findUnique({
        where: { id: input.conductorId }
      });
      if (!conductor) {
        const error = new Error('Conductor no encontrado.');
        (error as any).statusCode = 404;
        (error as any).code = 'DRIVER_NOT_FOUND';
        throw error;
      }
      if (conductor.rol !== 'CONDUCTOR' || !conductor.activo) {
        const error = new Error(`El usuario asignado ${conductor.nombre} ${conductor.apellido} no posee el rol de conductor o no se encuentra activo.`);
        (error as any).statusCode = 400;
        (error as any).code = 'INVALID_DRIVER';
        throw error;
      }

      const fechaHoraInicio = new Date(input.fechaHoraInicio);
      const comunaDestino = atencion.sucursalFaena.comuna;

      // Validación algorítmica de conflictos de disponibilidad y traslado
      const resultadoDisponibilidad = await PlanningConflictService.validarDisponibilidad({
        vehiculoId: input.vehiculoId,
        conductorId: input.conductorId,
        fechaHoraInicio,
        duracionEstimadaMinutos: input.duracionEstimadaMinutos,
        comunaDestino,
        excludeAtencionId: atencion.id,
        forzarConJustificacion: input.forzarConJustificacion,
        justificacionForzado: input.justificacionForzado,
        client: tx
      });

      const fechaHoraFinEstimada = new Date(fechaHoraInicio.getTime() + input.duracionEstimadaMinutos * 60000);

      // Generar o vincular OrdenServicio 1:1
      let ordenServicioId = atencion.ordenServicioId;
      let ordenServicioFolio = atencion.ordenServicio?.folio;

      if (!ordenServicioId) {
        const osCount = await tx.ordenServicio.count();
        const osRandom = Math.floor(100 + Math.random() * 900);
        const nuevoOsFolio = `OS-${new Date().getFullYear()}-${String(osCount + 1).padStart(4, '0')}-${osRandom}`;

        // Determinar si la SolicitudServicio principal ya tiene una OrdenServicio
        let targetSolicitudId = atencion.solicitudServicioId;
        if (atencion.solicitudServicio.ordenServicio) {
          // Ya existe una OS asociada a la solicitud raíz; creamos una solicitud específica para la atención
          const subSolicitudFolio = `${atencion.solicitudServicio.folio}-${atencion.folio}`;
          const subSolicitud = await tx.solicitudServicio.create({
            data: {
              folio: subSolicitudFolio,
              empresaClienteId: atencion.solicitudServicio.empresaClienteId,
              sucursalFaenaId: atencion.sucursalFaenaId,
              tipoResiduo: atencion.solicitudServicio.tipoResiduo,
              descripcion: `Atención programada individual ${atencion.folio}`,
              cantidadEstimada: atencion.solicitudServicio.cantidadEstimada,
              unidadEstimada: atencion.solicitudServicio.unidadEstimada,
              fechaPreferente: fechaHoraInicio,
              estado: EstadoSolicitud.APROBADA
            }
          });
          targetSolicitudId = subSolicitud.id;
        }

        const nuevaOrden = await tx.ordenServicio.create({
          data: {
            folio: nuevoOsFolio,
            solicitudServicioId: targetSolicitudId,
            estado: EstadoOrdenServicio.PLANIFICADA,
            observaciones: input.forzarConJustificacion
              ? `Asignación con traslado forzado: ${input.justificacionForzado}`
              : null,
            cicloTransporte: { create: {} },
            expediente: { create: {} }
          }
        });

        ordenServicioId = nuevaOrden.id;
        ordenServicioFolio = nuevaOrden.folio;
      }

      // Actualizar la atención programada
      const atencionActualizada = await tx.atencionProgramada.update({
        where: { id: atencionId },
        data: {
          vehiculoId: input.vehiculoId,
          conductorId: input.conductorId,
          plantaDestinoId: input.plantaDestinoId || atencion.plantaDestinoId,
          jornadaId: input.jornadaId || atencion.jornadaId,
          fechaHoraInicio,
          fechaHoraFinEstimada,
          duracionEstimadaMinutos: input.duracionEstimadaMinutos,
          estado: EstadoAtencionProgramada.PROGRAMADA,
          ordenServicioId,
          justificacionForzado: input.forzarConJustificacion ? input.justificacionForzado : null
        },
        include: {
          vehiculo: true,
          conductor: true,
          sucursalFaena: true
        }
      });

      // Despacho de Notificación In-App al Conductor
      const notificacion = await tx.notificacionConductor.create({
        data: {
          conductorId: input.conductorId,
          tipo: 'ASIGNACION_SERVICIO',
          titulo: `Nuevo servicio asignado: ${atencionActualizada.folio}`,
          mensaje: `Se le ha asignado la atención ${atencionActualizada.folio} para el día ${atencionActualizada.fechaHoraInicio.toISOString()} en ${atencionActualizada.sucursalFaena.nombre} (${atencionActualizada.sucursalFaena.comuna}).`,
          leida: false,
          metadata: {
            atencionId: atencionActualizada.id,
            folio: atencionActualizada.folio,
            vehiculoPatente: vehiculo.patente,
            fechaHoraInicio: atencionActualizada.fechaHoraInicio.toISOString(),
            comuna: atencionActualizada.sucursalFaena.comuna
          }
        }
      });

      // Validar si el usuarioId existe para FK de auditoría
      let auditoriaUsuarioId: string | null = null;
      if (usuarioOperador?.id) {
        const userExists = await tx.usuario.findUnique({
          where: { id: usuarioOperador.id },
          select: { id: true }
        });
        if (userExists) {
          auditoriaUsuarioId = userExists.id;
        }
      }

      // Registro Inmutable en Auditoría
      await AuditService.registrar(tx, {
        usuarioId: auditoriaUsuarioId,
        accion: resultadoDisponibilidad.autorizadaConForzado
          ? 'PLANIFICACION_FORZADA_TRASLADO'
          : 'ASIGNACION_SERVICIO',
        recurso: 'AtencionProgramada',
        recursoId: atencionActualizada.id,
        detallesJson: {
          folio: atencionActualizada.folio,
          vehiculoId: input.vehiculoId,
          vehiculoPatente: vehiculo.patente,
          conductorId: input.conductorId,
          conductorNombre: `${conductor.nombre} ${conductor.apellido}`.trim(),
          fechaHoraInicio: atencionActualizada.fechaHoraInicio.toISOString(),
          forzado: resultadoDisponibilidad.autorizadaConForzado,
          justificacionForzado: input.justificacionForzado || null,
          ordenServicioId,
          ordenServicioFolio
        },
        ipAddress: ipAddress || null
      });

      // Preparar datos de correo para cliente
      if (atencion.solicitudServicio.empresaCliente) {
        emailAviso = {
          destinatarioEmail: atencion.sucursalFaena.contactoEmail || 'cliente@zion.cl',
          clienteNombre: atencion.solicitudServicio.empresaCliente.razonSocial,
          folioAtencion: atencionActualizada.folio,
          fechaHoraInicio: atencionActualizada.fechaHoraInicio,
          duracionMinutos: atencionActualizada.duracionEstimadaMinutos,
          sucursalNombre: atencionActualizada.sucursalFaena.nombre,
          sucursalComuna: atencionActualizada.sucursalFaena.comuna,
          vehiculoPatente: vehiculo.patente
        };
      }

      return {
        atencionId: atencionActualizada.id,
        estado: atencionActualizada.estado,
        ordenServicioGenerada: {
          id: ordenServicioId,
          folio: ordenServicioFolio
        },
        notificacionConductorId: notificacion.id
      };
    });

    // Despacho asíncrono y resiliente de correo
    if (emailAviso) {
      EmailService.enviarConfirmacionAtencion(emailAviso).catch((err) => {
        logger.error('Fallo no bloqueante al enviar correo de confirmación', { error: err.message });
      });
    }

    return resultadoTransaccion;
  }

  /**
   * Reasignación operativa de recursos (camión, chofer, horario) con emisión de notificaciones
   * a conductores afectados (saliente y entrante), auditoría inmutable y aviso al cliente.
   */
  static async reasignarAtencion(
    atencionId: string,
    input: ReasignarAtencionInput,
    usuarioOperador?: UsuarioOperadorContext,
    ipAddress?: string,
    prismaClient = defaultPrisma
  ) {
    let emailReprogramacion: {
      destinatarioEmail: string;
      clienteNombre: string;
      folioAtencion: string;
      fechaHoraAnterior: Date;
      nuevaFechaHora: Date;
      motivo: string;
      sucursalNombre: string;
    } | null = null;

    const resultadoTransaccion = await prismaClient.$transaction(async (tx) => {
      const atencion = await tx.atencionProgramada.findUnique({
        where: { id: atencionId },
        include: {
          vehiculo: true,
          conductor: true,
          sucursalFaena: true,
          solicitudServicio: {
            include: { empresaCliente: true }
          }
        }
      });

      if (!atencion) {
        const error = new Error('Atención programada no encontrada.');
        (error as any).statusCode = 404;
        (error as any).code = 'ATTENTION_NOT_FOUND';
        throw error;
      }

      const targetVehiculoId = input.nuevoVehiculoId || atencion.vehiculoId;
      const targetConductorId = input.nuevoConductorId || atencion.conductorId;
      const targetFechaHoraInicio = input.nuevaFechaHoraInicio
        ? new Date(input.nuevaFechaHoraInicio)
        : atencion.fechaHoraInicio;
      const targetDuracion = input.nuevaDuracionEstimadaMinutos ?? atencion.duracionEstimadaMinutos;
      const targetPlantaDestinoId =
        input.nuevaPlantaDestinoId !== undefined ? input.nuevaPlantaDestinoId : atencion.plantaDestinoId;

      // Bloqueo pesimista y validación operacional de recursos (SEC-02, SEC-04)
      if (targetVehiculoId) {
        await tx.$executeRaw`SELECT id FROM vehiculos WHERE id = ${targetVehiculoId} FOR UPDATE`;
        const vehiculoObj = await tx.vehiculo.findUnique({
          where: { id: targetVehiculoId }
        });
        if (!vehiculoObj) {
          const error = new Error('Vehículo no encontrado.');
          (error as any).statusCode = 404;
          (error as any).code = 'VEHICLE_NOT_FOUND';
          throw error;
        }
        if (vehiculoObj.estado !== 'HABILITADO' || !vehiculoObj.activo) {
          const error = new Error(`El vehículo ${vehiculoObj.patente} no se encuentra habilitado para operar (estado: ${vehiculoObj.estado}).`);
          (error as any).statusCode = 400;
          (error as any).code = 'VEHICLE_NOT_OPERATIONAL';
          throw error;
        }
      }

      if (targetConductorId) {
        await tx.$executeRaw`SELECT id FROM usuarios WHERE id = ${targetConductorId} FOR UPDATE`;
        const conductorObj = await tx.usuario.findUnique({
          where: { id: targetConductorId }
        });
        if (!conductorObj) {
          const error = new Error('Conductor no encontrado.');
          (error as any).statusCode = 404;
          (error as any).code = 'DRIVER_NOT_FOUND';
          throw error;
        }
        if (conductorObj.rol !== 'CONDUCTOR' || !conductorObj.activo) {
          const error = new Error(`El usuario asignado ${conductorObj.nombre} ${conductorObj.apellido} no posee el rol de conductor o no se encuentra activo.`);
          (error as any).statusCode = 400;
          (error as any).code = 'INVALID_DRIVER';
          throw error;
        }
      }

      let fueForzado = false;

      // Si ambos recursos están definidos, validar disponibilidad y traslados
      if (targetVehiculoId && targetConductorId) {
        const check = await PlanningConflictService.validarDisponibilidad({
          vehiculoId: targetVehiculoId,
          conductorId: targetConductorId,
          fechaHoraInicio: targetFechaHoraInicio,
          duracionEstimadaMinutos: targetDuracion,
          comunaDestino: atencion.sucursalFaena.comuna,
          excludeAtencionId: atencion.id,
          forzarConJustificacion: input.forzarConJustificacion,
          justificacionForzado: input.justificacionForzado,
          client: tx
        });
        fueForzado = check.autorizadaConForzado;
      }

      const targetFechaHoraFin = new Date(targetFechaHoraInicio.getTime() + targetDuracion * 60000);

      // Notificaciones a conductores si cambió el chofer
      const conductorAnteriorId = atencion.conductorId;
      const conductorNuevoId = targetConductorId;

      if (conductorAnteriorId && conductorNuevoId && conductorAnteriorId !== conductorNuevoId) {
        // Notificar al conductor anterior (desasignación)
        await tx.notificacionConductor.create({
          data: {
            conductorId: conductorAnteriorId,
            tipo: 'DESASIGNACION_SERVICIO',
            titulo: `Servicio reasignado: ${atencion.folio}`,
            mensaje: `La atención ${atencion.folio} ha sido transferida a otro operador. Motivo: ${input.motivoReasignacion}.`,
            leida: false,
            metadata: {
              atencionId: atencion.id,
              folio: atencion.folio,
              motivo: input.motivoReasignacion
            }
          }
        });

        // Notificar al nuevo conductor (asignación)
        await tx.notificacionConductor.create({
          data: {
            conductorId: conductorNuevoId,
            tipo: 'ASIGNACION_SERVICIO',
            titulo: `Servicio reasignado a su cargo: ${atencion.folio}`,
            mensaje: `Se le ha asignado la atención ${atencion.folio} para el día ${targetFechaHoraInicio.toISOString()} en ${atencion.sucursalFaena.nombre}.`,
            leida: false,
            metadata: {
              atencionId: atencion.id,
              folio: atencion.folio,
              motivo: input.motivoReasignacion
            }
          }
        });
      } else if (conductorNuevoId) {
        // Conductor no cambió pero cambió fecha/camión -> actualización
        await tx.notificacionConductor.create({
          data: {
            conductorId: conductorNuevoId,
            tipo: 'REASIGNACION_SERVICIO',
            titulo: `Horario o unidad actualizada: ${atencion.folio}`,
            mensaje: `La atención ${atencion.folio} ha sido actualizada. Nueva fecha: ${targetFechaHoraInicio.toISOString()}. Motivo: ${input.motivoReasignacion}.`,
            leida: false,
            metadata: {
              atencionId: atencion.id,
              folio: atencion.folio,
              nuevaFechaHoraInicio: targetFechaHoraInicio.toISOString()
            }
          }
        });
      }

      // Actualizar registro en base de datos
      const atencionActualizada = await tx.atencionProgramada.update({
        where: { id: atencionId },
        data: {
          vehiculoId: targetVehiculoId,
          conductorId: targetConductorId,
          plantaDestinoId: targetPlantaDestinoId,
          fechaHoraInicio: targetFechaHoraInicio,
          fechaHoraFinEstimada: targetFechaHoraFin,
          duracionEstimadaMinutos: targetDuracion,
          estado: EstadoAtencionProgramada.PROGRAMADA,
          observacionesInternas: input.motivoReasignacion,
          justificacionForzado: input.forzarConJustificacion
            ? input.justificacionForzado
            : atencion.justificacionForzado
        }
      });

      // Validar si el usuarioId existe para FK de auditoría
      let auditoriaUsuarioId: string | null = null;
      if (usuarioOperador?.id) {
        const userExists = await tx.usuario.findUnique({
          where: { id: usuarioOperador.id },
          select: { id: true }
        });
        if (userExists) {
          auditoriaUsuarioId = userExists.id;
        }
      }

      // Registro de Auditoría Inmutable
      await AuditService.registrar(tx, {
        usuarioId: auditoriaUsuarioId,
        accion: fueForzado ? 'PLANIFICACION_FORZADA_TRASLADO' : 'REASIGNACION_SERVICIO',
        recurso: 'AtencionProgramada',
        recursoId: atencion.id,
        detallesJson: {
          folio: atencion.folio,
          motivoReasignacion: input.motivoReasignacion,
          forzado: fueForzado,
          justificacionForzado: input.justificacionForzado || null,
          valoresPrevios: {
            vehiculoId: atencion.vehiculoId,
            conductorId: atencion.conductorId,
            fechaHoraInicio: atencion.fechaHoraInicio.toISOString(),
            duracionEstimadaMinutos: atencion.duracionEstimadaMinutos
          },
          valoresNuevos: {
            vehiculoId: targetVehiculoId,
            conductorId: targetConductorId,
            fechaHoraInicio: targetFechaHoraInicio.toISOString(),
            duracionEstimadaMinutos: targetDuracion
          }
        },
        ipAddress: ipAddress || null
      });

      // Preparar datos para correo al cliente si hubo cambio de fecha
      if (
        atencion.solicitudServicio.empresaCliente &&
        atencion.fechaHoraInicio.getTime() !== targetFechaHoraInicio.getTime()
      ) {
        emailReprogramacion = {
          destinatarioEmail: atencion.sucursalFaena.contactoEmail || 'cliente@zion.cl',
          clienteNombre: atencion.solicitudServicio.empresaCliente.razonSocial,
          folioAtencion: atencion.folio,
          fechaHoraAnterior: atencion.fechaHoraInicio,
          nuevaFechaHora: targetFechaHoraInicio,
          motivo: input.motivoReasignacion,
          sucursalNombre: atencion.sucursalFaena.nombre
        };
      }

      return {
        atencionId: atencionActualizada.id,
        estado: atencionActualizada.estado,
        mensaje: 'Atención reasignada exitosamente'
      };
    });

    if (emailReprogramacion) {
      EmailService.enviarReprogramacionAtencion(emailReprogramacion).catch((err) => {
        logger.error('Fallo no bloqueante al enviar correo de reprogramación', { error: err.message });
      });
    }

    return resultadoTransaccion;
  }
}
