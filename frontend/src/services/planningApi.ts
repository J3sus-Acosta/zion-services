import {
  AtencionProgramadaDTO,
  ServicioCatalogoItem,
  PlantaDestinoItem,
  SolicitudMultiAtencionInput,
  AsignarAtencionInput,
  ReasignarAtencionInput,
  CalendarFilters,
  ConflictWarningPayload
} from '../types/planning';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

export class PlanningConflictError extends Error {
  code: string;
  statusCode: number;
  payload: ConflictWarningPayload;

  constructor(payload: ConflictWarningPayload) {
    super(payload.message || 'Conflicto de programación horaria');
    this.name = 'PlanningConflictError';
    this.code = payload.code;
    this.statusCode = 409;
    this.payload = payload;
  }
}

export class PlanningApiError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code = 'PLANNING_API_ERROR', statusCode = 500) {
    super(message);
    this.name = 'PlanningApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Fallbacks de catálogo en caso de desconexión o modo demostración
export const SERVICIOS_CATALOGO_DEMO: ServicioCatalogoItem[] = [
  {
    id: 's-hidrojet-01',
    codigo: 'HIDROJET-ALTA',
    nombre: 'Hidrojet de Alta Presión para Redes Industriales',
    descripcion: 'Lavado especializado de tuberías y ductos industriales a alta presión con succión simultánea.',
    duracionEstimadaMinutos: 120
  },
  {
    id: 's-succion-02',
    codigo: 'SUCCION-RILES',
    nombre: 'Succión y Disposición Certificada de RILes',
    descripcion: 'Servicio integral de retiro al vacío y trazabilidad SIDREP para residuos industriales líquidos.',
    duracionEstimadaMinutos: 150
  },
  {
    id: 's-lodos-03',
    codigo: 'RETIRO-LODOS-MANUAL',
    nombre: 'Retiro Manual y Manejo de Lodos Residuales',
    descripcion: 'Extracción manual de sedimentos y lodos en faenas sin acceso directo para camión limpiafosas.',
    duracionEstimadaMinutos: 180
  },
  {
    id: 's-fosa-04',
    codigo: 'LIMPIEZA-FOSA',
    nombre: 'Limpieza Integral de Fosa Séptica',
    descripcion: 'Succión de lodos pesados y mantenimiento preventivo de fosas sépticas comerciales e industriales.',
    duracionEstimadaMinutos: 120
  },
  {
    id: 's-deshid-05',
    codigo: 'LODOS-DESHIDRATADOS',
    nombre: 'Transporte y Disposición de Lodos Deshidratados',
    descripcion: 'Retiro de tortas de lodo deshidratado provenientes de plantas de tratamiento de riles (PTR).',
    duracionEstimadaMinutos: 180
  }
];

export const PLANTAS_DESTINO_DEMO: PlantaDestinoItem[] = [
  {
    id: 'planta-la-farfana',
    nombre: 'Planta de Tratamiento La Farfana (Aguas Andinas)',
    direccion: 'Av. Rinconada Poniente 12345',
    comuna: 'Maipú',
    region: 'Metropolitana',
    autorizadaRiles: true,
    resolucionSanitaria: 'RES-SEREMI-RM-2019-8432'
  },
  {
    id: 'planta-trebal-mapocho',
    nombre: 'Planta de Tratamiento Trebal - Mapocho (Aguas Andinas)',
    direccion: 'Camino a Melipilla Km 28',
    comuna: 'Padre Hurtado',
    region: 'Metropolitana',
    autorizadaRiles: true,
    resolucionSanitaria: 'RES-SEREMI-RM-2020-5120'
  },
  {
    id: 'planta-armony-sustentable',
    nombre: 'Armony Sustentable - Planta de Compostaje y Valorización',
    direccion: 'Ruta 68 Km 18',
    comuna: 'Pudahuel',
    region: 'Metropolitana',
    autorizadaRiles: false,
    resolucionSanitaria: 'RES-SEREMI-RM-2018-2109'
  }
];

export const PlanningApi = {
  /**
   * Obtiene la lista activa del catálogo de servicios
   */
  async getCatalogoServicios(): Promise<ServicioCatalogoItem[]> {
    try {
      const res = await fetch(`${API_BASE}/api/planning/catalogo-servicios`, {
        credentials: 'include'
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || SERVICIOS_CATALOGO_DEMO;
      }
    } catch {
      // Ignorar fallo y usar datos de demo
    }
    return SERVICIOS_CATALOGO_DEMO;
  },

  /**
   * Obtiene la lista activa de plantas de destino autorizadas
   */
  async getPlantasDestino(): Promise<PlantaDestinoItem[]> {
    try {
      const res = await fetch(`${API_BASE}/api/planning/plantas-destino`, {
        credentials: 'include'
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || PLANTAS_DESTINO_DEMO;
      }
    } catch {
      // Ignorar fallo y usar datos de demo
    }
    return PLANTAS_DESTINO_DEMO;
  },

  /**
   * Consulta la agenda de atenciones programadas según rango temporal y filtros
   */
  async getAgenda(
    fechaDesde: string,
    fechaHasta: string,
    filters: CalendarFilters = {},
    vista: 'mes' | 'semana' | 'dia' = 'mes'
  ): Promise<AtencionProgramadaDTO[]> {
    const params = new URLSearchParams({
      fechaDesde,
      fechaHasta,
      vista
    });

    if (filters.vehiculoId) params.append('vehiculoId', filters.vehiculoId);
    if (filters.conductorId) params.append('conductorId', filters.conductorId);
    if (filters.sucursalId) params.append('sucursalId', filters.sucursalId);
    if (filters.estado && filters.estado !== 'TODOS') params.append('estado', filters.estado);

    const res = await fetch(`${API_BASE}/api/planning/agenda?${params.toString()}`, {
      credentials: 'include'
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new PlanningApiError(
        errorJson.error?.message || 'Error al obtener la agenda de atenciones',
        errorJson.error?.code || 'AGENDA_FETCH_ERROR',
        res.status
      );
    }

    const json = await res.json();
    return json.data || [];
  },

  /**
   * Crea una solicitud agrupando múltiples atenciones programadas
   */
  async crearSolicitudMulti(payload: SolicitudMultiAtencionInput) {
    const res = await fetch(`${API_BASE}/api/planning/solicitudes-multi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new PlanningApiError(
        json.error?.message || json.message || 'Error al registrar solicitud multi-atención',
        json.error?.code || 'SOLICITUD_MULTI_ERROR',
        res.status
      );
    }

    return json;
  },

  /**
   * Asigna recursos operativos a una atención programada
   */
  async asignarAtencion(id: string, payload: AsignarAtencionInput) {
    const res = await fetch(`${API_BASE}/api/planning/atenciones/${id}/asignar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const json = await res.json().catch(() => ({}));

    if (res.status === 409) {
      throw new PlanningConflictError(json as ConflictWarningPayload);
    }

    if (!res.ok) {
      throw new PlanningApiError(
        json.error?.message || json.message || 'Error al asignar recursos a la atención',
        json.error?.code || 'ASSIGN_ERROR',
        res.status
      );
    }

    return json;
  },

  /**
   * Reasigna recursos operativos o reprograma fecha de una atención
   */
  async reasignarAtencion(id: string, payload: ReasignarAtencionInput) {
    const res = await fetch(`${API_BASE}/api/planning/atenciones/${id}/reasignar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const json = await res.json().catch(() => ({}));

    if (res.status === 409) {
      throw new PlanningConflictError(json as ConflictWarningPayload);
    }

    if (!res.ok) {
      throw new PlanningApiError(
        json.error?.message || json.message || 'Error al reasignar atención',
        json.error?.code || 'REASSIGN_ERROR',
        res.status
      );
    }

    return json;
  }
};
