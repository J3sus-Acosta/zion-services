export type EstadoAtencionProgramada =
  | 'PENDIENTE_CONFIRMACION'
  | 'PROGRAMADA'
  | 'EN_CURSO'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'REPROGRAMADA';

export interface ServicioCatalogoItem {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  duracionEstimadaMinutos: number;
}

export interface PlantaDestinoItem {
  id: string;
  nombre: string;
  direccion: string;
  comuna: string;
  region: string;
  autorizadaRiles: boolean;
  resolucionSanitaria?: string | null;
}

export interface AtencionServicioItemDTO {
  id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
}

export interface AtencionProgramadaDTO {
  id: string;
  folio: string;
  solicitudServicioId: string;
  cliente: {
    id: string;
    razonSocial: string;
  };
  sucursalFaena: {
    id: string;
    nombre: string;
    comuna: string;
    direccion: string;
  };
  fechaHoraInicio: string;
  fechaHoraFinEstimada: string;
  duracionEstimadaMinutos: number;
  estado: EstadoAtencionProgramada;
  vehiculo: {
    id: string;
    patente: string;
    modelo: string;
  } | null;
  conductor: {
    id: string;
    nombre: string;
    apellido: string;
  } | null;
  plantaDestino: {
    id: string;
    nombre: string;
  } | null;
  servicios: AtencionServicioItemDTO[];
  ordenServicioId: string | null;
  ordenServicioFolio: string | null;
  justificacionForzado?: string | null;
  observacionesInternas?: string | null;
}

export interface CalendarFilters {
  vehiculoId?: string;
  conductorId?: string;
  sucursalId?: string;
  estado?: EstadoAtencionProgramada | 'TODOS';
}

export interface ConflictDetails {
  tipo: 'VEHICULO' | 'CONDUCTOR';
  recursoId: string;
  recursoIdentificador: string;
  atencionConflictoFolio: string;
  horarioOcupado: {
    inicio: string;
    fin: string;
  };
}

export interface WarningTransferDetails {
  margenMinutos: number;
  tipoRecurso: 'VEHICULO' | 'CONDUCTOR';
  recursoIdentificador: string;
  faenaAnterior?: {
    folio: string;
    comuna: string;
    termino: string;
  };
  faenaSolicitada?: {
    inicio: string;
    comuna: string;
  };
}

export interface ConflictWarningPayload {
  code: 'ERROR_SOLAPAMIENTO_HORARIO' | 'WARNING_INTERVALO_TRASLADO';
  message: string;
  conflictos?: ConflictDetails[];
  detalles?: WarningTransferDetails;
}

// Request payload types
export interface ItemServicioSolicitudInput {
  servicioCatalogoId: string;
  cantidad: number;
  observaciones?: string;
}

export interface ItemAtencionSolicitudInput {
  fechaHoraInicio: string;
  duracionEstimadaMinutos: number;
  sucursalFaenaId?: string;
  plantaDestinoId?: string;
  servicios: ItemServicioSolicitudInput[];
}

export interface SolicitudMultiAtencionInput {
  empresaClienteId: string;
  sucursalFaenaId: string;
  tipoResiduo: string;
  descripcion?: string;
  cantidadEstimada?: number;
  unidadEstimada: 'KG' | 'TON' | 'M3' | 'LITROS';
  atenciones: ItemAtencionSolicitudInput[];
}

export interface AsignarAtencionInput {
  vehiculoId: string;
  conductorId: string;
  fechaHoraInicio: string;
  duracionEstimadaMinutos?: number;
  plantaDestinoId?: string;
  jornadaId?: string;
  forzarConJustificacion?: boolean;
  justificacionForzado?: string;
}

export interface ReasignarAtencionInput {
  nuevoVehiculoId?: string;
  nuevoConductorId?: string;
  nuevaFechaHoraInicio?: string;
  nuevaDuracionEstimadaMinutos?: number;
  nuevaPlantaDestinoId?: string;
  motivoReasignacion: string;
  forzarConJustificacion?: boolean;
  justificacionForzado?: string;
}
