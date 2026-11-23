export interface SucursalFaena {
  id: string;
  empresaClienteId: string;
  nombre: string;
  direccion: string;
  comuna: string;
  ciudad?: string | null;
  region: string;
  contactoNombre?: string | null;
  contactoTelefono?: string | null;
  contactoEmail?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmpresaCliente {
  id: string;
  rut: string;
  razonSocial: string;
  nombreFantasia?: string | null;
  giro?: string | null;
  direccionMatriz?: string | null;
  comuna?: string | null;
  region?: string | null;
  telefono?: string | null;
  email?: string | null;
  tipo?: 'CONTRATO' | 'SPOT';
  activo: boolean;
  sucursales?: SucursalFaena[];
  _count?: {
    sucursales?: number;
    usuarios?: number;
    solicitudes?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
