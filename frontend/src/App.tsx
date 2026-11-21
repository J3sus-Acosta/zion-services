import { useState, useEffect } from 'react';
import {
  Truck,
  ShieldCheck,
  FileText,
  ClipboardList,
  Camera,
  MapPin,
  Building2,
  CheckCircle2,
  Users,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { UserManagementPanel } from './components/admin/UserManagementPanel';
import { CameraCaptureModal } from './components/camera/CameraCaptureModal';
import { ChecklistSalidaModal } from './components/checklist/ChecklistSalidaModal';
import { ChecklistRetornoModal } from './components/checklist/ChecklistRetornoModal';
import { OperationsFleetMap } from './components/operations/OperationsFleetMap';
import { ClientPortalView } from './components/client/ClientPortalView';
import { useGpsTracker } from './services/gps-tracker';
import { GpsStatusPill } from './components/gps/GpsStatusPill';
import { OfflineStorageService } from './services/offline-storage';

const NOMBRES_FOTOS_360 = ['Frontal', 'Lateral Izquierda', 'Trasera', 'Lateral Derecha'];

function MainApp() {
  const { usuario, isAuthenticated, logout } = useAuth();
  const { location, status: gpsStatus, registrarHitoGps } = useGpsTracker(true);

  const [isDark, setIsDark] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'tablet' | 'operaciones' | 'usuarios' | 'cliente'>('tablet');

  // Estado del flujo Tablet Conductor
  const [pasoTablet, setPasoTablet] = useState<number>(1);
  const [checklistSalidaListo, setChecklistSalidaListo] = useState<boolean>(false);
  const [isChecklistSalidaOpen, setIsChecklistSalidaOpen] = useState<boolean>(false);
  const [fotosSalida, setFotosSalida] = useState<string[]>([]);
  const [isCameraSalidaOpen, setIsCameraSalidaOpen] = useState<boolean>(false);

  // Faena
  const [otFirmada, setOtFirmada] = useState<boolean>(false);
  const [fotosFaena, setFotosFaena] = useState<string[]>([]);
  const [isCameraFaenaOpen, setIsCameraFaenaOpen] = useState<boolean>(false);
  const [recepcionFirmada, setRecepcionFirmada] = useState<boolean>(false);

  // Romana
  const [sidrepSellado, setSidrepSellado] = useState<boolean>(false);
  const [isCameraSidrepOpen, setIsCameraSidrepOpen] = useState<boolean>(false);

  // Retorno a Planta Zion
  const [isChecklistRetornoOpen, setIsChecklistRetornoOpen] = useState<boolean>(false);
  const [checklistRetornoListo, setChecklistRetornoListo] = useState<boolean>(false);
  const [fotosRetorno, setFotosRetorno] = useState<string[]>([]);
  const [isCameraRetornoOpen, setIsCameraRetornoOpen] = useState<boolean>(false);

  // Sincronizar clase .dark
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Redirección contextual inicial según rol
  useEffect(() => {
    if (usuario) {
      if (usuario.rol === 'CLIENTE') {
        setActiveTab('cliente');
      } else if (usuario.rol === 'JEFE_OPERACIONES') {
        setActiveTab('operaciones');
      } else if (usuario.rol === 'SUPERADMIN' || usuario.rol === 'ADMIN') {
        setActiveTab('usuarios');
      } else if (usuario.rol === 'CONDUCTOR') {
        setActiveTab('tablet');
      }
    }
  }, [usuario?.rol]);

  if (!isAuthenticated || !usuario) {
    return <LoginScreen />;
  }

  // Permisos de tabs según rol
  const puedeVerTablet = usuario.rol === 'SUPERADMIN' || usuario.rol === 'ADMIN' || usuario.rol === 'JEFE_OPERACIONES' || usuario.rol === 'CONDUCTOR';
  const puedeVerOperaciones = usuario.rol === 'SUPERADMIN' || usuario.rol === 'ADMIN' || usuario.rol === 'JEFE_OPERACIONES';
  const puedeVerUsuarios = usuario.rol === 'SUPERADMIN' || usuario.rol === 'ADMIN';
  const puedeVerCliente = usuario.rol === 'SUPERADMIN' || usuario.rol === 'ADMIN' || usuario.rol === 'CLIENTE';

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center text-sm shadow-sm select-none">
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

          {/* Selector de Vistas / Perfiles */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 p-1 bg-muted rounded-lg border border-border text-xs">
              {puedeVerTablet && (
                <Button
                  variant={activeTab === 'tablet' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('tablet')}
                  className="h-8 text-xs"
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span>Tablet Conductor</span>
                </Button>
              )}
              {puedeVerOperaciones && (
                <Button
                  variant={activeTab === 'operaciones' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('operaciones')}
                  className="h-8 text-xs"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span>Jefe de Operaciones</span>
                </Button>
              )}
              {puedeVerUsuarios && (
                <Button
                  variant={activeTab === 'usuarios' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('usuarios')}
                  className="h-8 text-xs"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Gestión de Usuarios</span>
                </Button>
              )}
              {puedeVerCliente && (
                <Button
                  variant={activeTab === 'cliente' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('cliente')}
                  className="h-8 text-xs"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Portal Cliente</span>
                </Button>
              )}
            </div>

            {/* GPS Status Indicator */}
            <div className="hidden md:block">
              <GpsStatusPill status={gpsStatus} location={location} />
            </div>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="h-8 w-8"
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Cerrar Sesión */}
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ========================================================= */}
        {/* 1. VISTA TABLET CONDUCTOR (FLUJO DE TERRENO)             */}
        {/* ========================================================= */}
        {activeTab === 'tablet' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Terminal Móvil de Terreno</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Unidad RVFL-92 (Estanque 12m³) · Conductor: {usuario.nombre} {usuario.apellido} · OS-000561
                </p>
              </div>
              <div className="flex items-center gap-2">
                <GpsStatusPill status={gpsStatus} location={location} />
                <Badge variant="outline">Modalidad: Local Santiago</Badge>
              </div>
            </div>

            {/* Asistente Secuencial de Terreno */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Paso 1: Salida de Planta Zion */}
              <Card className={pasoTablet === 1 ? 'ring-2 ring-primary border-primary' : 'opacity-85'}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={pasoTablet > 1 ? 'default' : 'secondary'}>Paso 1</Badge>
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base mt-2">Salida Planta Zion</CardTitle>
                  <CardDescription className="text-xs">
                    Checklist de 80 ítems y 4 fotos perimetrales.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Checklist */}
                  {!checklistSalidaListo ? (
                    <Button
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => setIsChecklistSalidaOpen(true)}
                    >
                      <ClipboardList className="h-4 w-4 mr-1.5" />
                      Llenar Checklist (80 ítems)
                    </Button>
                  ) : (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-xs font-semibold text-emerald-500 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        Checklist Conforme
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setIsChecklistSalidaOpen(true)}>
                        Ver
                      </Button>
                    </div>
                  )}

                  {/* Contador y Captura de Fotos */}
                  <div className="text-xs rounded-lg bg-muted p-2.5 border border-border flex justify-between items-center">
                    <span className="text-muted-foreground">Fotos Perimetrales</span>
                    <span className="font-semibold">{fotosSalida.length} / 4</span>
                  </div>

                  {/* Miniaturas de fotos */}
                  {fotosSalida.length > 0 && (
                    <div className="grid grid-cols-4 gap-1">
                      {fotosSalida.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded overflow-hidden border border-border">
                          <img src={url} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {fotosSalida.length < 4 ? (
                    <Button
                      className="w-full text-xs"
                      disabled={!checklistSalidaListo}
                      onClick={() => setIsCameraSalidaOpen(true)}
                    >
                      <Camera className="h-4 w-4 mr-1.5" />
                      Foto {NOMBRES_FOTOS_360[fotosSalida.length]} ({fotosSalida.length + 1}/4)
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                      onClick={() => {
                        registrarHitoGps('OS-000561', 'EN_RUTA_CLIENTE');
                        setPasoTablet(2);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Autorizar Salida e Iniciar Ruta
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Paso 2: Faena en Cliente */}
              <Card className={pasoTablet === 2 ? 'ring-2 ring-primary border-primary' : pasoTablet < 2 ? 'opacity-50' : 'opacity-85'}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={pasoTablet > 2 ? 'default' : 'secondary'}>Paso 2</Badge>
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base mt-2">Faena en Cliente</CardTitle>
                  <CardDescription className="text-xs">
                    Llegada, firma de OT, fotos de faena y recepción.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!otFirmada ? (
                    <Button
                      className="w-full text-xs"
                      disabled={pasoTablet < 2}
                      onClick={() => {
                        registrarHitoGps('OS-000561', 'EN_FAENA');
                        setOtFirmada(true);
                      }}
                    >
                      Firma de Inicio OT
                    </Button>
                  ) : fotosFaena.length < 2 ? (
                    <Button className="w-full text-xs" onClick={() => setIsCameraFaenaOpen(true)}>
                      <Camera className="h-4 w-4 mr-1.5" />
                      Foto Faena y EPP ({fotosFaena.length + 1}/2)
                    </Button>
                  ) : !recepcionFirmada ? (
                    <Button
                      className="w-full text-xs"
                      onClick={() => {
                        setRecepcionFirmada(true);
                        registrarHitoGps('OS-000561', 'HACIA_ROMANA');
                        setPasoTablet(3);
                      }}
                    >
                      Firma Recepción Conforme
                    </Button>
                  ) : (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-center text-xs font-semibold text-emerald-500 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Faena completada
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Paso 3: Destino y Romana */}
              <Card className={pasoTablet === 3 ? 'ring-2 ring-primary border-primary' : pasoTablet < 3 ? 'opacity-50' : 'opacity-85'}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={pasoTablet > 3 ? 'default' : 'secondary'}>Paso 3</Badge>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base mt-2">Destino y Romana</CardTitle>
                  <CardDescription className="text-xs">
                    Descarga certificada y captura de SIDREP.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!sidrepSellado ? (
                    <Button
                      className="w-full text-xs"
                      disabled={pasoTablet < 3}
                      onClick={() => setIsCameraSidrepOpen(true)}
                    >
                      <Camera className="h-4 w-4 mr-1.5" />
                      Capturar SIDREP Timbrado
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-center text-xs font-semibold text-emerald-500 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        SIDREP Sellado (11.820 KG)
                      </div>
                      <Button
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => {
                          registrarHitoGps('OS-000561', 'RETORNANDO');
                          setPasoTablet(4);
                        }}
                      >
                        Iniciar Retorno a Base
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Paso 4: Retorno a Planta Zion */}
              <Card className={pasoTablet === 4 ? 'ring-2 ring-primary border-primary' : pasoTablet < 4 ? 'opacity-50' : 'opacity-85'}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={checklistRetornoListo && fotosRetorno.length === 4 ? 'default' : 'secondary'}>Paso 4</Badge>
                    <Truck className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base mt-2">Retorno Planta Zion</CardTitle>
                  <CardDescription className="text-xs">
                    Checklist de llegada y 4 fotos perimetrales de cierre.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!checklistRetornoListo ? (
                    <Button
                      className="w-full text-xs"
                      disabled={pasoTablet < 4}
                      onClick={() => setIsChecklistRetornoOpen(true)}
                    >
                      <ClipboardList className="h-4 w-4 mr-1.5" />
                      Checklist de Retorno
                    </Button>
                  ) : fotosRetorno.length < 4 ? (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>Fotos Cierre</span>
                        <span className="font-semibold text-foreground">{fotosRetorno.length}/4</span>
                      </div>
                      <Button className="w-full text-xs" onClick={() => setIsCameraRetornoOpen(true)}>
                        <Camera className="h-4 w-4 mr-1.5" />
                        Foto Retorno ({fotosRetorno.length + 1}/4)
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-center text-xs font-semibold text-emerald-500 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Jornada Cerrada y Auditada
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Modales de la Tablet */}
            <ChecklistSalidaModal
              isOpen={isChecklistSalidaOpen}
              onClose={() => setIsChecklistSalidaOpen(false)}
              onCompletar={(items, km, hrs) => {
                setChecklistSalidaListo(true);
                OfflineStorageService.guardarChecklist('salida-01', { items, km, hrs });
              }}
            />

            <CameraCaptureModal
              isOpen={isCameraSalidaOpen}
              onClose={() => setIsCameraSalidaOpen(false)}
              titulo={`Inspección Salida: Foto ${NOMBRES_FOTOS_360[fotosSalida.length] || 'Perimetral'}`}
              subtitulo="Encuadre el vehículo claramente en el recuadro"
              onCapture={(dataUrl) => {
                setFotosSalida((prev) => [...prev, dataUrl]);
                OfflineStorageService.guardarFoto(`foto-salida-${fotosSalida.length + 1}`, 'SALIDA', dataUrl);
              }}
            />

            <CameraCaptureModal
              isOpen={isCameraFaenaOpen}
              onClose={() => setIsCameraFaenaOpen(false)}
              titulo="Evidencia Fotográfica de Faena y EPP"
              subtitulo="Fotografíe la manguera acoplada y al operador con su equipo de seguridad"
              onCapture={(dataUrl) => {
                setFotosFaena((prev) => [...prev, dataUrl]);
              }}
            />

            <CameraCaptureModal
              isOpen={isCameraSidrepOpen}
              onClose={() => setIsCameraSidrepOpen(false)}
              titulo="Comprobante SIDREP Timbrado"
              subtitulo="Capture el documento timbrado en romana"
              onCapture={() => setSidrepSellado(true)}
            />

            <ChecklistRetornoModal
              isOpen={isChecklistRetornoOpen}
              onClose={() => setIsChecklistRetornoOpen(false)}
              onCompletar={() => setChecklistRetornoListo(true)}
            />

            <CameraCaptureModal
              isOpen={isCameraRetornoOpen}
              onClose={() => setIsCameraRetornoOpen(false)}
              titulo={`Inspección Retorno: Foto ${NOMBRES_FOTOS_360[fotosRetorno.length] || 'Cierre'}`}
              subtitulo="Auditoría perimetral de cierre para comparar con la salida"
              onCapture={(dataUrl) => {
                setFotosRetorno((prev) => [...prev, dataUrl]);
              }}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. VISTA JEFE DE OPERACIONES                              */}
        {/* ========================================================= */}
        {activeTab === 'operaciones' && <OperationsFleetMap />}

        {/* ========================================================= */}
        {/* 3. VISTA GESTIÓN DE USUARIOS                              */}
        {/* ========================================================= */}
        {activeTab === 'usuarios' && <UserManagementPanel />}

        {/* ========================================================= */}
        {/* 4. VISTA PORTAL CLIENTE                                   */}
        {/* ========================================================= */}
        {activeTab === 'cliente' && <ClientPortalView />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
