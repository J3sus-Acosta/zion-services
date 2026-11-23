import {
  RolUsuario,
  EstadoEquipo,
  OrigenBloqueo,
  EstadoJornada,
  EstadoOrdenServicio,
  Vehiculo,
  Prisma
} from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { AuditService } from './audit.service.js';
import {
  CrearEquipoInput,
  EditarEquipoInput,
  CambiarEstadoInput,
  TransferirJornadasInput,
  ListarFlotaQuery
} from '../schemas/fleet.schema.js';

export class FleetError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'FleetError';
  }
}

export const ROLES_GESTION_FLOTA: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.ADMIN,
  RolUsuario.JEFE_OPERACIONES
];

export const ROLES_LEVANTAN_BLOQUEO_CHECKLIST: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.ADMIN
];

export interface FleetActor {
  userId?: string;
  rol?: RolUsuario;
  ip?: string;
}

export interface ResumenTransferencia {
  destino: {
    id: string;
    patente: string;
    marca: string;
    modelo: string;
  };
  jornadasTransferidas: string[];
  ordenes: string[];
  expedientes: string[];
}

export class FleetService {
  /**
   * 1. Listar equipos con filtros opcionales (tipoEquipo, estado, busqueda)
   */
  static async listar(filtros?: ListarFlotaQuery) {
    const where: Prisma.VehiculoWhereInput = {};

    if (filtros?.tipoEquipo) {
      where.tipoEquipo = filtros.tipoEquipo;
    }

    if (filtros?.estado) {
      where.estado = filtros.estado;
    }

    if (filtros?.busqueda) {
      const busqueda = filtros.busqueda.trim();
      where.OR = [
        { patente: { contains: busqueda } },
        { marca: { contains: busqueda } },
        { modelo: { contains: busqueda } }
      ];
    }

    return await prisma.vehiculo.findMany({
      where,
      orderBy: { patente: 'asc' },
      include: {
        estadoCambiadoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            rol: true
          }
        }
      }
    });
  }

  /**
   * 2. Obtener un equipo por ID
   */
  static async obtener(id: string) {
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id },
      include: {
        estadoCambiadoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            rol: true
          }
        }
      }
    });

    if (!vehiculo) {
      throw new FleetError(404, 'FLEET_NOT_FOUND', 'Equipo no encontrado');
    }

    return vehiculo;
  }

  /**
   * 3. Crear nuevo equipo (estado HABILITADO por defecto)
   */
  static async crear(data: CrearEquipoInput, actor: FleetActor) {
    const patente = data.patente.trim().toUpperCase();

    // Verificación preventiva de duplicidad de patente
    const existente = await prisma.vehiculo.findUnique({ where: { patente } });
    if (existente) {
      throw new FleetError(
        409,
        'FLEET_PLATE_DUPLICATE',
        `Ya existe un equipo registrado con la patente ${patente}.`
      );
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const vehiculo = await tx.vehiculo.create({
          data: {
            patente,
            tipoEquipo: data.tipoEquipo,
            marca: data.marca,
            modelo: data.modelo,
            anio: data.anio,
            capacidadEstanqueM3: data.capacidadEstanqueM3,
            equipoHidrojet: data.equipoHidrojet ?? false,
            equipoVacio: data.equipoVacio ?? false,
            observaciones: data.observaciones ?? null,
            estado: EstadoEquipo.HABILITADO,
            motivoEstado: null,
            origenBloqueo: null
          }
        });

        await AuditService.registrar(tx, {
          accion: 'FLOTA_CREAR',
          recurso: 'Vehiculo',
          recursoId: vehiculo.id,
          usuarioId: actor.userId,
          ipAddress: actor.ip,
          detallesJson: {
            patente: vehiculo.patente,
            tipoEquipo: vehiculo.tipoEquipo,
            marca: vehiculo.marca,
            modelo: vehiculo.modelo,
            anio: vehiculo.anio,
            capacidadEstanqueM3: Number(vehiculo.capacidadEstanqueM3),
            equipoHidrojet: vehiculo.equipoHidrojet,
            equipoVacio: vehiculo.equipoVacio
          }
        });

        return vehiculo;
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new FleetError(
          409,
          'FLEET_PLATE_DUPLICATE',
          `Ya existe un equipo registrado con la patente ${patente}.`
        );
      }
      throw error;
    }
  }

  /**
   * 4. Editar características de un equipo (parcial, no admite estado)
   */
  static async editar(id: string, data: EditarEquipoInput, actor: FleetActor) {
    const vehiculo = await prisma.vehiculo.findUnique({ where: { id } });
    if (!vehiculo) {
      throw new FleetError(404, 'FLEET_NOT_FOUND', 'Equipo no encontrado');
    }

    let patenteNormalizada: string | undefined;
    if (data.patente) {
      patenteNormalizada = data.patente.trim().toUpperCase();
      if (patenteNormalizada !== vehiculo.patente) {
        const existente = await prisma.vehiculo.findUnique({ where: { patente: patenteNormalizada } });
        if (existente) {
          throw new FleetError(
            409,
            'FLEET_PLATE_DUPLICATE',
            `Ya existe un equipo registrado con la patente ${patenteNormalizada}.`
          );
        }
      }
    }

    // Calcular campos modificados para auditoría
    const previos: Record<string, any> = {};
    const nuevos: Record<string, any> = {};

    const campos = [
      'patente',
      'tipoEquipo',
      'marca',
      'modelo',
      'anio',
      'capacidadEstanqueM3',
      'equipoHidrojet',
      'equipoVacio',
      'observaciones'
    ] as const;

    for (const campo of campos) {
      if (campo in data) {
        const valNuevo = campo === 'patente' ? patenteNormalizada : data[campo as keyof EditarEquipoInput];
        const valPrevio = (vehiculo as Record<string, unknown>)[campo];
        if (campo === 'capacidadEstanqueM3') {
          if (valNuevo !== undefined && Number(valNuevo) !== Number(valPrevio)) {
            previos[campo] = Number(valPrevio);
            nuevos[campo] = Number(valNuevo);
          }
        } else if (valNuevo !== undefined && valNuevo !== valPrevio) {
          previos[campo] = valPrevio;
          nuevos[campo] = valNuevo;
        }
      }
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const actualizado = await tx.vehiculo.update({
          where: { id },
          data: {
            ...(patenteNormalizada ? { patente: patenteNormalizada } : {}),
            ...(data.tipoEquipo !== undefined ? { tipoEquipo: data.tipoEquipo } : {}),
            ...(data.marca !== undefined ? { marca: data.marca } : {}),
            ...(data.modelo !== undefined ? { modelo: data.modelo } : {}),
            ...(data.anio !== undefined ? { anio: data.anio } : {}),
            ...(data.capacidadEstanqueM3 !== undefined
              ? { capacidadEstanqueM3: data.capacidadEstanqueM3 }
              : {}),
            ...(data.equipoHidrojet !== undefined ? { equipoHidrojet: data.equipoHidrojet } : {}),
            ...(data.equipoVacio !== undefined ? { equipoVacio: data.equipoVacio } : {}),
            ...(data.observaciones !== undefined ? { observaciones: data.observaciones } : {})
          },
          include: {
            estadoCambiadoPor: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
                rol: true
              }
            }
          }
        });

        if (Object.keys(nuevos).length > 0) {
          await AuditService.registrar(tx, {
            accion: 'FLOTA_EDITAR',
            recurso: 'Vehiculo',
            recursoId: id,
            usuarioId: actor.userId,
            ipAddress: actor.ip,
            detallesJson: {
              previos,
              nuevos
            }
          });
        }

        return actualizado;
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new FleetError(
          409,
          'FLEET_PLATE_DUPLICATE',
          `Ya existe un equipo registrado con la patente ${patenteNormalizada}.`
        );
      }
      throw error;
    }
  }

  /**
   * 5. Obtener operaciones afectadas por un equipo (jornadas activas y candidatos de reemplazo)
   */
  static async obtenerOperacionesAfectadas(vehiculoId: string) {
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id: vehiculoId }
    });
    if (!vehiculo) {
      throw new FleetError(404, 'FLEET_NOT_FOUND', 'Equipo no encontrado');
    }

    const jornadasActivas = await prisma.jornada.findMany({
      where: {
        vehiculoId,
        estado: { in: [EstadoJornada.PROGRAMADA, EstadoJornada.EN_CURSO] }
      },
      include: {
        conductor: {
          include: {
            usuario: true
          }
        },
        hojasDeRuta: {
          include: {
            tramosRuta: {
              include: {
                ordenServicio: {
                  include: {
                    expediente: true,
                    cicloTransporte: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const estadosNoActivos: EstadoOrdenServicio[] = [
      EstadoOrdenServicio.EJECUTADA,
      EstadoOrdenServicio.LIQUIDADA,
      EstadoOrdenServicio.CERRADA,
      EstadoOrdenServicio.CANCELADA
    ];

    const jornadasMapeadas = jornadasActivas.map((j) => {
      const ordenesMap = new Map<string, any>();
      for (const hr of j.hojasDeRuta) {
        for (const tr of hr.tramosRuta) {
          if (
            tr.ordenServicio &&
            !estadosNoActivos.includes(tr.ordenServicio.estado)
          ) {
            ordenesMap.set(tr.ordenServicio.id, {
              id: tr.ordenServicio.id,
              numero: tr.ordenServicio.folio,
              estado: tr.ordenServicio.estado,
              expedienteId: tr.ordenServicio.expediente?.id ?? null,
              cicloTransporteEstado: tr.ordenServicio.cicloTransporte?.estado ?? null
            });
          }
        }
      }

      return {
        id: j.id,
        estado: j.estado,
        fechaInicio: j.fechaInicio,
        fechaFin: j.fechaFin,
        conductor: {
          id: j.conductor.id,
          nombre: `${j.conductor.usuario.nombre} ${j.conductor.usuario.apellido}`,
          rut: j.conductor.usuario.rut
        },
        ordenes: Array.from(ordenesMap.values())
      };
    });

    // Candidatos habilitados distintos al origen
    const candidatos = await prisma.vehiculo.findMany({
      where: {
        estado: EstadoEquipo.HABILITADO,
        id: { not: vehiculoId }
      },
      include: {
        jornadas: {
          where: {
            estado: { in: [EstadoJornada.PROGRAMADA, EstadoJornada.EN_CURSO] }
          }
        }
      }
    });

    const candidatosMapeados = candidatos.map((c) => {
      let tieneConflicto = false;
      for (const jc of c.jornadas) {
        const jcStart = jc.fechaInicio.getTime();
        const jcEnd = jc.fechaFin ? jc.fechaFin.getTime() : jcStart + 24 * 60 * 60 * 1000;

        for (const jo of jornadasActivas) {
          const joStart = jo.fechaInicio.getTime();
          const joEnd = jo.fechaFin ? jo.fechaFin.getTime() : joStart + 24 * 60 * 60 * 1000;

          if (jcStart <= joEnd && jcEnd >= joStart) {
            tieneConflicto = true;
            break;
          }
        }
        if (tieneConflicto) break;
      }

      return {
        id: c.id,
        patente: c.patente,
        tipoEquipo: c.tipoEquipo,
        marca: c.marca,
        modelo: c.modelo,
        capacidadEstanqueM3: Number(c.capacidadEstanqueM3),
        tieneConflicto
      };
    });

    // Ordenar: primero los de igual tipoEquipo, luego alfabéticamente por patente
    candidatosMapeados.sort((a, b) => {
      const aMismoTipo = a.tipoEquipo === vehiculo.tipoEquipo ? 0 : 1;
      const bMismoTipo = b.tipoEquipo === vehiculo.tipoEquipo ? 0 : 1;
      if (aMismoTipo !== bMismoTipo) return aMismoTipo - bMismoTipo;
      return a.patente.localeCompare(b.patente);
    });

    return {
      jornadas: jornadasMapeadas,
      candidatos: candidatosMapeados
    };
  }

  /**
   * 6. Cambiar estado de un equipo (HABILITADO / DESHABILITADO)
   */
  static async cambiarEstado(
    id: string,
    input: CambiarEstadoInput,
    actor: FleetActor
  ): Promise<{ equipo: Vehiculo; transferencia: ResumenTransferencia | null }> {
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id }
    });

    if (!vehiculo) {
      throw new FleetError(404, 'FLEET_NOT_FOUND', 'Equipo no encontrado');
    }

    // Conflicto de estado explícito (idempotencia)
    if (input.estado === vehiculo.estado) {
      throw new FleetError(
        409,
        'FLEET_STATE_CONFLICT',
        `El equipo ya se encuentra en estado ${input.estado}.`
      );
    }

    if (input.estado === EstadoEquipo.HABILITADO) {
      // Regla R1 / D6 / D10: solo SUPERADMIN o ADMIN levantan bloqueos CHECKLIST_SEGURIDAD
      if (vehiculo.origenBloqueo === OrigenBloqueo.CHECKLIST_SEGURIDAD) {
        if (!actor.rol || !ROLES_LEVANTAN_BLOQUEO_CHECKLIST.includes(actor.rol)) {
          throw new FleetError(
            403,
            'FLEET_UNLOCK_FORBIDDEN',
            'Solo usuarios con rol SUPERADMIN o ADMIN pueden levantar un bloqueo originado por Checklist de Seguridad.'
          );
        }
      }

      const equipo = await prisma.$transaction(async (tx) => {
        const act = await tx.vehiculo.update({
          where: { id },
          data: {
            estado: EstadoEquipo.HABILITADO,
            motivoEstado: null,
            origenBloqueo: null,
            estadoCambiadoAt: new Date(),
            estadoCambiadoPorId: actor.userId ?? null
          },
          include: {
            estadoCambiadoPor: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
                rol: true
              }
            }
          }
        });

        await AuditService.registrar(tx, {
          accion: 'FLOTA_HABILITAR',
          recurso: 'Vehiculo',
          recursoId: id,
          usuarioId: actor.userId,
          ipAddress: actor.ip,
          detallesJson: {
            motivoPrevio: vehiculo.motivoEstado,
            origenPrevio: vehiculo.origenBloqueo
          }
        });

        return act;
      });

      return { equipo, transferencia: null };
    }

    // input.estado === DESHABILITADO
    if (!input.motivo || input.motivo.trim().length === 0) {
      throw new FleetError(
        400,
        'VALIDATION_ERROR',
        'El motivo de deshabilitación es obligatorio.'
      );
    }

    const jornadasActivas = await prisma.jornada.findMany({
      where: {
        vehiculoId: id,
        estado: { in: [EstadoJornada.PROGRAMADA, EstadoJornada.EN_CURSO] }
      }
    });

    if (jornadasActivas.length > 0) {
      // Regla R7 / D12: deshabilitar con jornadas activas requiere destino obligatorio
      if (!input.vehiculoDestinoId) {
        throw new FleetError(
          409,
          'FLEET_TRANSFER_REQUIRED',
          `El equipo tiene ${jornadasActivas.length} jornada(s) activa(s). Se requiere un equipo de reemplazo (vehiculoDestinoId) para transferir las operaciones.`
        );
      }

      // Transferencia transaccional y cambio a DESHABILITADO
      const transferencia = await this.transferirJornadasTransaccional({
        origenId: id,
        destinoId: input.vehiculoDestinoId,
        deshabilitarOrigen: { motivo: input.motivo },
        actor
      });

      const equipoActualizado = (await prisma.vehiculo.findUnique({
        where: { id },
        include: {
          estadoCambiadoPor: {
            select: { id: true, nombre: true, apellido: true, email: true, rol: true }
          }
        }
      }))!;

      return { equipo: equipoActualizado, transferencia };
    }

    // Sin jornadas activas: deshabilitar directamente
    const equipo = await prisma.$transaction(async (tx) => {
      const act = await tx.vehiculo.update({
        where: { id },
        data: {
          estado: EstadoEquipo.DESHABILITADO,
          motivoEstado: input.motivo,
          origenBloqueo: OrigenBloqueo.MANUAL,
          estadoCambiadoAt: new Date(),
          estadoCambiadoPorId: actor.userId ?? null
        },
        include: {
          estadoCambiadoPor: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
              rol: true
            }
          }
        }
      });

      await AuditService.registrar(tx, {
        accion: 'FLOTA_DESHABILITAR',
        recurso: 'Vehiculo',
        recursoId: id,
        usuarioId: actor.userId,
        ipAddress: actor.ip,
        detallesJson: {
          motivo: input.motivo,
          origenBloqueo: 'MANUAL',
          estadoPrevio: vehiculo.estado,
          operacionesAfectadas: []
        }
      });

      return act;
    });

    return { equipo, transferencia: null };
  }

  /**
   * 7. Transferir jornadas activas a otro equipo (sin modificar estado del origen)
   */
  static async transferir(
    origenId: string,
    input: TransferirJornadasInput,
    actor: FleetActor
  ): Promise<{ transferencia: ResumenTransferencia }> {
    const transferencia = await this.transferirJornadasTransaccional({
      origenId,
      destinoId: input.vehiculoDestinoId,
      jornadaIds: input.jornadaIds,
      actor
    });

    return { transferencia };
  }

  /**
   * 8. Guardia reutilizable para comprobar si un vehículo puede ser despachado/operado
   */
  static async assertDespachable(vehiculoId: string): Promise<void> {
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id: vehiculoId }
    });

    if (!vehiculo) {
      throw new FleetError(404, 'FLEET_NOT_FOUND', 'Equipo no encontrado');
    }

    if (vehiculo.estado === EstadoEquipo.DESHABILITADO) {
      throw new FleetError(
        409,
        'FLEET_DISABLED',
        `Equipo deshabilitado: ${vehiculo.motivoEstado || 'Sin motivo especificado'}`
      );
    }
  }

  /**
   * 9. Bloquear equipo por falla crítica en checklist de seguridad F-GMT
   */
  static async bloquearPorChecklist(
    vehiculoId: string,
    motivo: string,
    actor: { userId?: string; ip?: string }
  ): Promise<void> {
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id: vehiculoId }
    });

    if (!vehiculo) {
      throw new FleetError(404, 'FLEET_NOT_FOUND', 'Equipo no encontrado');
    }

    await prisma.$transaction(async (tx) => {
      // D4 / 3.4: Si ya está DESHABILITADO (ej. MANUAL vigente), no se sobreescribe el motivo ni origen
      if (vehiculo.estado !== EstadoEquipo.DESHABILITADO) {
        await tx.vehiculo.update({
          where: { id: vehiculoId },
          data: {
            estado: EstadoEquipo.DESHABILITADO,
            origenBloqueo: OrigenBloqueo.CHECKLIST_SEGURIDAD,
            motivoEstado: motivo,
            estadoCambiadoAt: new Date(),
            estadoCambiadoPorId: null
          }
        });
      }

      await AuditService.registrar(tx, {
        accion: 'FLOTA_BLOQUEO_CHECKLIST',
        recurso: 'Vehiculo',
        recursoId: vehiculoId,
        usuarioId: actor.userId,
        ipAddress: actor.ip,
        detallesJson: {
          motivo,
          origenBloqueo: 'CHECKLIST_SEGURIDAD',
          conductorId: actor.userId
        }
      });
    });
  }

  /**
   * Rutina transaccional atómica interna para transferencia de jornadas (D4, D11, D12, D13)
   */
  private static async transferirJornadasTransaccional(params: {
    origenId: string;
    destinoId: string;
    jornadaIds?: string[];
    deshabilitarOrigen?: { motivo: string };
    actor: FleetActor;
  }): Promise<ResumenTransferencia> {
    const { origenId, destinoId, jornadaIds, deshabilitarOrigen, actor } = params;

    const sortedIds = [origenId, destinoId].sort();

    return await prisma.$transaction(async (tx) => {
      // 1. Bloqueo determinístico de filas (SELECT ... FOR UPDATE) para evitar condiciones de carrera y deadlocks
      await tx.$queryRaw`SELECT id FROM vehiculos WHERE id IN (${sortedIds[0]}, ${sortedIds[1]}) FOR UPDATE`;

      // 2. Revalidar existencia y estado dentro de la transacción
      const origen = await tx.vehiculo.findUnique({ where: { id: origenId } });
      const destino = await tx.vehiculo.findUnique({ where: { id: destinoId } });

      if (!origen) {
        throw new FleetError(404, 'FLEET_NOT_FOUND', 'Equipo de origen no encontrado');
      }

      if (!destino) {
        throw new FleetError(
          409,
          'FLEET_TRANSFER_INVALID_TARGET',
          'Equipo de destino no encontrado'
        );
      }

      if (origen.id === destino.id) {
        throw new FleetError(
          409,
          'FLEET_TRANSFER_INVALID_TARGET',
          'El equipo de destino debe ser diferente al de origen'
        );
      }

      if (destino.estado !== EstadoEquipo.HABILITADO) {
        throw new FleetError(
          409,
          'FLEET_TRANSFER_INVALID_TARGET',
          'El equipo de destino no está habilitado'
        );
      }

      // 3. Obtener jornadas activas del origen
      const jornadasActivasOrigen = await tx.jornada.findMany({
        where: {
          vehiculoId: origenId,
          estado: { in: [EstadoJornada.PROGRAMADA, EstadoJornada.EN_CURSO] }
        },
        include: {
          conductor: {
            include: {
              usuario: true
            }
          },
          hojasDeRuta: {
            include: {
              tramosRuta: {
                include: {
                  ordenServicio: {
                    include: {
                      expediente: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (jornadasActivasOrigen.length === 0) {
        throw new FleetError(
          409,
          'FLEET_NO_ACTIVE_OPERATIONS',
          'El equipo no tiene operaciones activas para transferir.'
        );
      }

      let jornadasATransferir = jornadasActivasOrigen;
      if (jornadaIds && jornadaIds.length > 0) {
        const idsActivos = new Set(jornadasActivasOrigen.map((j) => j.id));
        for (const jId of jornadaIds) {
          if (!idsActivos.has(jId)) {
            throw new FleetError(
              409,
              'FLEET_TRANSFER_INVALID_TARGET',
              `La jornada ${jId} no pertenece al equipo origen o no se encuentra activa.`
            );
          }
        }
        jornadasATransferir = jornadasActivasOrigen.filter((j) => jornadaIds.includes(j.id));
      }

      // 4. Verificar solapamiento de horario con el destino
      const jornadasActivasDestino = await tx.jornada.findMany({
        where: {
          vehiculoId: destino.id,
          estado: { in: [EstadoJornada.PROGRAMADA, EstadoJornada.EN_CURSO] }
        }
      });

      for (const jt of jornadasATransferir) {
        const jtStart = jt.fechaInicio.getTime();
        const jtEnd = jt.fechaFin ? jt.fechaFin.getTime() : jtStart + 24 * 60 * 60 * 1000;

        for (const jd of jornadasActivasDestino) {
          const jdStart = jd.fechaInicio.getTime();
          const jdEnd = jd.fechaFin ? jd.fechaFin.getTime() : jdStart + 24 * 60 * 60 * 1000;

          if (jtStart <= jdEnd && jtEnd >= jdStart) {
            throw new FleetError(
              409,
              'FLEET_TRANSFER_INVALID_TARGET',
              `El equipo destino tiene una jornada activa que solapa temporalmente con la jornada ${jt.id}.`
            );
          }
        }
      }

      // 5. Si se solicitó deshabilitar origen, actualizar estado
      if (deshabilitarOrigen) {
        await tx.vehiculo.update({
          where: { id: origenId },
          data: {
            estado: EstadoEquipo.DESHABILITADO,
            motivoEstado: deshabilitarOrigen.motivo,
            origenBloqueo: OrigenBloqueo.MANUAL,
            estadoCambiadoAt: new Date(),
            estadoCambiadoPorId: actor.userId ?? null
          }
        });
      }

      // 6. Transferir jornadas y aplicar regla R2 sobre inspeccionSalidaId
      const inspeccionesDesvinculadas: Array<{ jornadaId: string; inspeccionSalidaId: string }> = [];
      const inspeccionesConservadas: Array<{ jornadaId: string; inspeccionSalidaId: string }> = [];

      for (const jt of jornadasATransferir) {
        if (jt.estado === EstadoJornada.PROGRAMADA) {
          // R2: En PROGRAMADA se desvincula inspeccionSalidaId para que el nuevo equipo realice su checklist
          if (jt.inspeccionSalidaId) {
            inspeccionesDesvinculadas.push({
              jornadaId: jt.id,
              inspeccionSalidaId: jt.inspeccionSalidaId
            });
          }
          await tx.jornada.update({
            where: { id: jt.id },
            data: {
              vehiculoId: destino.id,
              inspeccionSalidaId: null
            }
          });
        } else {
          // R2: En EN_CURSO se conserva el vínculo
          if (jt.inspeccionSalidaId) {
            inspeccionesConservadas.push({
              jornadaId: jt.id,
              inspeccionSalidaId: jt.inspeccionSalidaId
            });
          }
          await tx.jornada.update({
            where: { id: jt.id },
            data: {
              vehiculoId: destino.id
            }
          });
        }

        // 7. Notificación in-app al conductor afectado (D13)
        await tx.notificacionConductor.create({
          data: {
            conductorId: jt.conductor.usuarioId,
            tipo: 'TRANSFERENCIA_FLOTA',
            titulo: 'Reasignación de equipo de transporte',
            mensaje: `Su jornada ha sido transferida del equipo ${origen.patente} al equipo ${destino.patente} (${destino.marca} ${destino.modelo}).`,
            metadata: {
              jornadaId: jt.id,
              vehiculoOrigenId: origen.id,
              vehiculoOrigenPatente: origen.patente,
              vehiculoDestinoId: destino.id,
              vehiculoDestinoPatente: destino.patente,
              motivo: deshabilitarOrigen?.motivo || 'Transferencia de jornada operacional'
            }
          }
        });
      }

      // 8. Recolectar órdenes y expedientes afectados
      const ordenesSet = new Set<string>();
      const expedientesSet = new Set<string>();

      for (const jt of jornadasATransferir) {
        for (const hr of jt.hojasDeRuta) {
          for (const tr of hr.tramosRuta) {
            if (tr.ordenServicio) {
              ordenesSet.add(tr.ordenServicio.id);
              if (tr.ordenServicio.expediente?.id) {
                expedientesSet.add(tr.ordenServicio.expediente.id);
              }
            }
          }
        }
      }

      const ordenes = Array.from(ordenesSet);
      const expedientes = Array.from(expedientesSet);
      const jornadaIdsTransferidas = jornadasATransferir.map((j) => j.id);

      // 9. Auditoría transaccional
      if (deshabilitarOrigen) {
        await AuditService.registrar(tx, {
          accion: 'FLOTA_DESHABILITAR',
          recurso: 'Vehiculo',
          recursoId: origen.id,
          usuarioId: actor.userId,
          ipAddress: actor.ip,
          detallesJson: {
            motivo: deshabilitarOrigen.motivo,
            origenBloqueo: 'MANUAL',
            estadoPrevio: origen.estado,
            operacionesAfectadas: jornadaIdsTransferidas.map((id) => ({ jornadaId: id })),
            destinoId: destino.id
          }
        });
      }

      await AuditService.registrar(tx, {
        accion: 'FLOTA_TRANSFERIR',
        recurso: 'Vehiculo',
        recursoId: origen.id,
        usuarioId: actor.userId,
        ipAddress: actor.ip,
        detallesJson: {
          origenId: origen.id,
          origenPatente: origen.patente,
          destinoId: destino.id,
          destinoPatente: destino.patente,
          jornadaIds: jornadaIdsTransferidas,
          ordenIds: ordenes,
          expedienteIds: expedientes,
          inspeccionesDesvinculadas,
          inspeccionesConservadas
        }
      });

      return {
        destino: {
          id: destino.id,
          patente: destino.patente,
          marca: destino.marca,
          modelo: destino.modelo
        },
        jornadasTransferidas: jornadaIdsTransferidas,
        ordenes,
        expedientes
      };
    });
  }
}
