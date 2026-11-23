import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from 'react-router-dom';
import {
  Truck,
  ClipboardList,
  Building2,
  Users,
  Briefcase,
  LogOut,
  Sun,
  Moon,
  CloudOff,
  RefreshCw,
  Menu,
  X
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { UserManagementPanel } from './components/admin/UserManagementPanel';
import { ClientManagementView } from './components/admin/ClientManagementView';
import { OperationsFleetMap } from './components/operations/OperationsFleetMap';
import { ClientPortalView } from './components/client/ClientPortalView';
import { TabletConductorView } from './components/tablet/TabletConductorView';
import { CommercialManagementView } from './components/commercial/CommercialManagementView';
import { FleetManagementPanel } from './components/fleet/FleetManagementPanel';
import { GpsStatusPill } from './components/gps/GpsStatusPill';
import { useGpsTracker } from './services/gps-tracker';
import { OfflineStorageService } from './services/offline-storage';
import { RolUsuario } from './types/auth';

/**
 * Componente de ruta protegida con verificación de RBAC
 */
const ProtectedRoute: React.FC<{
  allowedRoles: RolUsuario[];
  children: React.ReactElement;
}> = ({ allowedRoles, children }) => {
  const { usuario, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Cargando sesión Zion Services...
      </div>
    );
  }

  if (!isAuthenticated || !usuario) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(usuario.rol)) {
    // Redirigir a su vista autorizada por defecto
    if (usuario.rol === 'CLIENTE') return <Navigate to="/portal-cliente" replace />;
    if (usuario.rol === 'CONDUCTOR') return <Navigate to="/tablet" replace />;
    if (usuario.rol === 'JEFE_OPERACIONES') return <Navigate to="/operaciones" replace />;
    if (usuario.rol === 'COMERCIAL') return <Navigate to="/comercial" replace />;
    if (usuario.rol === 'OPERACIONES') return <Navigate to="/login" replace />;
    return <Navigate to="/admin/usuarios" replace />;
  }

  return children;
};

/**
 * Layout principal con encabezado oficial y barra de navegación reactiva
 */
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { location: coords, status: gpsStatus } = useGpsTracker(true);

  const [isDark, setIsDark] = useState<boolean>(true);
  const [itemsOffline, setItemsOffline] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Actualizar conteo de cola offline y registrar syncWorker
  useEffect(() => {
    const updateOfflineCount = async () => {
      const count = await OfflineStorageService.getItemsPendientesCount();
      setItemsOffline(count);
    };

    updateOfflineCount();
    const interval = setInterval(updateOfflineCount, 10000);

    const cleanupWorker = OfflineStorageService.iniciarSyncWorker((resultado) => {
      console.log(`[SyncWorker] Sincronizados: ${resultado.procesados}, Fallidos: ${resultado.fallidos}`);
      updateOfflineCount();
    });

    return () => {
      clearInterval(interval);
      cleanupWorker();
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await OfflineStorageService.procesarColaSync();
    const count = await OfflineStorageService.getItemsPendientesCount();
    setItemsOffline(count);
    setIsSyncing(false);
  };

  if (!usuario) return null;

  const puedeVerTablet = ['SUPERADMIN', 'ADMIN', 'JEFE_OPERACIONES', 'CONDUCTOR'].includes(usuario.rol);
  const puedeVerOperaciones = ['SUPERADMIN', 'ADMIN', 'JEFE_OPERACIONES'].includes(usuario.rol);
  const puedeVerFlota = ['SUPERADMIN', 'ADMIN', 'JEFE_OPERACIONES'].includes(usuario.rol);
  const puedeVerUsuarios = ['SUPERADMIN', 'ADMIN'].includes(usuario.rol);
  const puedeVerClientes = ['SUPERADMIN', 'ADMIN'].includes(usuario.rol);
  const puedeVerCliente = ['SUPERADMIN', 'ADMIN', 'CLIENTE'].includes(usuario.rol);
  const puedeVerComercial = ['SUPERADMIN', 'ADMIN', 'COMERCIAL'].includes(usuario.rol);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto h-16 px-3 sm:px-4 flex items-center justify-between gap-2 overflow-hidden">
          {/* Brand & Usuario */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 select-none">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
              ZS
            </div>
            <div>
              <div className="font-semibold text-xs sm:text-sm leading-tight tracking-tight flex items-center gap-1.5 sm:gap-2">
                <span>ZION SERVICES</span>
                <Badge variant="outline" className="text-[9px] sm:text-[10px] uppercase font-mono py-0 px-1 sm:px-1.5">
                  {usuario.rol}
                </Badge>
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">
                {usuario.nombre} {usuario.apellido}
              </div>
            </div>
          </div>

          {/* Rutas Principales: Nivel Desktop Extendido (>= 1200px / xl) */}
          <div className="hidden xl:flex items-center gap-1.5 p-1 bg-muted rounded-lg border border-border text-xs shrink-0">
            {puedeVerTablet && (
              <Button
                variant={location.pathname === '/tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/tablet')}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Tablet Conductor</span>
              </Button>
            )}
            {puedeVerOperaciones && (
              <Button
                variant={location.pathname === '/operaciones' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/operaciones')}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Jefe Operaciones</span>
              </Button>
            )}
            {puedeVerFlota && (
              <Button
                variant={location.pathname === '/flota' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/flota')}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Flota</span>
              </Button>
            )}
            {puedeVerComercial && (
              <Button
                variant={location.pathname === '/comercial' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/comercial')}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>Gestión Comercial</span>
              </Button>
            )}
            {puedeVerUsuarios && (
              <Button
                variant={location.pathname === '/admin/usuarios' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/admin/usuarios')}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Gestión Usuarios</span>
              </Button>
            )}
            {puedeVerClientes && (
              <Button
                variant={location.pathname === '/admin/clientes' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/admin/clientes')}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Empresas & Faenas</span>
              </Button>
            )}
            {puedeVerCliente && (
              <Button
                variant={location.pathname === '/portal-cliente' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/portal-cliente')}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Portal Cliente</span>
              </Button>
            )}
          </div>

          {/* Rutas Principales: Nivel Compacto Tablets / Pantallas Medianas (768px a 1199px / md a xl) */}
          <div className="hidden md:flex xl:hidden items-center gap-1 p-1 bg-muted rounded-lg border border-border text-xs shrink-0">
            {puedeVerTablet && (
              <Button
                variant={location.pathname === '/tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/tablet')}
                className="h-8 px-2 text-xs flex items-center gap-1 shrink-0"
                title="Tablet Conductor"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Tablet</span>
              </Button>
            )}
            {puedeVerOperaciones && (
              <Button
                variant={location.pathname === '/operaciones' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/operaciones')}
                className="h-8 px-2 text-xs flex items-center gap-1 shrink-0"
                title="Jefe Operaciones"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Operaciones</span>
              </Button>
            )}
            {puedeVerFlota && (
              <Button
                variant={location.pathname === '/flota' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/flota')}
                className="h-8 px-2 text-xs flex items-center gap-1 shrink-0"
                title="Gestión de Flota"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Flota</span>
              </Button>
            )}
            {puedeVerComercial && (
              <Button
                variant={location.pathname === '/comercial' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/comercial')}
                className="h-8 px-2 text-xs flex items-center gap-1 shrink-0"
                title="Gestión Comercial"
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>Comercial</span>
              </Button>
            )}
            {puedeVerUsuarios && (
              <Button
                variant={location.pathname === '/admin/usuarios' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/admin/usuarios')}
                className="h-8 px-2 text-xs flex items-center gap-1 shrink-0"
                title="Gestión Usuarios"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Usuarios</span>
              </Button>
            )}
            {puedeVerClientes && (
              <Button
                variant={location.pathname === '/admin/clientes' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/admin/clientes')}
                className="h-8 px-2 text-xs flex items-center gap-1 shrink-0"
                title="Gestión Clientes y Faenas"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Clientes</span>
              </Button>
            )}
            {puedeVerCliente && (
              <Button
                variant={location.pathname === '/portal-cliente' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/portal-cliente')}
                className="h-8 px-2 text-xs flex items-center gap-1 shrink-0"
                title="Portal Cliente"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Portal</span>
              </Button>
            )}
          </div>

          {/* Bloque de Controles Derecho */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Indicador de cola offline */}
            {itemsOffline > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={isSyncing}
                title="Peticiones acumuladas en cola offline. Pulse para sincronizar ahora."
                className="h-8 text-xs bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 flex items-center gap-1.5 shrink-0"
              >
                {isSyncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CloudOff className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{itemsOffline} pendientes</span>
              </Button>
            )}

            {/* Indicador de GPS */}
            <div className="hidden lg:block shrink-0">
              <GpsStatusPill status={gpsStatus} location={coords} />
            </div>

            {/* Tema Oscuro / Claro */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="h-8 w-8 shrink-0"
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Cerrar Sesión Oficial Visible Zion Services */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 px-2 sm:px-2.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors flex items-center gap-1.5 shrink-0"
              title="Cerrar sesión segura de Zion Services"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </Button>

            {/* Botón Menú Hamburguesa Móvil (< 768px) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              title={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú de módulos'}
              aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú de módulos'}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Panel Desplegable Móvil (< 768px) Touch-Friendly */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-md px-4 py-3 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Módulos del Sistema
            </div>
            <nav className="flex flex-col gap-1.5">
              {puedeVerTablet && (
                <Button
                  variant={location.pathname === '/tablet' ? 'default' : 'ghost'}
                  onClick={() => {
                    navigate('/tablet');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start h-10 px-3 text-sm flex items-center gap-2.5 font-medium"
                >
                  <Truck className="h-4 w-4 shrink-0" />
                  <span>Tablet Conductor</span>
                </Button>
              )}
              {puedeVerOperaciones && (
                <Button
                  variant={location.pathname === '/operaciones' ? 'default' : 'ghost'}
                  onClick={() => {
                    navigate('/operaciones');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start h-10 px-3 text-sm flex items-center gap-2.5 font-medium"
                >
                  <ClipboardList className="h-4 w-4 shrink-0" />
                  <span>Jefe Operaciones</span>
                </Button>
              )}
              {puedeVerFlota && (
                <Button
                  variant={location.pathname === '/flota' ? 'default' : 'ghost'}
                  onClick={() => {
                    navigate('/flota');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start h-10 px-3 text-sm flex items-center gap-2.5 font-medium"
                >
                  <Truck className="h-4 w-4 shrink-0" />
                  <span>Gestión Flota</span>
                </Button>
              )}
              {puedeVerComercial && (
                <Button
                  variant={location.pathname === '/comercial' ? 'default' : 'ghost'}
                  onClick={() => {
                    navigate('/comercial');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start h-10 px-3 text-sm flex items-center gap-2.5 font-medium"
                >
                  <Briefcase className="h-4 w-4 shrink-0" />
                  <span>Gestión Comercial</span>
                </Button>
              )}
              {puedeVerUsuarios && (
                <Button
                  variant={location.pathname === '/admin/usuarios' ? 'default' : 'ghost'}
                  onClick={() => {
                    navigate('/admin/usuarios');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start h-10 px-3 text-sm flex items-center gap-2.5 font-medium"
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span>Gestión Usuarios</span>
                </Button>
              )}
              {puedeVerClientes && (
                <Button
                  variant={location.pathname === '/admin/clientes' ? 'default' : 'ghost'}
                  onClick={() => {
                    navigate('/admin/clientes');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start h-10 px-3 text-sm flex items-center gap-2.5 font-medium"
                >
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>Empresas & Faenas</span>
                </Button>
              )}
              {puedeVerCliente && (
                <Button
                  variant={location.pathname === '/portal-cliente' ? 'default' : 'ghost'}
                  onClick={() => {
                    navigate('/portal-cliente');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start h-10 px-3 text-sm flex items-center gap-2.5 font-medium"
                >
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>Portal Cliente</span>
                </Button>
              )}
            </nav>
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="truncate max-w-[180px]">{usuario.email}</span>
              <GpsStatusPill status={gpsStatus} location={coords} />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {children}
      </main>
    </div>
  );
};

/**
 * Enrutador Central de la Aplicación
 */
function AppRoutes() {
  const { usuario, isAuthenticated } = useAuth();

  const getDefaultRoute = () => {
    if (!usuario) return '/login';
    if (usuario.rol === 'CLIENTE') return '/portal-cliente';
    if (usuario.rol === 'CONDUCTOR') return '/tablet';
    if (usuario.rol === 'JEFE_OPERACIONES') return '/operaciones';
    if (usuario.rol === 'COMERCIAL') return '/comercial';
    if (usuario.rol === 'OPERACIONES') return '/login';
    return '/admin/usuarios';
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <LoginScreen />}
      />

      <Route
        path="/tablet"
        element={
          <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'JEFE_OPERACIONES', 'CONDUCTOR']}>
            <AppLayout>
              <TabletConductorView />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/operaciones"
        element={
          <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'JEFE_OPERACIONES']}>
            <AppLayout>
              <OperationsFleetMap />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/flota"
        element={
          <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'JEFE_OPERACIONES']}>
            <AppLayout>
              <FleetManagementPanel />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/comercial"
        element={
          <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'COMERCIAL']}>
            <AppLayout>
              <CommercialManagementView />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/usuarios"
        element={
          <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}>
            <AppLayout>
              <UserManagementPanel />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/clientes"
        element={
          <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}>
            <AppLayout>
              <ClientManagementView />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/portal-cliente"
        element={
          <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'CLIENTE']}>
            <AppLayout>
              <ClientPortalView />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
