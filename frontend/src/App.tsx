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
  RefreshCw
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { UserManagementPanel } from './components/admin/UserManagementPanel';
import { OperationsFleetMap } from './components/operations/OperationsFleetMap';
import { ClientPortalView } from './components/client/ClientPortalView';
import { TabletConductorView } from './components/tablet/TabletConductorView';
import { CommercialManagementView } from './components/commercial/CommercialManagementView';
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
        Cargando sesión SATEM...
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
  const puedeVerUsuarios = ['SUPERADMIN', 'ADMIN'].includes(usuario.rol);
  const puedeVerCliente = ['SUPERADMIN', 'ADMIN', 'CLIENTE'].includes(usuario.rol);
  const puedeVerComercial = ['SUPERADMIN', 'ADMIN', 'COMERCIAL'].includes(usuario.rol);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm shadow-sm select-none">
              ZS
            </div>
            <div>
              <div className="font-semibold text-sm leading-tight tracking-tight flex items-center gap-2">
                <span>ZION SERVICES</span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono py-0">
                  {usuario.rol}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">{usuario.nombre} {usuario.apellido}</div>
            </div>
          </div>

          {/* Rutas Principales */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 p-1 bg-muted rounded-lg border border-border text-xs">
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

            {/* Indicador de cola offline */}
            {itemsOffline > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={isSyncing}
                title="Peticiones acumuladas en cola offline. Pulse para sincronizar ahora."
                className="h-8 text-xs bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 flex items-center gap-1.5"
              >
                {isSyncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CloudOff className="h-3.5 w-3.5" />}
                <span>{itemsOffline} pendientes</span>
              </Button>
            )}

            {/* Indicador de GPS */}
            <div className="hidden md:block">
              <GpsStatusPill status={gpsStatus} location={coords} />
            </div>

            {/* Tema Oscuro / Claro */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="h-8 w-8"
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Cerrar Sesión Oficial Visible SATEM */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors flex items-center gap-1.5"
              title="Cerrar sesión segura de SATEM"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
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
