export type TipoEquipo = 'CAMION' | 'CAMIONETA' | 'MAQUINARIA' | 'OTRO';

export type EstadoEquipo = 'HABILITADO' | 'DESHABILITADO';

export type OrigenBloqueo = 'MANUAL' | 'CHECKLIST_SEGURIDAD';

export interface Equipo {
  id: string;
  patente: string;
  tipoEquipo: TipoEquipo;
  marca: string;
  modelo: string;
  anio: number;
  capacidadEstanqueM3: number;
  equipoHidrojet: boolean;
  equipoVacio: boolean;
  observaciones?: string | null;
  estado: EstadoEquipo;
  motivoEstado?: string | null;
  origenBloqueo?: OrigenBloqueo | null;
  estadoCambiadoAt?: string | null;
  estadoCambiadoPorId?: string | null;
  estadoCambiadoPor?: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    rol: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrearEquipoInput {
  patente: string;
  tipoEquipo: TipoEquipo;
  marca: string;
  modelo: string;
  anio: number;
  capacidadEstanqueM3: number;
  equipoHidrojet?: boolean;
  equipoVacio?: boolean;
  observaciones?: string | null;
}

export interface EditarEquipoInput {
  patente?: string;
  tipoEquipo?: TipoEquipo;
  marca?: string;
  modelo?: string;
  anio?: number;
  capacidadEstanqueM3?: number;
  equipoHidrojet?: boolean;
  equipoVacio?: boolean;
  observaciones?: string | null;
}

export type CambiarEstadoInput =
  | {
      estado: 'HABILITADO';
    }
  | {
      estado: 'DESHABILITADO';
      motivo: string;
      vehiculoDestinoId?: string;
    };

export interface TransferirInput {
  vehiculoDestinoId: string;
  jornadaIds?: string[];
}

export interface OrdenAfectada {
  id: string;
  numero: string;
  estado: string;
  expedienteId?: string | null;
  cicloTransporteEstado?: string | null;
}

export interface OperacionAfectada {
  id: string;
  estado: string;
  fechaInicio: string;
  fechaFin?: string | null;
  conductor: {
    id: string;
    nombre: string;
    rut: string;
  };
  ordenes: OrdenAfectada[];
}

export interface CandidatoReemplazo {
  id: string;
  patente: string;
  tipoEquipo: TipoEquipo;
  marca: string;
  modelo: string;
  capacidadEstanqueM3: number;
  tieneConflicto: boolean;
}

export interface OperacionesAfectadasResponse {
  jornadas: OperacionAfectada[];
  candidatos: CandidatoReemplazo[];
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

export interface TransferenciaResultado {
  equipo?: Equipo;
  transferencia?: ResumenTransferencia | null;
}

export interface ListarFlotaQuery {
  tipoEquipo?: TipoEquipo;
  estado?: EstadoEquipo;
  busqueda?: string;
}

export interface NotificacionConductor {
  id: string;
  conductorId: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  metadata?: {
    vehiculoOrigenPatente?: string;
    vehiculoDestinoPatente?: string;
    motivo?: string;
    jornadaId?: string;
    [key: string]: any;
  } | null;
  createdAt: string;
}
