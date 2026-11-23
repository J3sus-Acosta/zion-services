import { apiUrl } from '../config/api';
import { EmpresaCliente, SucursalFaena, PaginationMeta } from '../types/cliente';

export interface ListarEmpresasParams {
  page?: number;
  limit?: number;
  search?: string;
  activo?: boolean;
}

export interface ListarSucursalesParams {
  page?: number;
  limit?: number;
  search?: string;
  activo?: boolean;
  empresaClienteId?: string;
}

export class ClienteApiService {
  /**
   * Listar empresas clientes con paginación y búsqueda
   */
  static async listarEmpresas(params: ListarEmpresasParams = {}): Promise<{ empresas: EmpresaCliente[]; meta: PaginationMeta }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.activo !== undefined) query.set('activo', params.activo.toString());

    const res = await fetch(apiUrl(`/api/empresas-clientes?${query.toString()}`), {
      credentials: 'include'
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || 'Error al obtener empresas clientes');
    }

    const json = await res.json();
    return {
      empresas: json.data || [],
      meta: json.meta || { total: json.data?.length || 0, page: 1, limit: 10, totalPages: 1 }
    };
  }

  /**
   * Obtener detalle de empresa por ID con sus sucursales
   */
  static async obtenerEmpresaPorId(id: string): Promise<EmpresaCliente> {
    const res = await fetch(apiUrl(`/api/empresas-clientes/${id}`), {
      credentials: 'include'
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || 'Error al obtener detalle de la empresa');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Crear nueva empresa cliente
   */
  static async crearEmpresa(data: Partial<EmpresaCliente>): Promise<EmpresaCliente> {
    const res = await fetch(apiUrl('/api/empresas-clientes'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || 'Error al crear la empresa cliente');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Actualizar empresa cliente
   */
  static async actualizarEmpresa(id: string, data: Partial<EmpresaCliente>): Promise<EmpresaCliente> {
    const res = await fetch(apiUrl(`/api/empresas-clientes/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || 'Error al actualizar la empresa cliente');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Desactivar / soft-delete empresa cliente
   */
  static async eliminarEmpresa(id: string): Promise<void> {
    const res = await fetch(apiUrl(`/api/empresas-clientes/${id}`), {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || 'Error al eliminar la empresa cliente');
    }
  }

  /**
   * Listar sucursales con filtros y soporte para empresaClienteId
   */
  static async listarSucursales(params: ListarSucursalesParams = {}): Promise<{ sucursales: SucursalFaena[]; meta: PaginationMeta }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.activo !== undefined) query.set('activo', params.activo.toString());
    if (params.empresaClienteId) query.set('empresaClienteId', params.empresaClienteId);

    const res = await fetch(apiUrl(`/api/sucursales?${query.toString()}`), {
      credentials: 'include'
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || 'Error al listar las sucursales');
    }

    const json = await res.json();
    return {
      sucursales: json.data || [],
      meta: json.meta || { total: json.data?.length || 0, page: 1, limit: 10, totalPages: 1 }
    };
  }

  /**
   * Crear nueva sucursal
   */
  static async crearSucursal(data: Partial<SucursalFaena>): Promise<SucursalFaena> {
    const res = await fetch(apiUrl('/api/sucursales'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || 'Error al crear la sucursal');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Actualizar sucursal
   */
  static async actualizarSucursal(id: string, data: Partial<SucursalFaena>): Promise<SucursalFaena> {
    const res = await fetch(apiUrl(`/api/sucursales/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || 'Error al actualizar la sucursal');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Desactivar / soft-delete sucursal
   */
  static async eliminarSucursal(id: string): Promise<void> {
    const res = await fetch(apiUrl(`/api/sucursales/${id}`), {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || 'Error al eliminar la sucursal');
    }
  }
}
