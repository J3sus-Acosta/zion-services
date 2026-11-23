import {
  Equipo,
  CrearEquipoInput,
  EditarEquipoInput,
  CambiarEstadoInput,
  TransferirInput,
  OperacionesAfectadasResponse,
  TransferenciaResultado,
  ListarFlotaQuery,
  NotificacionConductor
} from '../types/fleet';
import { API_BASE_URL } from '../config/api';

const API_BASE = API_BASE_URL;

export interface ApiErrorDetail {
  campo?: string;
  mensaje: string;
}

export class FleetApiError extends Error {
  code: string;
  statusCode: number;
  details?: ApiErrorDetail[];

  constructor(message: string, code = 'FLEET_API_ERROR', statusCode = 500, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'FleetApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });

    if (res.status === 204) {
      return {} as T;
    }

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const errorPayload = json?.error;
      const code = errorPayload?.code || (res.status === 403 ? 'FORBIDDEN' : res.status === 404 ? 'NOT_FOUND' : 'API_ERROR');
      const message = errorPayload?.message || `Error en la solicitud HTTP (${res.status})`;
      const details = errorPayload?.details;
      throw new FleetApiError(message, code, res.status, details);
    }

    return json?.data !== undefined ? json.data : json;
  } catch (err: any) {
    if (err instanceof FleetApiError) {
      throw err;
    }
    throw new FleetApiError(
      err?.message || 'Error de conexión con el servidor de Zion Services',
      'NETWORK_ERROR',
      0
    );
  }
}

export const fleetApi = {
  /**
   * Listar catálogo de equipos con filtros opcionales
   */
  async listar(query?: ListarFlotaQuery): Promise<Equipo[]> {
    const params = new URLSearchParams();
    if (query?.tipoEquipo) params.append('tipoEquipo', query.tipoEquipo);
    if (query?.estado) params.append('estado', query.estado);
    if (query?.busqueda) params.append('busqueda', query.busqueda);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const data = await request<{ equipos: Equipo[] }>(`/api/flota${queryString}`, {
      method: 'GET'
    });
    return data.equipos;
  },

  /**
   * Obtener detalle de un equipo por ID
   */
  async obtener(id: string): Promise<Equipo> {
    const data = await request<{ equipo: Equipo }>(`/api/flota/${id}`, {
      method: 'GET'
    });
    return data.equipo;
  },

  /**
   * Registrar nuevo equipo
   */
  async crear(input: CrearEquipoInput): Promise<Equipo> {
    const data = await request<{ equipo: Equipo }>('/api/flota', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return data.equipo;
  },

  /**
   * Editar características de un equipo existente
   */
  async editar(id: string, input: EditarEquipoInput): Promise<Equipo> {
    const data = await request<{ equipo: Equipo }>(`/api/flota/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
    return data.equipo;
  },

  /**
   * Consultar operaciones afectadas y candidatos de reemplazo
   */
  async obtenerOperacionesAfectadas(id: string): Promise<OperacionesAfectadasResponse> {
    return await request<OperacionesAfectadasResponse>(`/api/flota/${id}/operaciones-afectadas`, {
      method: 'GET'
    });
  },

  /**
   * Cambiar estado de un equipo (HABILITADO / DESHABILITADO)
   */
  async cambiarEstado(id: string, input: CambiarEstadoInput): Promise<TransferenciaResultado> {
    return await request<TransferenciaResultado>(`/api/flota/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  },

  /**
   * Transferir jornadas activas a otro equipo sin cambiar estado del origen
   */
  async transferir(id: string, input: TransferirInput): Promise<TransferenciaResultado> {
    return await request<TransferenciaResultado>(`/api/flota/${id}/transferir`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  /**
   * Notificaciones in-app de conductor
   */
  async listarNotificacionesConductor(leida?: boolean, conductorId?: string): Promise<NotificacionConductor[]> {
    const params = new URLSearchParams();
    if (leida !== undefined) params.append('leida', String(leida));
    if (conductorId) params.append('conductorId', conductorId);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const data = await request<{ notificaciones: NotificacionConductor[] }>(
      `/api/conductores/notificaciones${queryString}`,
      { method: 'GET' }
    );
    return data.notificaciones;
  },

  /**
   * Marcar notificación de conductor como leída
   */
  async marcarNotificacionLeida(id: string): Promise<NotificacionConductor> {
    const data = await request<{ notificacion: NotificacionConductor }>(
      `/api/conductores/notificaciones/${id}/leida`,
      { method: 'PATCH' }
    );
    return data.notificacion;
  }
};
