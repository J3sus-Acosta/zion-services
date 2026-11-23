import React, { useState, useEffect } from 'react';
import { Truck, Navigation, RefreshCw, Radio, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { apiUrl } from '../../config/api';

interface UnidadOperativa {
  vehiculoId: string;
  patente: string;
  conductorNombre: string;
  ordenServicioId: string;
  empresaClienteId: string;
  estadoTramo: string;
  latitud: number;
  longitud: number;
  precisionMts: number;
  ultimaActualizacion: string;
  velocidadKmh?: number;
}

export const OperationsFleetMap: React.FC = () => {
  const [unidades, setUnidades] = useState<UnidadOperativa[]>([]);
  const [seleccionada, setSeleccionada] = useState<UnidadOperativa | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchFlota = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/operaciones/flota-en-vivo'), { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setUnidades(json.data.unidades);
        if (json.data.unidades.length > 0 && !seleccionada) {
          setSeleccionada(json.data.unidades[0]);
        }
        setLoading(false);
        return;
      }
    } catch { }

    // Mock representativo si backend offline
    const mock: UnidadOperativa[] = [
      {
        vehiculoId: 'veh-01',
        patente: 'RVFL-92',
        conductorNombre: 'Carlos Sánchez',
        ordenServicioId: 'OS-000561',
        empresaClienteId: 'Horse Chile SpA',
        estadoTramo: 'EN_RUTA_CLIENTE',
        latitud: -33.4372,
        longitud: -70.6506,
        precisionMts: 8,
        ultimaActualizacion: new Date().toISOString(),
        velocidadKmh: 48
      },
      {
        vehiculoId: 'veh-02',
        patente: 'GKBT-44',
        conductorNombre: 'Rodrigo Morales',
        ordenServicioId: 'OS-000562',
        empresaClienteId: 'Bravo Energy',
        estadoTramo: 'EN_FAENA',
        latitud: -33.4891,
        longitud: -70.7123,
        precisionMts: 6,
        ultimaActualizacion: new Date(Date.now() - 120000).toISOString(),
        velocidadKmh: 0
      }
    ];
    setUnidades(mock);
    if (!seleccionada) setSeleccionada(mock[0]);
    setLoading(false);
  };

  useEffect(() => {
    fetchFlota();
    const interval = setInterval(fetchFlota, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">Centro de Control</Badge>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Monitoreo y Seguimiento GPS de Flota
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Supervisión satelital en tiempo real de unidades activas desde las tablets en ruta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchFlota} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar Posición</span>
          </Button>
        </div>
      </div>

      {/* Grid: Lista de Camiones + Visualizador de Mapa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Unidades */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Camiones en Servicio ({unidades.length})
            </span>
            <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              En línea
            </span>
          </div>

          {unidades.map((unidad) => {
            const esActiva = seleccionada?.vehiculoId === unidad.vehiculoId;
            return (
              <Card
                key={unidad.vehiculoId}
                onClick={() => setSeleccionada(unidad)}
                className={`cursor-pointer transition-all border ${esActiva
                    ? 'border-primary ring-1 ring-primary shadow-sm bg-primary/5'
                    : 'border-border hover:bg-muted/40'
                  }`}
              >
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {unidad.patente.substring(0, 4)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground">{unidad.patente}</div>
                        <div className="text-xs text-muted-foreground">{unidad.conductorNombre}</div>
                      </div>
                    </div>
                    <Badge variant={unidad.estadoTramo === 'EN_FAENA' ? 'default' : 'secondary'} className="text-[10px]">
                      {unidad.estadoTramo.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60 text-muted-foreground">
                    <span className="font-medium text-foreground">{unidad.ordenServicioId}</span>
                    <span>Velocidad: {unidad.velocidadKmh || 0} km/h</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Visor de Mapa y Telemetría Detallada */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border overflow-hidden">
            <CardHeader className="pb-3 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-primary" />
                    <span>Mapa de Trazabilidad en Tiempo Real</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {seleccionada ? `Unidad ${seleccionada.patente} · ${seleccionada.ordenServicioId}` : 'Seleccione una unidad'}
                  </CardDescription>
                </div>
                {seleccionada && (
                  <Badge variant="outline" className="text-xs font-mono">
                    Lat: {seleccionada.latitud.toFixed(4)}, Lng: {seleccionada.longitud.toFixed(4)}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Representación visual de mapa satelital estilizado y adaptativo */}
              <div className="relative h-80 sm:h-96 w-full bg-slate-100 dark:bg-slate-950 transition-colors duration-200 flex items-center justify-center overflow-hidden border-b border-border">
                {/* Cuadrícula cartográfica de fondo: Modo Claro (técnica) y Modo Oscuro (cibernética) */}
                <div
                  className="absolute inset-0 opacity-25 dark:opacity-20 block dark:hidden transition-opacity duration-200"
                  style={{
                    backgroundImage:
                      'radial-gradient(#0284c7 1px, transparent 1px), radial-gradient(#0284c7 1px, var(--card) 1px)',
                    backgroundSize: '28px 28px',
                    backgroundPosition: '0 0, 14px 14px'
                  }}
                />
                <div
                  className="absolute inset-0 opacity-20 hidden dark:block transition-opacity duration-200"
                  style={{
                    backgroundImage:
                      'radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, #020617 1px)',
                    backgroundSize: '30px 30px',
                    backgroundPosition: '0 0, 15px 15px'
                  }}
                />

                {/* Ruta trazada de Santiago */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-60 dark:opacity-40">
                  <path
                    d="M 120 320 Q 240 240, 360 180 T 560 120"
                    fill="none"
                    stroke="currentColor"
                    className="text-primary dark:text-sky-400"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                  />
                </svg>

                {/* Marcador Base Planta Zion */}
                <div className="absolute left-28 bottom-16 flex flex-col items-center">
                  <div className="h-4 w-4 rounded-full bg-blue-500 border-2 border-white dark:border-slate-800 shadow-lg" />
                  <span className="text-[10px] text-card-foreground dark:text-white/90 font-bold bg-card/90 dark:bg-black/70 border border-border shadow-md px-1.5 py-0.5 rounded mt-1">
                    Planta Zion
                  </span>
                </div>

                {/* Marcador Camión Seleccionado con Pulso Radar */}
                {seleccionada && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-in zoom-in-95">
                    <div className="relative">
                      <span className="animate-ping absolute inset-0 rounded-full bg-primary opacity-60 scale-150" />
                      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl border-2 border-background relative z-10">
                        <Truck className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="bg-card/95 dark:bg-black/90 border border-border dark:border-primary/40 text-card-foreground dark:text-white rounded-lg p-2 text-center mt-2 shadow-xl backdrop-blur-md">
                      <div className="text-xs font-bold text-foreground dark:text-white">{seleccionada.patente}</div>
                      <div className="text-[10px] text-muted-foreground">{seleccionada.conductorNombre}</div>
                      <div className="text-[10px] text-primary dark:text-sky-400 font-semibold mt-0.5">
                        {seleccionada.estadoTramo.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Destino Faena Cliente */}
                <div className="absolute right-24 top-16 flex flex-col items-center">
                  <MapPin className="h-6 w-6 text-red-500 fill-red-500" />
                  <span className="text-[10px] text-card-foreground dark:text-white/90 font-bold bg-card/90 dark:bg-black/70 border border-border shadow-md px-1.5 py-0.5 rounded mt-1">
                    Faena Cliente
                  </span>
                </div>

                {/* Widget flotante de Telemetría */}
                {seleccionada && (
                  <div className="absolute bottom-3 left-3 right-3 bg-card/90 backdrop-blur-md p-3 rounded-xl border border-border text-xs flex flex-wrap items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
                      <div>
                        <span className="text-muted-foreground">Último reporte: </span>
                        <span className="font-semibold text-foreground">Hace segundos</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-muted-foreground">Velocidad: </span>
                        <span className="font-semibold text-foreground">{seleccionada.velocidadKmh || 0} KM/H</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Precisión: </span>
                        <span className="font-semibold text-foreground">±{seleccionada.precisionMts} metros</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cliente: </span>
                        <span className="font-semibold text-foreground">{seleccionada.empresaClienteId}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
