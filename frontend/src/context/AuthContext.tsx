import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario, RolUsuario } from '../types/auth';

interface AuthContextType {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  cambiarRolSimulado?: (rol: RolUsuario) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Usuarios de demostración para acceso inicial y preconfigurados
const USUARIOS_DEMO: Record<RolUsuario, Usuario> = {
  SUPERADMIN: {
    id: 'usr-superadmin-01',
    email: 'superadmin@zion.cl',
    nombre: 'Super',
    apellido: 'Administrador',
    rut: '1-9',
    rol: 'SUPERADMIN',
    activo: true
  },
  ADMIN: {
    id: 'usr-admin-01',
    email: 'admin@zion.cl',
    nombre: 'Administrador',
    apellido: 'Zion',
    rut: '2-7',
    rol: 'ADMIN',
    activo: true
  },
  JEFE_OPERACIONES: {
    id: 'usr-jefe-ops-01',
    email: 'operaciones@zion.cl',
    nombre: 'Jefe',
    apellido: 'Operaciones',
    rut: '3-5',
    rol: 'JEFE_OPERACIONES',
    activo: true
  },
  COMERCIAL: {
    id: 'usr-comercial-01',
    email: 'comercial@zion.cl',
    nombre: 'Andrea',
    apellido: 'Ventas',
    rut: '6-8',
    rol: 'COMERCIAL',
    activo: true
  },
  CONDUCTOR: {
    id: 'usr-conductor-01',
    email: 'conductor@zion.cl',
    nombre: 'Carlos',
    apellido: 'Sánchez',
    rut: '4-3',
    rol: 'CONDUCTOR',
    conductorId: 'cond-01',
    activo: true
  },
  CLIENTE: {
    id: 'usr-cliente-01',
    email: 'cliente@horse.cl',
    nombre: 'Contacto',
    apellido: 'Horse Chile',
    rut: '5-1',
    rol: 'CLIENTE',
    empresaClienteId: 'empresa-horse',
    activo: true
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('zion_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (usuario) {
      localStorage.setItem('zion_auth_user', JSON.stringify(usuario));
    } else {
      localStorage.removeItem('zion_auth_user');
    }
  }, [usuario]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      // Intento contra backend
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const json = await res.json();
        setUsuario(json.data.usuario);
        setIsLoading(false);
        return { success: true };
      }

      const errorData = await res.json().catch(() => null);
      if (errorData?.error?.message) {
        setIsLoading(false);
        return { success: false, error: errorData.error.message };
      }
    } catch {
      // Fallback para entorno offline o sin backend levantado
      const normalizedEmail = email.toLowerCase().trim();
      const matchedUser = Object.values(USUARIOS_DEMO).find(u => u.email === normalizedEmail);

      if (matchedUser) {
        if (!matchedUser.activo) {
          setIsLoading(false);
          return { success: false, error: 'Su cuenta se encuentra inactiva o deshabilitada. Contacte al Administrador.' };
        }
        setUsuario(matchedUser);
        setIsLoading(false);
        return { success: true };
      }
    }

    setIsLoading(false);
    return { success: false, error: 'Credenciales inválidas o usuario no registrado.' };
  };

  const logout = () => {
    setUsuario(null);
    localStorage.removeItem('zion_auth_user');
    fetch('http://localhost:3000/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  };

  const cambiarRolSimulado = (rol: RolUsuario) => {
    setUsuario(USUARIOS_DEMO[rol]);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        isAuthenticated: !!usuario,
        isLoading,
        login,
        logout,
        cambiarRolSimulado
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
