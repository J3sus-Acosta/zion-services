import {
  TipoFotoInspeccion,
  EstadoInspeccion,
  EstadoEquipo,
  OrigenBloqueo
} from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { fileStorageService } from './file-storage.service.js';
import { FleetService } from './fleet.service.js';

export interface ItemChecklistInput {
  categoria: 'MECANICA' | 'CABINA' | 'ESTANQUE' | 'DOCUMENTOS';
  numero: number;
  nombre: string;
  estado: 'BUENO' | 'REGULAR' | 'MALO' | 'NO_APLICA';
  esCritico: boolean;
  observaciones?: string;
}

export interface InspeccionSalidaInput {
  vehiculoId: string;
  conductorId: string;
  kilometraje?: number;
  horometro?: number;
  items: ItemChecklistInput[];
  fotos360: {
    tipo: TipoFotoInspeccion;
    archivoUrl: string;
  }[];
  observaciones?: string;
}

export interface InspeccionRetornoInput {
  vehiculoId: string;
  conductorId: string;
  kilometrajeFinal?: number;
  horometroFinal?: number;
  estadoGeneral?: string;
  danosDetectados?: string;
  herramientasOK?: boolean;
  observaciones?: string;
  fotosRetorno?: {
    tipo: TipoFotoInspeccion;
    archivoUrl: string;
  }[];
}

export class InspectionService {
  /**
   * Valida el checklist preoperacional F-GMT-MAN-004 y las 4 fotos obligatorias.
   * Si algún ítem crítico está en 'MALO', el vehículo se bloquea automáticamente.
   */
  static evaluarInspeccionSalida(input: InspeccionSalidaInput): {
    estado: EstadoInspeccion;
    bloqueado: boolean;
    motivoBloqueo?: string;
  } {
    // 1. Validar que vengan exactamente las 4 fotos obligatorias (Frontal, Lat. Izq, Trasera, Lat. Der)
    const tiposRequeridos = [
      TipoFotoInspeccion.FRONTAL,
      TipoFotoInspeccion.LATERAL_IZQUIERDA,
      TipoFotoInspeccion.TRASERA,
      TipoFotoInspeccion.LATERAL_DERECHA
    ];

    const fotosPresentes = new Set(input.fotos360.map((f) => f.tipo));
    const faltantes = tiposRequeridos.filter((tipo) => !fotosPresentes.has(tipo));

    if (faltantes.length > 0) {
      throw new Error(`Faltan fotos obligatorias del camión: ${faltantes.join(', ')}`);
    }

    // 2. Verificar ítems críticos (frenos, dirección, luces de freno, válvulas de seguridad, etc.)
    const fallasCriticas = input.items.filter((item) => item.esCritico && item.estado === 'MALO');

    if (fallasCriticas.length > 0) {
      const nombresFallas = fallasCriticas.map((f) => `${f.categoria} #${f.numero} (${f.nombre})`).join('; ');
      return {
        estado: EstadoInspeccion.NO_CONFORME,
        bloqueado: true,
        motivoBloqueo: `Bloqueo automático de seguridad por fallas críticas: ${nombresFallas}`
      };
    }

    return {
      estado: EstadoInspeccion.CONFORME,
      bloqueado: false
    };
  }

  /**
   * Persiste de forma transaccional la inspección de salida F-GMT-MAN-004 en MySQL:
   * - Decodifica y almacena las 4 fotos perimetrales 360° en disco físico bajo STORAGE_PATH
   * - Inserta el registro en InspeccionSalida_F_GMT con itemsChecklist en JSON estructurado
   * - Inserta las 4 entidades FotoInspeccion asociadas con URIs relativas cortas (< 80 caracteres)
   * - Si se detecta falla crítica, bloquea el vehículo (DESHABILITADO, CHECKLIST_SEGURIDAD) y registra la auditoría
   */
  static async registrarInspeccionSalida(
    input: InspeccionSalidaInput,
    actor: { userId?: string; ip?: string }
  ) {
    // 1. Evaluación pura de reglas de negocio
    const evaluacion = this.evaluarInspeccionSalida(input);

    // 2. Resolver conductor
    let conductor = await prisma.conductor.findUnique({
      where: { id: input.conductorId }
    });
    if (!conductor) {
      conductor = await prisma.conductor.findUnique({
        where: { usuarioId: input.conductorId }
      });
    }
    if (!conductor) {
      throw new Error(`Conductor no encontrado para el identificador: ${input.conductorId}`);
    }

    // 3. Procesar y guardar fotos Base64 en disco local
    const fotosProcesadas: { tipo: TipoFotoInspeccion; archivoUrl: string }[] = [];
    for (const foto of input.fotos360) {
      let urlFinal = foto.archivoUrl;
      if (foto.archivoUrl.startsWith('data:')) {
        const saved = await fileStorageService.guardarBase64(
          foto.archivoUrl,
          'inspecciones/salida',
          `salida_${foto.tipo.toLowerCase()}`
        );
        urlFinal = saved.urlRelativa;
      }
      fotosProcesadas.push({
        tipo: foto.tipo,
        archivoUrl: urlFinal
      });
    }

    // 4. Transacción atómica en MySQL
    const resultadoTransaccion = await prisma.$transaction(async (tx) => {
      // 4.1 Crear registro en inspecciones_salida_fgmt
      const inspeccion = await tx.inspeccionSalida_F_GMT.create({
        data: {
          vehiculoId: input.vehiculoId,
          conductorId: conductor!.id,
          kilometraje: input.kilometraje ?? null,
          horometro: input.horometro ?? null,
          estado: evaluacion.estado,
          observaciones: input.observaciones || evaluacion.motivoBloqueo || null,
          itemsChecklist: input.items as any,
          aprobadoPor: evaluacion.bloqueado ? null : actor.userId || null,
          fotos360: {
            create: fotosProcesadas.map((f) => ({
              tipo: f.tipo,
              archivoUrl: f.archivoUrl
            }))
          }
        },
        include: {
          fotos360: true
        }
      });

      // 4.2 Si está bloqueado por falla crítica, actualizar vehículo y auditar
      if (evaluacion.bloqueado && evaluacion.motivoBloqueo) {
        const vehiculo = await tx.vehiculo.findUnique({
          where: { id: input.vehiculoId }
        });

        if (vehiculo && vehiculo.estado !== EstadoEquipo.DESHABILITADO) {
          await tx.vehiculo.update({
            where: { id: input.vehiculoId },
            data: {
              estado: EstadoEquipo.DESHABILITADO,
              origenBloqueo: OrigenBloqueo.CHECKLIST_SEGURIDAD,
              motivoEstado: evaluacion.motivoBloqueo,
              bloqueadoPorSeguridad: true,
              motivoBloqueo: evaluacion.motivoBloqueo,
              estadoCambiadoAt: new Date(),
              estadoCambiadoPorId: actor.userId || null
            }
          });

          await tx.auditoriaEvento.create({
            data: {
              usuarioId: actor.userId || null,
              accion: 'BLOQUEO_SEGURIDAD_CHECKLIST',
              recurso: 'VEHICULO',
              recursoId: input.vehiculoId,
              detallesJson: {
                motivo: evaluacion.motivoBloqueo,
                origen: OrigenBloqueo.CHECKLIST_SEGURIDAD,
                inspeccionId: inspeccion.id
              },
              ipAddress: actor.ip || null
            }
          });
        }
      }

      return inspeccion;
    });

    return {
      inspeccion: resultadoTransaccion,
      evaluacion
    };
  }

  /**
   * Persiste lote o captura individual de fotografías perimetrales en disco y MySQL
   */
  static async registrarFotos360(input: {
    vehiculoId: string;
    jornadaId?: string;
    inspeccionSalidaId?: string;
    inspeccionRetornoId?: string;
    fotos: { tipo: TipoFotoInspeccion; archivoUrl: string }[];
  }) {
    if (!Array.isArray(input.fotos) || input.fotos.length === 0) {
      throw new Error('El arreglo de fotos no puede estar vacío');
    }

    // 1. Guardar fotos Base64 en disco local
    const fotosProcesadas: { tipo: TipoFotoInspeccion; archivoUrl: string }[] = [];
    for (const f of input.fotos) {
      if (!Object.values(TipoFotoInspeccion).includes(f.tipo)) {
        throw new Error(`Tipo de foto inválido: ${f.tipo}`);
      }
      let urlFinal = f.archivoUrl;
      if (f.archivoUrl.startsWith('data:')) {
        const subDir = input.inspeccionRetornoId ? 'inspecciones/retorno' : 'inspecciones/salida';
        const saved = await fileStorageService.guardarBase64(
          f.archivoUrl,
          subDir,
          `foto_${f.tipo.toLowerCase()}`
        );
        urlFinal = saved.urlRelativa;
      }
      fotosProcesadas.push({
        tipo: f.tipo,
        archivoUrl: urlFinal
      });
    }

    // 2. Persistir en tabla relacional fotos_inspeccion
    const fotosGuardadas = await prisma.$transaction(async (tx) => {
      const guardadas = [];
      for (const f of fotosProcesadas) {
        const row = await tx.fotoInspeccion.create({
          data: {
            tipo: f.tipo,
            archivoUrl: f.archivoUrl,
            inspeccionSalidaId: input.inspeccionSalidaId || null,
            inspeccionRetornoId: input.inspeccionRetornoId || null
          }
        });
        guardadas.push(row);
      }
      return guardadas;
    });

    return fotosGuardadas;
  }

  /**
   * Persiste la inspección de retorno a planta y sus fotografías de respaldo
   */
  static async registrarInspeccionRetorno(
    input: InspeccionRetornoInput,
    _actor: { userId?: string; ip?: string }
  ) {
    // 1. Resolver conductor
    let conductor = await prisma.conductor.findUnique({
      where: { id: input.conductorId }
    });
    if (!conductor) {
      conductor = await prisma.conductor.findUnique({
        where: { usuarioId: input.conductorId }
      });
    }
    if (!conductor) {
      throw new Error(`Conductor no encontrado para el identificador: ${input.conductorId}`);
    }

    // 2. Procesar fotos de retorno si existen
    const fotosProcesadas: { tipo: TipoFotoInspeccion; archivoUrl: string }[] = [];
    if (Array.isArray(input.fotosRetorno)) {
      for (const foto of input.fotosRetorno) {
        let urlFinal = foto.archivoUrl;
        if (foto.archivoUrl.startsWith('data:')) {
          const saved = await fileStorageService.guardarBase64(
            foto.archivoUrl,
            'inspecciones/retorno',
            `retorno_${foto.tipo.toLowerCase()}`
          );
          urlFinal = saved.urlRelativa;
        }
        fotosProcesadas.push({
          tipo: foto.tipo,
          archivoUrl: urlFinal
        });
      }
    }

    // 3. Transacción atómica en MySQL
    const inspeccionRetorno = await prisma.$transaction(async (tx) => {
      const registro = await tx.inspeccionRetornoPlanta.create({
        data: {
          vehiculoId: input.vehiculoId,
          conductorId: conductor!.id,
          kilometrajeFinal: input.kilometrajeFinal ?? null,
          horometroFinal: input.horometroFinal ?? null,
          estadoGeneral: input.estadoGeneral || 'CONFORME',
          danosDetectados: input.danosDetectados ?? null,
          herramientasOK: input.herramientasOK !== undefined ? Boolean(input.herramientasOK) : true,
          observaciones: input.observaciones ?? null,
          fotos360Retorno: {
            create: fotosProcesadas.map((f) => ({
              tipo: f.tipo,
              archivoUrl: f.archivoUrl
            }))
          }
        },
        include: {
          fotos360Retorno: true
        }
      });

      return registro;
    });

    return inspeccionRetorno;
  }

  /**
   * Evalúa el Autochecklist Diario de Ruta para viajes fuera de Santiago
   */
  static evaluarAutochecklistRuta(items: { nombre: string; conforme: boolean; esCritico: boolean }[]): {
    aprobado: boolean;
    alertaEmitida: boolean;
    motivoAlerta?: string;
  } {
    const fallas = items.filter((i) => !i.conforme);
    const fallasCriticas = fallas.filter((i) => i.esCritico);

    if (fallasCriticas.length > 0) {
      return {
        aprobado: false,
        alertaEmitida: true,
        motivoAlerta: `Falla crítica en ruta: ${fallasCriticas.map((f) => f.nombre).join(', ')}`
      };
    }

    return {
      aprobado: true,
      alertaEmitida: fallas.length > 0,
      motivoAlerta: fallas.length > 0 ? `Novedades menores reportadas en ruta: ${fallas.map((f) => f.nombre).join(', ')}` : undefined
    };
  }

  /**
   * Persiste el bloqueo de seguridad por checklist en el módulo de flota (D4, 3.3)
   */
  static async aplicarBloqueoSeguridad(
    vehiculoId: string,
    resultado: { bloqueado: boolean; motivoBloqueo?: string },
    actor: { userId?: string; ip?: string }
  ): Promise<void> {
    if (resultado.bloqueado && resultado.motivoBloqueo) {
      await FleetService.bloquearPorChecklist(vehiculoId, resultado.motivoBloqueo, actor);
    }
  }
}
