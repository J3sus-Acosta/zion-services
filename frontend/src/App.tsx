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
  Download,
  Eye,
  Lock,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'tablet' | 'operaciones' | 'comercial' | 'cliente'>('tablet');

  // Estado del flujo Tablet Conductor
  const [pasoTablet, setPasoTablet] = useState<number>(1);
  const [fotosTomadas, setFotosTomadas] = useState<number>(0);
  const [otFirmada, setOtFirmada] = useState<boolean>(false);
  const [fotosFaena, setFotosFaena] = useState<number>(0);
  const [recepcionFirmada, setRecepcionFirmada] = useState<boolean>(false);
  const [sidrepSellado, setSidrepSellado] = useState<boolean>(false);

  // Manejo de clase .dark en el root HTML
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      {/* Top Navigation Bar Neutra */}
      <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center text-sm shadow-sm select-none">
              ZS
            </div>
            <div>
              <div className="font-semibold text-sm leading-tight tracking-tight">ZION SERVICES</div>
              <div className="text-xs text-muted-foreground">Sistema de Gestión de Operaciones</div>
            </div>
          </div>

          {/* Selector de Perfiles y Modo */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 p-1 bg-muted rounded-lg border border-border">
              <Button
                variant={activeTab === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('tablet')}
              >
                <Truck className="h-4 w-4" />
                <span>Tablet</span>
              </Button>
              <Button
                variant={activeTab === 'operaciones' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('operaciones')}
              >
                <ClipboardList className="h-4 w-4" />
                <span>Operaciones</span>
              </Button>
              <Button
                variant={activeTab === 'comercial' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('comercial')}
              >
                <Building2 className="h-4 w-4" />
                <span>Comercial</span>
              </Button>
              <Button
                variant={activeTab === 'cliente' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('cliente')}
              >
                <Lock className="h-4 w-4" />
                <span>Clientes</span>
              </Button>
            </div>

            {/* Selector de Modo Claro / Oscuro */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ========================================================= */}
        {/* 1. VISTA TABLET ANDROID PARA CONDUCTORES */}
        {/* ========================================================= */}
        {activeTab === 'tablet' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Terminal Móvil de Terreno</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Unidad RVFL-92 (Estanque 12m³) · Conductor: C. Sánchez · OS-000561
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Terminal Online</Badge>
                <Badge variant="outline">Modalidad: Local Santiago</Badge>
              </div>
            </div>

            {/* Asistente Secuencial de Terreno */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Paso 1: Salida de Planta */}
              <Card className={pasoTablet === 1 ? 'ring-2 ring-primary border-primary' : 'opacity-80'}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={pasoTablet > 1 ? 'default' : 'secondary'}>Paso 1</Badge>
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg mt-2">Salida Planta Zion</CardTitle>
                  <CardDescription>
                    Checklist de inspección preoperacional y 4 fotos perimetrales requeridas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm rounded-lg bg-muted p-3 border border-border flex justify-between items-center">
                    <span className="text-muted-foreground">Fotos perimetrales</span>
                    <span className="font-semibold">{fotosTomadas} / 4</span>
                  </div>

                  {fotosTomadas < 4 ? (
                    <Button
                      className="w-full"
                      onClick={() => setFotosTomadas((prev) => Math.min(4, prev + 1))}
                    >
                      <Camera className="h-4 w-4" />
                      Capturar Foto ({fotosTomadas + 1}/4)
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-primary/50 text-foreground font-semibold"
                      onClick={() => setPasoTablet(2)}
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Autorizar Salida
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Paso 2: Faena en Cliente */}
              <Card className={pasoTablet === 2 ? 'ring-2 ring-primary border-primary' : pasoTablet < 2 ? 'opacity-50' : 'opacity-80'}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={pasoTablet > 2 ? 'default' : 'secondary'}>Paso 2</Badge>
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg mt-2">Faena en Cliente</CardTitle>
                  <CardDescription>
                    Llegada, firma de Orden de Trabajo, registro fotográfico y recepción conforme.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!otFirmada ? (
                    <Button
                      className="w-full"
                      disabled={pasoTablet < 2}
                      onClick={() => setOtFirmada(true)}
                    >
                      Firma de Inicio OT
                    </Button>
                  ) : fotosFaena < 2 ? (
                    <Button
                      className="w-full"
                      onClick={() => setFotosFaena((prev) => prev + 1)}
                    >
                      <Camera className="h-4 w-4" />
                      Foto Faena y EPP ({fotosFaena + 1}/2)
                    </Button>
                  ) : !recepcionFirmada ? (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setRecepcionFirmada(true);
                        setPasoTablet(3);
                      }}
                    >
                      Firma Recepción Conforme
                    </Button>
                  ) : (
                    <div className="rounded-lg bg-muted p-3 text-center text-sm font-medium flex items-center justify-center gap-2 border border-border">
                      <CheckCircle2 className="h-4 w-4 text-foreground" />
                      Faena completada
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Paso 3: Destino y Romana */}
              <Card className={pasoTablet === 3 ? 'ring-2 ring-primary border-primary' : pasoTablet < 3 ? 'opacity-50' : 'opacity-80'}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={pasoTablet > 3 ? 'default' : 'secondary'}>Paso 3</Badge>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg mt-2">Destino y Romana</CardTitle>
                  <CardDescription>
                    Descarga autorizada, captura de SIDREP sellado y comprobante oficial.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!sidrepSellado ? (
                    <Button
                      className="w-full"
                      disabled={pasoTablet < 3}
                      onClick={() => {
                        setSidrepSellado(true);
                        setPasoTablet(4);
                      }}
                    >
                      <Camera className="h-4 w-4" />
                      Registrar SIDREP Timbrado
                    </Button>
                  ) : (
                    <div className="rounded-lg bg-muted p-3 text-center text-sm font-medium flex items-center justify-center gap-2 border border-border">
                      <CheckCircle2 className="h-4 w-4 text-foreground" />
                      Descarga Certificada (11.820 KG)
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. VISTA BACKOFFICE OPERACIONES */}
        {/* ========================================================= */}
        {activeTab === 'operaciones' && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4">
              <h1 className="text-2xl font-bold tracking-tight">Panel de Control de Operaciones</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Monitoreo de flota, verificación de invariante física y trazabilidad documental.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Auditoría Visual Perimetral del Vehículo</CardTitle>
                <CardDescription>
                  Comparativa de ángulos (Frontal, Lateral Izquierda, Trasera, Lateral Derecha) para verificación de estado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {['Frontal', 'Lateral Izquierda', 'Trasera', 'Lateral Derecha'].map((angulo) => (
                    <div key={angulo} className="rounded-lg border border-border p-4 bg-muted/40 space-y-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{angulo}</div>
                      <div className="h-28 rounded-md bg-secondary/80 border border-border flex flex-col items-center justify-center text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Salida Registrada</span>
                        <span>08:15 hrs · OK</span>
                      </div>
                      <div className="h-28 rounded-md bg-muted border border-dashed border-border flex flex-col items-center justify-center text-xs text-muted-foreground">
                        <span>Retorno a Planta</span>
                        <span>Pendiente</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. VISTA GESTIÓN COMERCIAL */}
        {/* ========================================================= */}
        {activeTab === 'comercial' && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4">
              <h1 className="text-2xl font-bold tracking-tight">Gestión Comercial & Estados de Pago</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Consolidación de atenciones, verificación de órdenes de compra y facturación.
              </p>
            </div>

            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Estado de Pago: EDP-2026-11-Q1</CardTitle>
                  <CardDescription>Cliente: Generador Industrial S.A. · RUT: 93.367.000-7 · Período: 01 al 15 Nov</CardDescription>
                </div>
                <Badge variant="outline">Pendiente Orden de Compra</Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground text-xs uppercase font-medium border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Folio OS</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Residuo</th>
                        <th className="px-4 py-3">Peso Certificado</th>
                        <th className="px-4 py-3 text-right">Monto Neto</th>
                        <th className="px-4 py-3 text-center">Expediente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3.5 font-medium">OS-000561</td>
                        <td className="px-4 py-3.5 text-muted-foreground">10/11/2026</td>
                        <td className="px-4 py-3.5">Aguas de lavado con aceites</td>
                        <td className="px-4 py-3.5">11.820 KG</td>
                        <td className="px-4 py-3.5 text-right font-medium">$ 850.000</td>
                        <td className="px-4 py-3.5 text-center">
                          <Badge variant="secondary">Completo</Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4 pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    1 orden de servicio incluida en este estado de pago.
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Total con IVA (19%)</div>
                      <div className="text-xl font-bold tracking-tight">$ 1.011.500</div>
                    </div>
                    <Button>
                      <FileText className="h-4 w-4" />
                      Adjuntar OC
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. PORTAL CLIENTES */}
        {/* ========================================================= */}
        {activeTab === 'cliente' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Portal de Clientes</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Consulta de atenciones ambientales, descargas autorizadas y expedientes digitales.
                </p>
              </div>
              <Badge variant="secondary">Cliente Autenticado</Badge>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Completado</Badge>
                  <span className="text-xs text-muted-foreground">10 Nov 2026</span>
                </div>
                <CardTitle className="text-lg mt-2">Atención OS-000561: Succión de Aguas con Aceite</CardTitle>
                <CardDescription>
                  Servicio finalizado con trazabilidad y disposición certificada en planta de destino.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="default">
                    <Download className="h-4 w-4" />
                    Descargar Expediente Digital (ZIP)
                  </Button>
                  <Button variant="outline">
                    <Eye className="h-4 w-4" />
                    Ver Certificado SIDREP
                  </Button>
                  <Button variant="outline">
                    <Eye className="h-4 w-4" />
                    Ver Ticket de Romana
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
