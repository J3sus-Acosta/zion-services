import React from 'react';
import { Truck, MapPin, Activity, Navigation, Radio, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

export interface TrackingCoordinates {
  latitud: number;
  longitud: number;
  precisionMts: number;
  ultimaActualizacion: string;
}

export interface TrackingData {
  ordenServicioId: string;
  patente?: string;
  conductorNombre?: string;
  trackingDisponible: boolean;
  motivo?: string;
  estadoTramo: string;
  coordenadas?: TrackingCoordinates;
  velocidadKmh?: number;
}

export interface TrackingMapViewProps {
  tracking: TrackingData | null;
  loading?: boolean;
  titulo?: string;
  subtitulo?: string;
  altura?: string;
  mostrarDetalles?: boolean;
}

/**
 * Componente canónico de Mapa de Trazabilidad y Seguimiento GPS Satelital
 * Diseñado conforme a los estándares visuales de SATEM (Dark Mode, acentos esmeralda, telemetría en vivo).
 */
export const TrackingMapView: React.FC<TrackingMapViewProps> = ({
  tracking,
  loading = false,
  titulo = 'Seguimiento GPS del Camión Asignado',
  subtitulo = 'Supervisión satelital en tiempo real durante la ventana activa de faena y ruta',
  altura = 'h-72',
  mostrarDetalles = true
}) => {
  const disponible = tracking?.trackingDisponible ?? false;
  const coords = tracking?.coordenadas;
  const estadoFormateado = tracking?.estadoTramo ? tracking.estadoTramo.replace(/_/g, ' ') : 'STANDBY';

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader className="pb-3 border-b border-border bg-muted/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <Truck className="h-4 w-4 text-emerald-500" />
              <span>{titulo}</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {disponible && tracking?.patente
                ? `Unidad ${tracking.patente} · Conductor: ${tracking.conductorNombre || 'Conductor asignado'}`
                : subtitulo}
            </CardDescription>
          </div>
          <Badge
            variant={disponible ? 'default' : 'outline'}
            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono text-[11px]"
          >
            {estadoFormateado}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className={`${altura} w-full flex items-center justify-center bg-muted/20 text-xs text-muted-foreground`}>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 animate-spin text-emerald-500" />
              <span>Sincronizando coordenadas GPS...</span>
            </div>
          </div>
        ) : disponible ? (
          <div className={`relative ${altura} w-full bg-muted/30 flex items-center justify-center overflow-hidden`}>
            {/* Trama de cuadrícula cartográfica técnica */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(#10b981 1px, transparent 1px), radial-gradient(#10b981 1px, var(--card) 1px)',
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 12px 12px'
              }}
            />

            {/* Trayectoria de ruta con vectores SVG */}
            <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-40">
              <path
                d="M 80 200 Q 200 120, 340 140"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeDasharray="5 5"
              />
            </svg>

            {/* Posición Planta Zion / Origen */}
            <div className="absolute left-8 bottom-8 flex flex-col items-center">
              <div className="h-3.5 w-3.5 rounded-full bg-emerald-500/80 border-2 border-background shadow-md" />
              <span className="text-[9px] text-muted-foreground font-mono mt-1">Planta Base</span>
            </div>

            {/* Posición central del camión con pulso radar */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="relative">
                <span className="animate-ping absolute inset-0 rounded-full bg-emerald-500 opacity-70 scale-150" />
                <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl border-2 border-background relative z-10">
                  <Truck className="h-5 w-5" />
                </div>
              </div>
              <div className="bg-card/95 border border-border text-foreground rounded-lg p-2 text-center mt-2 shadow-lg backdrop-blur-xs">
                <div className="text-xs font-bold font-mono text-foreground">{tracking?.patente || 'UNIDAD'}</div>
                <div className="text-[10px] text-emerald-400 font-semibold">
                  {tracking?.estadoTramo === 'EN_FAENA' ? 'En instalaciones del cliente' : 'En tránsito satelital'}
                </div>
              </div>
            </div>

            {/* Marcador de destino: Faena Cliente */}
            <div className="absolute right-12 top-12 flex flex-col items-center">
              <MapPin className="h-6 w-6 text-emerald-500 fill-emerald-500" />
              <span className="text-[10px] text-foreground font-bold bg-card/90 border border-border px-1.5 py-0.5 rounded mt-1 shadow-xs">
                Faena Cliente
              </span>
            </div>

            {/* Barra flotante inferior de telemetría */}
            {mostrarDetalles && (
              <div className="absolute bottom-2 left-2 right-2 bg-card/95 backdrop-blur-xs p-2.5 rounded-lg border border-border text-xs flex flex-wrap items-center justify-between gap-2 text-foreground">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                  <span>Telemetría:</span>
                  <span className="font-semibold text-emerald-400 font-mono">
                    {coords ? `±${coords.precisionMts}m` : 'En vivo'}
                  </span>
                </span>
                {coords && (
                  <span className="text-muted-foreground font-mono text-[11px] hidden sm:inline">
                    GPS: {coords.latitud.toFixed(4)}, {coords.longitud.toFixed(4)}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Navigation className="h-3 w-3 text-primary" />
                  <span>Ruta monitoreada</span>
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center space-y-3">
            <div className="h-12 w-12 mx-auto rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">Seguimiento en preparación</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
                {tracking?.motivo ||
                  'El seguimiento satelital se habilita automáticamente tan pronto el camión inicia el tramo de despacho hacia sus instalaciones.'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackingMapView;
