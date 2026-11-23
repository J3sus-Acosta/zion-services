export type RolUsuario = 'SUPERADMIN' | 'ADMIN' | 'JEFE_OPERACIONES' | 'OPERACIONES' | 'COMERCIAL' | 'CONDUCTOR' | 'CLIENTE';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rut: string;
  rol: RolUsuario;
  telefono?: string | null;
  activo: boolean;
  empresaClienteId?: string | null;
  conductorId?: string | null;
}

export interface AuthState {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
