import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Download, Eye, FileText, Camera, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface TrackingData {
  ordenServicioId: string;
  patente?: string;
  conductorNombre?: string;
  trackingDisponible: boolean;
  motivo?: string;
  estadoTramo: string;
  coordenadas?: {
    latitud: number;
    longitud: number;
    precisionMts: number;
    ultimaActualizacion: string;
  };
}

interface EvidenciaItem {
  id: string;
  tipo: string;
  titulo: string;
  archivoUrl: string;
  fechaHora: string;
}

export const ClientPortalView: React.FC = () => {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [evidencias, setEvidencias] = useState<EvidenciaItem[]>([]);
  const [modalFoto, setModalFoto] = useState<EvidenciaItem | null>(null);

  const fetchClienteData = async () => {
    try {
      const [resTracking, resEvidencias] = await Promise.all([
        fetch('http://localhost:3000/api/clientes/ordenes/OS-000561/tracking', { credentials: 'include' }),
        fetch('http://localhost:3000/api/clientes/ordenes/OS-000561/expediente-en-vivo', { credentials: 'include' })
      ]);

      if (resTracking.ok) {
        const json = await resTracking.json();
        setTracking(json.data);
      }
      if (resEvidencias.ok) {
        const json = await resEvidencias.json();
        setEvidencias(json.data.evidencias);
      }
    } catch {}

    // Mock data para vista cliente
    if (!tracking) {
      setTracking({
        ordenServicioId: 'OS-000561',
        patente: 'RVFL-92',
        conductorNombre: 'Carlos Sánchez',
        trackingDisponible: true,
        estadoTramo: 'EN_RUTA_CLIENTE',
        coordenadas: {
          latitud: -33.4372,
          longitud: -70.6506,
          precisionMts: 8,
          ultimaActualizacion: new Date().toISOString()
        }
      });
      setEvidencias([
        {
          id: 'ev-1',
          tipo: 'FOTO_SALIDA',
          titulo: 'Inspección Perimetral Frontal',
          archivoUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80',
          fechaHora: '10:15 hrs'
        },
        {
          id: 'ev-2',
          tipo: 'FOTO_SALIDA',
          titulo: 'Inspección Lateral Izquierda',
          archivoUrl: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=600&q=80',
          fechaHora: '10:18 hrs'
        },
        {
          id: 'ev-3',
          tipo: 'FIRMA_OT',
          titulo: 'Orden de Trabajo Firmada en Tablet',
          archivoUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
          fechaHora: '11:00 hrs'
        }
      ]);
    }
  };

  useEffect(() => {
    fetchClienteData();
    const interval = setInterval(fetchClienteData, 15000);
    return () => clearInterval(interval);
  }, []);

  const descargarExpedienteZip = () => {
    alert('Generando expediente digital consolidado en formato ZIP con fotos, certificados y firmas...');
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Portal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Portal de Clientes</Badge>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Horse Chile SpA · Seguimiento de Atención
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Orden de Servicio OS-000561 · Retiro de Residuos Industriales Líquidos (12 m³)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={descargarExpedienteZip}>
            <Download className="h-4 w-4 mr-1.5" />
            <span>Descargar Expediente Digital</span>
          </Button>
        </div>
      </div>

      {/* Grid: Seguimiento GPS en Ventana Activa + Expediente en Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mapa y Estado de Ruta */}
        <Card className="border-border overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>Seguimiento GPS del Camión Asignado</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {tracking?.trackingDisponible
                    ? `Unidad ${tracking.patente} · Conductor: ${tracking.conductorNombre}`
                    : 'Seguimiento en ventana activa'}
                </CardDescription>
              </div>
              <Badge variant={tracking?.trackingDisponible ? 'default' : 'outline'}>
                {tracking?.estadoTramo ? tracking.estadoTramo.replace(/_/g, ' ') : 'STANDBY'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {tracking?.trackingDisponible ? (
              <div className="relative h-72 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                {/* Cuadrícula cartográfica */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      'radial-gradient(#10b981 1px, transparent 1px), radial-gradient(#10b981 1px, #020617 1px)',
                    backgroundSize: '24px 24px',
                    backgroundPosition: '0 0, 12px 12px'
                  }}
                />

                {/* Ruta hacia el cliente */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-40">
                  <path d="M 80 200 Q 200 120, 340 140" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="5 5" />
                </svg>

                {/* Camión en camino */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="relative">
                    <span className="animate-ping absolute inset-0 rounded-full bg-emerald-500 opacity-70 scale-150" />
                    <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl border-2 border-white relative z-10">
                      <Truck className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="bg-black/90 border border-emerald-500/40 text-white rounded-lg p-2 text-center mt-2 shadow-lg">
                    <div className="text-xs font-bold">{tracking.patente}</div>
                    <div className="text-[10px] text-emerald-400 font-semibold">En camino a sus instalaciones</div>
                  </div>
                </div>

                {/* Marcador Instalación Cliente */}
                <div className="absolute right-12 top-14 flex flex-col items-center">
                  <MapPin className="h-6 w-6 text-emerald-500 fill-emerald-500" />
                  <span className="text-[10px] text-white/90 font-bold bg-black/70 px-1.5 py-0.5 rounded mt-1">
                    Planta Horse Chile
                  </span>
                </div>

                <div className="absolute bottom-2 left-2 right-2 bg-card/90 backdrop-blur-xs p-2.5 rounded-lg border border-border text-xs flex items-center justify-between">
                  <span className="text-muted-foreground">Última actualización de GPS:</span>
                  <span className="font-semibold text-foreground">Hace 15 segundos (±8m)</span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-3">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
                <div>
                  <h4 className="font-semibold text-sm">Seguimiento no activo en este momento</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    El seguimiento satelital se habilita automáticamente tan pronto el camión inicia el tramo de despacho hacia sus instalaciones.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expediente Digital y Evidencias en Tiempo Real */}
        <Card className="border-border">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Expediente y Evidencias en Tiempo Real</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Documentos y fotografías sincronizados en vivo por el conductor desde terreno
                </CardDescription>
              </div>
              <Badge variant="outline">{evidencias.length} Archivos</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2.5">
              {evidencias.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-muted/40 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Camera className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{item.titulo}</div>
                      <div className="text-[11px] text-muted-foreground">Cargado a las {item.fechaHora}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setModalFoto(item)}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Ver
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => alert(`Descargando ${item.titulo}...`)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Visor de Fotografía */}
      {modalFoto && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-sm">{modalFoto.titulo}</span>
              <button onClick={() => setModalFoto(null)} className="p-1 rounded text-muted-foreground hover:bg-muted">
                ✕
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center max-h-[60vh]">
              <img src={modalFoto.archivoUrl} alt={modalFoto.titulo} className="max-h-[55vh] object-contain rounded" />
            </div>
            <div className="p-3 border-t border-border flex justify-end">
              <Button size="sm" onClick={() => setModalFoto(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
