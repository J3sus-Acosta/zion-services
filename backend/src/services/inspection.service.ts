import { TipoFotoInspeccion, EstadoInspeccion } from '@prisma/client';
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
