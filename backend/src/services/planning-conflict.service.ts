import { Prisma, PrismaClient, EstadoAtencionProgramada } from '@prisma/client';
import { prisma as defaultPrisma } from '../utils/prisma.js';

export interface IntervaloHorario {
  inicio: Date;
  fin: Date;
}

export interface AtencionExistenteInfo {
  id: string;
  folio: string;
  fechaHoraInicio: Date;
  fechaHoraFinEstimada: Date;
  vehiculoId: string | null;
  conductorId: string | null;
  vehiculo?: { id: string; patente: string } | null;
  conductor?: { id: string; nombre: string; apellido: string } | null;
  sucursalFaena?: { id: string; nombre: string; comuna: string } | null;
}

export interface ConflictoSolapamiento {
  tipo: 'VEHICULO' | 'CONDUCTOR';
  recursoId: string;
  recursoIdentificador: string;
  atencionConflictoFolio: string;
  horarioOcupado: {
    inicio: string;
    fin: string;
  };
}

export interface DetalleAdvertenciaTraslado {
  margenMinutos: number;
  tipoRecurso: 'VEHICULO' | 'CONDUCTOR';
  recursoIdentificador: string;
  faenaAnterior?: {
    folio: string;
    comuna: string;
    termino: string;
  };
  faenaPosterior?: {
    folio: string;
    comuna: string;
    inicio: string;
  };
  faenaSolicitada: {
    comuna: string;
    inicio: string;
  };
}

export class ConflictError extends Error {
  readonly code: 'ERROR_SOLAPAMIENTO_HORARIO' | 'WARNING_INTERVALO_TRASLADO';
  readonly statusCode: number = 409;
  readonly conflictos?: ConflictoSolapamiento[];
  readonly detalles?: DetalleAdvertenciaTraslado;

  constructor(
    code: 'ERROR_SOLAPAMIENTO_HORARIO' | 'WARNING_INTERVALO_TRASLADO',
    message: string,
    extra?: { conflictos?: ConflictoSolapamiento[]; detalles?: DetalleAdvertenciaTraslado }
  ) {
    super(message);
    this.name = 'ConflictError';
    this.code = code;
    this.conflictos = extra?.conflictos;
    this.detalles = extra?.detalles;
  }
}

export class PlanningConflictService {
  public static readonly MARGEN_MINIMO_TRASLADO_MINUTOS = 240; // 4 horas

  /**
   * Evalúa si dos intervalos de tiempo se solapan estrictamente:
   * startA < endB && endA > startB
   */
  static solapan(a: IntervaloHorario, b: IntervaloHorario): boolean {
    return a.inicio.getTime() < b.fin.getTime() && a.fin.getTime() > b.inicio.getTime();
  }

  /**
   * Algoritmo puro de detección de solapamiento estricto sobre un conjunto de atenciones existentes.
   */
  static detectarSolapamiento(
    nuevo: IntervaloHorario,
    vehiculoId: string,
    conductorId: string,
    existentes: AtencionExistenteInfo[]
  ): ConflictoSolapamiento[] {
    const conflictos: ConflictoSolapamiento[] = [];

    for (const atencion of existentes) {
      const intervaloExistente: IntervaloHorario = {
        inicio: new Date(atencion.fechaHoraInicio),
        fin: new Date(atencion.fechaHoraFinEstimada)
      };

      if (this.solapan(nuevo, intervaloExistente)) {
        if (atencion.vehiculoId === vehiculoId) {
          conflictos.push({
            tipo: 'VEHICULO',
            recursoId: vehiculoId,
            recursoIdentificador: atencion.vehiculo?.patente || vehiculoId,
            atencionConflictoFolio: atencion.folio,
            horarioOcupado: {
              inicio: intervaloExistente.inicio.toISOString(),
              fin: intervaloExistente.fin.toISOString()
            }
          });
        }

        if (atencion.conductorId === conductorId) {
          const nombreConductor = atencion.conductor
            ? `${atencion.conductor.nombre} ${atencion.conductor.apellido}`.trim()
            : conductorId;

          conflictos.push({
            tipo: 'CONDUCTOR',
            recursoId: conductorId,
            recursoIdentificador: nombreConductor,
            atencionConflictoFolio: atencion.folio,
            horarioOcupado: {
              inicio: intervaloExistente.inicio.toISOString(),
              fin: intervaloExistente.fin.toISOString()
            }
          });
        }
      }
    }

    return conflictos;
  }

  /**
   * Algoritmo puro de cálculo de márgenes con faenas adyacentes (anterior y posterior)
   * para evaluar la regla de 4 horas (240 min).
   */
  static calcularMargenTraslado(
    nuevo: IntervaloHorario,
    atencionesRecurso: AtencionExistenteInfo[],
    comunaSolicitada: string,
    tipoRecurso: 'VEHICULO' | 'CONDUCTOR',
    recursoIdentificador: string
  ): DetalleAdvertenciaTraslado | null {
    // 1. Filtrar faenas anteriores (end <= nuevo.start)
    const faenasAnteriores = atencionesRecurso
      .filter((a) => new Date(a.fechaHoraFinEstimada).getTime() <= nuevo.inicio.getTime())
      .sort((a, b) => new Date(b.fechaHoraFinEstimada).getTime() - new Date(a.fechaHoraFinEstimada).getTime());

    // 2. Filtrar faenas posteriores (start >= nuevo.end)
    const faenasPosteriores = atencionesRecurso
      .filter((a) => new Date(a.fechaHoraInicio).getTime() >= nuevo.fin.getTime())
      .sort((a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime());

    const faenaAnterior = faenasAnteriores[0];
    const faenaPosterior = faenasPosteriores[0];

    let menorMargenMinutos = Infinity;
    let advertencia: DetalleAdvertenciaTraslado | null = null;

    if (faenaAnterior) {
      const terminoAnterior = new Date(faenaAnterior.fechaHoraFinEstimada);
      const margenAnteriorMinutos = Math.round((nuevo.inicio.getTime() - terminoAnterior.getTime()) / 60000);

      if (margenAnteriorMinutos < this.MARGEN_MINIMO_TRASLADO_MINUTOS) {
        menorMargenMinutos = margenAnteriorMinutos;
        advertencia = {
          margenMinutos: margenAnteriorMinutos,
          tipoRecurso,
          recursoIdentificador,
          faenaAnterior: {
            folio: faenaAnterior.folio,
            comuna: faenaAnterior.sucursalFaena?.comuna || 'Sin comuna',
            termino: terminoAnterior.toISOString()
          },
          faenaSolicitada: {
            comuna: comunaSolicitada,
            inicio: nuevo.inicio.toISOString()
          }
        };
      }
    }

    if (faenaPosterior) {
      const inicioPosterior = new Date(faenaPosterior.fechaHoraInicio);
      const margenPosteriorMinutos = Math.round((inicioPosterior.getTime() - nuevo.fin.getTime()) / 60000);

      if (margenPosteriorMinutos < this.MARGEN_MINIMO_TRASLADO_MINUTOS && margenPosteriorMinutos < menorMargenMinutos) {
        advertencia = {
          margenMinutos: margenPosteriorMinutos,
          tipoRecurso,
          recursoIdentificador,
          faenaPosterior: {
            folio: faenaPosterior.folio,
            comuna: faenaPosterior.sucursalFaena?.comuna || 'Sin comuna',
            inicio: inicioPosterior.toISOString()
          },
          faenaSolicitada: {
            comuna: comunaSolicitada,
            inicio: nuevo.inicio.toISOString()
          }
        };
      }
    }

    return advertencia;
  }

  /**
   * Valida disponibilidad horaria y traslados de recursos consultando la base de datos.
   * Lanza `ConflictError` si existe solapamiento estricto o si hay advertencia de traslado sin forzado.
   */
  static async validarDisponibilidad(params: {
    vehiculoId: string;
    conductorId: string;
    fechaHoraInicio: Date;
    duracionEstimadaMinutos: number;
    comunaDestino: string;
    excludeAtencionId?: string;
    forzarConJustificacion?: boolean;
    justificacionForzado?: string;
    client?: Prisma.TransactionClient | PrismaClient;
  }): Promise<{ autorizadaConForzado: boolean; advertencia?: DetalleAdvertenciaTraslado }> {
    const prismaClient = params.client || defaultPrisma;
    const inicio = params.fechaHoraInicio;
    const fin = new Date(inicio.getTime() + params.duracionEstimadaMinutos * 60000);
    const nuevoIntervalo: IntervaloHorario = { inicio, fin };

    // Ventana de búsqueda: +/- 24 horas del servicio solicitado
    const ventanaDesde = new Date(inicio.getTime() - 24 * 60 * 60 * 1000);
    const ventanaHasta = new Date(fin.getTime() + 24 * 60 * 60 * 1000);

    const atencionesExistentes = await prismaClient.atencionProgramada.findMany({
      where: {
        id: params.excludeAtencionId ? { not: params.excludeAtencionId } : undefined,
        estado: { notIn: [EstadoAtencionProgramada.CANCELADA] },
        fechaHoraInicio: { lte: ventanaHasta },
        fechaHoraFinEstimada: { gte: ventanaDesde },
        OR: [
          { vehiculoId: params.vehiculoId },
          { conductorId: params.conductorId }
        ]
      },
      include: {
        vehiculo: { select: { id: true, patente: true } },
        conductor: { select: { id: true, nombre: true, apellido: true } },
        sucursalFaena: { select: { id: true, nombre: true, comuna: true } }
      }
    });

    // 1. HARD CONFLICT: Solapamiento estricto (NO forzable)
    const conflictos = this.detectarSolapamiento(
      nuevoIntervalo,
      params.vehiculoId,
      params.conductorId,
      atencionesExistentes
    );

    if (conflictos.length > 0) {
      throw new ConflictError(
        'ERROR_SOLAPAMIENTO_HORARIO',
        'El vehículo o conductor ya tiene un servicio asignado en el rango horario especificado',
        { conflictos }
      );
    }

    // 2. SOFT CONFLICT: Regla de 4 Horas (240 min) de traslado
    // Evaluar vehículo
    const atencionesVehiculo = atencionesExistentes.filter((a) => a.vehiculoId === params.vehiculoId);
    const patenteVehiculo = atencionesVehiculo[0]?.vehiculo?.patente || params.vehiculoId;

    const advertenciaVehiculo = this.calcularMargenTraslado(
      nuevoIntervalo,
      atencionesVehiculo,
      params.comunaDestino,
      'VEHICULO',
      patenteVehiculo
    );

    // Evaluar conductor
    const atencionesConductor = atencionesExistentes.filter((a) => a.conductorId === params.conductorId);
    const nombreConductor = atencionesConductor[0]?.conductor
      ? `${atencionesConductor[0].conductor.nombre} ${atencionesConductor[0].conductor.apellido}`.trim()
      : params.conductorId;

    const advertenciaConductor = this.calcularMargenTraslado(
      nuevoIntervalo,
      atencionesConductor,
      params.comunaDestino,
      'CONDUCTOR',
      nombreConductor
    );

    // Seleccionar advertencia más crítica
    let advertenciaFinal: DetalleAdvertenciaTraslado | undefined = undefined;
    if (advertenciaVehiculo && advertenciaConductor) {
      advertenciaFinal =
        advertenciaVehiculo.margenMinutos <= advertenciaConductor.margenMinutos
          ? advertenciaVehiculo
          : advertenciaConductor;
    } else if (advertenciaVehiculo) {
      advertenciaFinal = advertenciaVehiculo;
    } else if (advertenciaConductor) {
      advertenciaFinal = advertenciaConductor;
    }

    if (advertenciaFinal) {
      const tieneJustificacionValida =
        Boolean(params.forzarConJustificacion) &&
        Boolean(params.justificacionForzado && params.justificacionForzado.trim().length >= 10);

      if (!tieneJustificacionValida) {
        throw new ConflictError(
          'WARNING_INTERVALO_TRASLADO',
          'El intervalo con la faena anterior o posterior es menor a 4 horas (240 min). Se requiere justificación explícita para forzar la asignación.',
          { detalles: advertenciaFinal }
        );
      }

      return { autorizadaConForzado: true, advertencia: advertenciaFinal };
    }

    return { autorizadaConForzado: false };
  }
}
