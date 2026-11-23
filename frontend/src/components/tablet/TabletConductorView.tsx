import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  ClipboardList,
  Camera,
  MapPin,
  CheckCircle2,
  PenTool,
  RotateCcw,
  Truck,
  AlertTriangle,
  Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAuth } from '../../context/AuthContext';
import { useGpsTracker } from '../../services/gps-tracker';
import { GpsStatusPill } from '../gps/GpsStatusPill';
import { CameraCaptureModal } from '../camera/CameraCaptureModal';
import { ChecklistSalidaModal } from '../checklist/ChecklistSalidaModal';
import { ChecklistRetornoModal } from '../checklist/ChecklistRetornoModal';
import { TouchSignaturePad, SignatureData } from '../signature/TouchSignaturePad';
import { OfflineStorageService } from '../../services/offline-storage';
import { fleetApi } from '../../services/fleetApi';
import { NotificacionConductor } from '../../types/fleet';
import { apiUrl } from '../../config/api';

const NOMBRES_FOTOS_360 = ['Frontal', 'Lateral Izquierda', 'Trasera', 'Lateral Derecha'];

// Tipos y configuración para Reporte Rápido de Incidencias Operacionales (Anti-WhatsApp)
type TipoIncidencia = 'TRAFICO' | 'ACCESO_DENEGADO' | 'FALLA_EQUIPO' | 'VOLUMEN_DISCREPANTE' | 'OBSERVACION_GENERAL';

interface BotonIncidenciaConfig {
  tipo: TipoIncidencia;
  etiqueta: string;
  emoji: string;
  descripcionSugerida: string;
  claseColor: string;
}

const INCIDENCIAS_CONFIG: BotonIncidenciaConfig[] = [
  {
    tipo: 'TRAFICO',
    etiqueta: 'Tráfico Pesado',
    emoji: '🚦',
    descripcionSugerida: 'Retraso en ruta debido a congestión vehicular severa o corte de vía.',
    claseColor: 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
  },
  {
    tipo: 'ACCESO_DENEGADO',
    etiqueta: 'Acceso Denegado',
    emoji: '⛔',
    descripcionSugerida: 'No se permite el ingreso a planta/faena por motivos de seguridad o inducción.',
    claseColor: 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
  },
  {
    tipo: 'FALLA_EQUIPO',
    etiqueta: 'Falla Bomba / Equipo',
    emoji: '⚠️',
    descripcionSugerida: 'Falla operacional en toma de fuerza, bomba de vacío o mangueras de succión.',
    claseColor: 'bg-orange-500/15 border-orange-500/40 text-orange-300 hover:bg-orange-500/25'
  },
  {
    tipo: 'VOLUMEN_DISCREPANTE',
    etiqueta: 'Discrepancia Volumen',
    emoji: '⚖️',
    descripcionSugerida: 'El volumen medido en terreno difiere significativamente del programado en la OS.',
    claseColor: 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25'
  },
  {
    tipo: 'OBSERVACION_GENERAL',
    etiqueta: 'Otra Novedad',
    emoji: '📝',
    descripcionSugerida: 'Novedad operacional registrada en terreno para conocimiento de Operaciones.',
    claseColor: 'bg-blue-500/15 border-blue-500/40 text-blue-300 hover:bg-blue-500/25'
  }
];

export const TabletConductorView: React.FC = () => {
  const { usuario } = useAuth();
  const { location, status: gpsStatus, registrarHitoGps } = useGpsTracker(true);

  const [pasoTablet, setPasoTablet] = useState<number>(1);
  const [ordenServicioId] = useState<string>('OS-000561');
  const [cargandoEstado, setCargandoEstado] = useState<boolean>(true);

  // Estados de Reporte Rápido de Incidencias
  const [incidenciaSeleccionada, setIncidenciaSeleccionada] = useState<BotonIncidenciaConfig | null>(null);
  const [descripcionIncidencia, setDescripcionIncidencia] = useState<string>('');
  const [enviandoIncidencia, setEnviandoIncidencia] = useState<boolean>(false);
  const [gpsIncidencia, setGpsIncidencia] = useState<{ lat: number; lng: number } | null>(null);
  const [toastIncidencia, setToastIncidencia] = useState<{ mensaje: string; tipo: 'exito' | 'offline' | 'error' } | null>(null);

  // Paso 1: Salida
  const [checklistSalidaListo, setChecklistSalidaListo] = useState<boolean>(false);
  const [isChecklistSalidaOpen, setIsChecklistSalidaOpen] = useState<boolean>(false);
  const [fotosSalida, setFotosSalida] = useState<string[]>([]);
  const [isCameraSalidaOpen, setIsCameraSalidaOpen] = useState<boolean>(false);

  // Paso 2: Faena y Firma Táctil
  const [llegadaMarcada, setLlegadaMarcada] = useState<boolean>(false);
  const [otFirmada, setOtFirmada] = useState<boolean>(false);
  const [datosFirmaOT, setDatosFirmaOT] = useState<SignatureData | null>(null);
  const [isSignatureOTOpen, setIsSignatureOTOpen] = useState<boolean>(false);
  const [isSubmittingOT, setIsSubmittingOT] = useState<boolean>(false);
  const [fotosFaena, setFotosFaena] = useState<string[]>([]);
  const [isCameraFaenaOpen, setIsCameraFaenaOpen] = useState<boolean>(false);
  const [recepcionFirmada, setRecepcionFirmada] = useState<boolean>(false);

  // Paso 3: Romana
  const [sidrepSellado, setSidrepSellado] = useState<boolean>(false);
  const [isCameraSidrepOpen, setIsCameraSidrepOpen] = useState<boolean>(false);

  // Paso 4: Retorno
  const [isChecklistRetornoOpen, setIsChecklistRetornoOpen] = useState<boolean>(false);
  const [checklistRetornoListo, setChecklistRetornoListo] = useState<boolean>(false);
  const [fotosRetorno, setFotosRetorno] = useState<string[]>([]);
  const [isCameraRetornoOpen, setIsCameraRetornoOpen] = useState<boolean>(false);

  // Notificaciones in-app de transferencia de flota para el conductor (Tarea 4.6 / D13)
  const [notificacionesTransferencia, setNotificacionesTransferencia] = useState<NotificacionConductor[]>([]);
  const [marcandoNotifId, setMarcandoNotifId] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotificaciones = async () => {
      try {
        const notifs = await fleetApi.listarNotificacionesConductor(false);
        const filtradas = notifs.filter(
          (n) => n.tipo === 'TRANSFERENCIA_FLOTA' || n.metadata?.vehiculoDestinoPatente
        );
        setNotificacionesTransferencia(filtradas);
      } catch {
        // En modo offline o mock no bloqueamos
      }
    };

    fetchNotificaciones();
    const interval = setInterval(fetchNotificaciones, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarcarNotificacionLeida = async (id: string) => {
    setMarcandoNotifId(id);
    try {
      await fleetApi.marcarNotificacionLeida(id);
      setNotificacionesTransferencia((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Error al marcar notificación como leída:', err);
    } finally {
      setMarcandoNotifId(null);
    }
  };

  // 1. Restaurar estado de jornada activa desde IndexedDB / localStorage (Resiliencia ante F5 / recarga)
  useEffect(() => {
    OfflineStorageService.recuperarEstadoJornadaActiva(ordenServicioId).then((guardado) => {
      if (guardado) {
        if (guardado.pasoTablet !== undefined) setPasoTablet(guardado.pasoTablet);
        if (guardado.checklistSalidaListo !== undefined) setChecklistSalidaListo(guardado.checklistSalidaListo);
        if (guardado.fotosSalida && Array.isArray(guardado.fotosSalida)) setFotosSalida(guardado.fotosSalida);
        if (guardado.llegadaMarcada !== undefined) setLlegadaMarcada(guardado.llegadaMarcada);
        if (guardado.otFirmada !== undefined) setOtFirmada(guardado.otFirmada);
        if (guardado.datosFirmaOT) setDatosFirmaOT(guardado.datosFirmaOT);
        if (guardado.fotosFaena && Array.isArray(guardado.fotosFaena)) setFotosFaena(guardado.fotosFaena);
        if (guardado.recepcionFirmada !== undefined) setRecepcionFirmada(guardado.recepcionFirmada);
        if (guardado.sidrepSellado !== undefined) setSidrepSellado(guardado.sidrepSellado);
        if (guardado.checklistRetornoListo !== undefined) setChecklistRetornoListo(guardado.checklistRetornoListo);
        if (guardado.fotosRetorno && Array.isArray(guardado.fotosRetorno)) setFotosRetorno(guardado.fotosRetorno);
      }
      setCargandoEstado(false);
    });
  }, [ordenServicioId]);

  // 2. Persistir reactivamente cualquier cambio en IndexedDB y localStorage
  useEffect(() => {
    if (!cargandoEstado) {
      OfflineStorageService.guardarEstadoJornadaActiva(ordenServicioId, {
        pasoTablet,
        checklistSalidaListo,
        fotosSalida,
        llegadaMarcada,
        otFirmada,
        datosFirmaOT,
        fotosFaena,
        recepcionFirmada,
        sidrepSellado,
        checklistRetornoListo,
        fotosRetorno
      });
    }
  }, [
    cargandoEstado,
    ordenServicioId,
    pasoTablet,
    checklistSalidaListo,
    fotosSalida,
    llegadaMarcada,
    otFirmada,
    datosFirmaOT,
    fotosFaena,
    recepcionFirmada,
    sidrepSellado,
    checklistRetornoListo,
    fotosRetorno
  ]);

  // Handler para captura de fotos de salida con envío inmediato a Expediente
  const handleCapturarFotoSalida = async (url: string) => {
    const idx = fotosSalida.length;
    const posicion = NOMBRES_FOTOS_360[idx] || `Lado_${idx + 1}`;
    const nuevasFotos = [...fotosSalida, url];
    setFotosSalida(nuevasFotos);
    setIsCameraSalidaOpen(false);

    // Guardar copia local en IndexedDB
    await OfflineStorageService.guardarFoto(
      `${ordenServicioId}_salida_${idx}`,
      `SALIDA_${posicion.toUpperCase().replace(/\s+/g, '_')}`,
      url,
      { ordenServicioId, slot: idx }
    );

    // Despacho inmediato al expediente documental para cliente en tiempo real
    const docPayload = {
      categoria: 'FOTO_CAMION_SALIDA',
      nombreArchivo: `${ordenServicioId}_FOTO_${posicion.replace(/\s+/g, '_')}_${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      pesoBytes: Math.round(url.length * 0.75),
      rutaAlmacenamiento: url,
      visibleParaCliente: true
    };

    try {
      const res = await fetch(apiUrl(`/api/expedientes/${ordenServicioId}/documentos`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(docPayload)
      });
      if (!res.ok) throw new Error('Error al indexar');
    } catch {
      await OfflineStorageService.encolarPeticion(
        'FOTO_360',
        `/api/expedientes/${ordenServicioId}/documentos`,
        docPayload
      );
    }
  };

  // Handler para captura de fotos de retorno con envío inmediato a Expediente
  const handleCapturarFotoRetorno = async (url: string) => {
    const idx = fotosRetorno.length;
    const posicion = NOMBRES_FOTOS_360[idx] || `Lado_${idx + 1}`;
    const nuevasFotos = [...fotosRetorno, url];
    setFotosRetorno(nuevasFotos);
    setIsCameraRetornoOpen(false);

    // Guardar copia local
    await OfflineStorageService.guardarFoto(
      `${ordenServicioId}_retorno_${idx}`,
      `RETORNO_${posicion.toUpperCase().replace(/\s+/g, '_')}`,
      url,
      { ordenServicioId, slot: idx }
    );

    const docPayload = {
      categoria: 'FOTO_CAMION_RETORNO',
      nombreArchivo: `${ordenServicioId}_FOTO_RETORNO_${posicion.replace(/\s+/g, '_')}_${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      pesoBytes: Math.round(url.length * 0.75),
      rutaAlmacenamiento: url,
      visibleParaCliente: true
    };

    try {
      const res = await fetch(apiUrl(`/api/expedientes/${ordenServicioId}/documentos`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(docPayload)
      });
      if (!res.ok) throw new Error('Error al indexar');
    } catch {
      await OfflineStorageService.encolarPeticion(
        'FOTO_360',
        `/api/expedientes/${ordenServicioId}/documentos`,
        docPayload
      );
    }
  };

  // Handler para marcar llegada a faena (CU-16)
  const handleMarcarLlegada = async () => {
    registrarHitoGps(ordenServicioId, 'EN_FAENA');
    setLlegadaMarcada(true);

    try {
      await fetch(apiUrl('/api/ciclo-transporte/llegada'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cicloTransporteId: ordenServicioId,
          horaLlegada: new Date().toISOString(),
          coordenadas: location ? { lat: location.latitud, lng: location.longitud } : undefined
        })
      });
    } catch {
      await OfflineStorageService.encolarPeticion('AUTORIZAR_FAENA', '/api/ciclo-transporte/llegada', {
        cicloTransporteId: ordenServicioId,
        horaLlegada: new Date().toISOString()
      });
    }
  };

  // Handler para procesar firma táctil de inicio de faena (CU-17)
  const handleConfirmarFirmaOT = async (sigData: SignatureData) => {
    setIsSubmittingOT(true);
    setDatosFirmaOT(sigData);

    const payload = {
      cicloTransporteId: ordenServicioId,
      encargadoNombre: sigData.encargadoNombre,
      encargadoApellido: sigData.encargadoApellido,
      encargadoRut: sigData.encargadoRut,
      firmaDataUrl: sigData.firmaDataUrl
    };

    try {
      const res = await fetch(apiUrl('/api/ciclo-transporte/autorizar-faena'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Error al registrar firma en el servidor');
      }
    } catch {
      // Guardar en cola offline resiliente
      await OfflineStorageService.encolarPeticion('AUTORIZAR_FAENA', '/api/ciclo-transporte/autorizar-faena', payload);
    } finally {
      setIsSubmittingOT(false);
      setIsSignatureOTOpen(false);
      setOtFirmada(true);
    }
  };

  // Auto-sincronización de bitácora e incidencias al recuperar señal
  useEffect(() => {
    const handleOnline = async () => {
      setToastIncidencia({
        mensaje: 'Conexión restaurada: sincronizando bitácora acumulada...',
        tipo: 'exito'
      });
      try {
        await OfflineStorageService.procesarColaSync();
        setTimeout(() => {
          setToastIncidencia({
            mensaje: 'Incidencias offline sincronizadas exitosamente con Operaciones.',
            tipo: 'exito'
          });
          setTimeout(() => setToastIncidencia(null), 3500);
        }, 1200);
      } catch {}
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Abrir formulario express de incidencia
  const handleAbrirExpressIncidencia = (config: BotonIncidenciaConfig) => {
    setIncidenciaSeleccionada(config);
    setDescripcionIncidencia(config.descripcionSugerida);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsIncidencia({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        () => {
          if (location) {
            setGpsIncidencia({
              lat: location.latitud,
              lng: location.longitud
            });
          }
        },
        { timeout: 4000, enableHighAccuracy: true }
      );
    } else if (location) {
      setGpsIncidencia({
        lat: location.latitud,
        lng: location.longitud
      });
    }
  };

  // Enviar reporte express de incidencia
  const handleEnviarIncidencia = async () => {
    if (!incidenciaSeleccionada || !descripcionIncidencia.trim()) return;

    setEnviandoIncidencia(true);

    const payload = {
      ordenServicioId,
      tipoEvento: incidenciaSeleccionada.tipo,
      descripcion: descripcionIncidencia.trim(),
      latitud: gpsIncidencia?.lat ?? location?.latitud ?? null,
      longitud: gpsIncidencia?.lng ?? location?.longitud ?? null
    };

    const isOnline = navigator.onLine;

    if (isOnline) {
      try {
        const res = await fetch(apiUrl('/api/bitacora'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          setToastIncidencia({
            mensaje: `✓ Incidencia "${incidenciaSeleccionada.etiqueta}" reportada a Operaciones.`,
            tipo: 'exito'
          });
          setIncidenciaSeleccionada(null);
          setEnviandoIncidencia(false);
          setTimeout(() => setToastIncidencia(null), 4000);
          return;
        }
      } catch {
        // En caso de fallo de red en vuelo, proceder a guardar offline
      }
    }

    // Almacenamiento offline en IndexedDB
    try {
      await OfflineStorageService.encolarIncidenciaBitacora(payload);
      setToastIncidencia({
        mensaje: `📡 Sin conexión directa: Incidencia "${incidenciaSeleccionada.etiqueta}" guardada offline. Se sincronizará automáticamente.`,
        tipo: 'offline'
      });
    } catch {
      setToastIncidencia({
        mensaje: `Incidencia registrada en memoria local.`,
        tipo: 'offline'
      });
    } finally {
      setIncidenciaSeleccionada(null);
      setEnviandoIncidencia(false);
      setTimeout(() => setToastIncidencia(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado del Terminal Móvil */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Terminal Móvil de Terreno</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unidad RVFL-92 (Estanque 12m³) · Conductor: {usuario?.nombre} {usuario?.apellido} · {ordenServicioId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GpsStatusPill status={gpsStatus} location={location} />
          <Badge variant="outline">Modalidad: Local Santiago</Badge>
        </div>
      </div>

      {/* Alerta In-App de Transferencia de Flota (D13 / Tarea 4.6) */}
      {notificacionesTransferencia.length > 0 && (
        <div className="space-y-3">
          {notificacionesTransferencia.map((notif) => (
            <div
              key={notif.id}
              role="alert"
              className="p-4 rounded-xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-200 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{notif.titulo || 'Cambio de Equipo Asignado'}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 mt-1 leading-relaxed">
                    {notif.mensaje}
                  </p>
                  {notif.metadata?.vehiculoDestinoPatente && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-muted-foreground">Nueva Patente Asignada:</span>
                      <span className="font-mono font-bold bg-amber-500/25 px-2.5 py-0.5 rounded text-amber-300 border border-amber-500/40 text-sm">
                        {notif.metadata.vehiculoDestinoPatente}
                      </span>
                      {notif.metadata.vehiculoOrigenPatente && (
                        <span className="text-muted-foreground">
                          (Origen: {notif.metadata.vehiculoOrigenPatente})
                        </span>
                      )}
                      {notif.metadata.motivo && (
                        <span className="text-amber-200/80 italic">
                          — Motivo: {notif.metadata.motivo}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleMarcarNotificacionLeida(notif.id)}
                disabled={marcandoNotifId === notif.id}
                className="shrink-0 bg-amber-500 text-black hover:bg-amber-400 font-semibold text-xs h-9 px-4 flex items-center gap-1.5"
              >
                {marcandoNotifId === notif.id ? (
                  <span>Confirmando...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Entendido / Confirmar</span>
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Banner / Toast de Notificación de Incidencia */}
      {toastIncidencia && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-medium animate-in slide-in-from-top-2 duration-200 shadow-md ${
            toastIncidencia.tipo === 'exito'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : toastIncidencia.tipo === 'offline'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{toastIncidencia.mensaje}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastIncidencia(null)}
            className="text-xs opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Botones de Acción Rápida de Incidencias Operacionales (Anti-WhatsApp) */}
      <Card className="border-border bg-card/90 backdrop-blur shadow-sm">
        <CardHeader className="pb-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-foreground">
                Reporte Rápido de Incidencias
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider border-amber-500/40 text-amber-400">
                Anti-WhatsApp Directo
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              Notifica en 1 tap a Central de Operaciones con geolocalización instantánea
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {INCIDENCIAS_CONFIG.map((inc) => (
              <button
                key={inc.tipo}
                type="button"
                onClick={() => handleAbrirExpressIncidencia(inc)}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all active:scale-95 shadow-xs select-none cursor-pointer ${inc.claseColor}`}
              >
                <span className="text-2xl leading-none">{inc.emoji}</span>
                <span className="font-bold text-xs leading-tight">{inc.etiqueta}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Asistente Secuencial de Terreno (4 Pasos) */}
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

            <div className="text-xs rounded-lg bg-muted p-2.5 border border-border flex justify-between items-center">
              <span className="text-muted-foreground">Fotos Perimetrales</span>
              <span className="font-semibold">{fotosSalida.length} / 4</span>
            </div>

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
                  registrarHitoGps(ordenServicioId, 'EN_RUTA_CLIENTE');
                  setPasoTablet(2);
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Autorizar Salida e Iniciar Ruta
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Paso 2: Faena en Cliente con Firma Táctil */}
        <Card className={pasoTablet === 2 ? 'ring-2 ring-primary border-primary' : pasoTablet < 2 ? 'opacity-50' : 'opacity-85'}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant={pasoTablet > 2 ? 'default' : 'secondary'}>Paso 2</Badge>
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base mt-2">Faena en Cliente</CardTitle>
            <CardDescription className="text-xs">
              Llegada, firma táctil de OT, fotos de faena y recepción.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!llegadaMarcada ? (
              <Button
                className="w-full text-xs bg-sky-600 hover:bg-sky-500 text-white"
                disabled={pasoTablet < 2}
                onClick={handleMarcarLlegada}
              >
                <MapPin className="h-4 w-4 mr-1.5" />
                Marcar Llegada a Faena (CU-16)
              </Button>
            ) : !otFirmada ? (
              <Button
                className="w-full text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5"
                onClick={() => setIsSignatureOTOpen(true)}
              >
                <PenTool className="h-4 w-4" />
                Firma Táctil de Inicio OT (CU-17)
              </Button>
            ) : (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-xs text-emerald-400 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>OT Autorizada por Encargado</span>
                </div>
                {datosFirmaOT && (
                  <div className="text-[11px] text-zinc-300">
                    {datosFirmaOT.encargadoNombre} {datosFirmaOT.encargadoApellido} ({datosFirmaOT.encargadoRut})
                  </div>
                )}
              </div>
            )}

            {otFirmada && (
              <>
                {fotosFaena.length < 2 ? (
                  <Button className="w-full text-xs" onClick={() => setIsCameraFaenaOpen(true)}>
                    <Camera className="h-4 w-4 mr-1.5" />
                    Foto Faena y EPP ({fotosFaena.length + 1}/2)
                  </Button>
                ) : !recepcionFirmada ? (
                  <Button
                    className="w-full text-xs"
                    onClick={() => {
                      setRecepcionFirmada(true);
                      registrarHitoGps(ordenServicioId, 'HACIA_ROMANA');
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
              </>
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
                    registrarHitoGps(ordenServicioId, 'RETORNANDO');
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
              <Badge variant={pasoTablet === 4 && checklistRetornoListo && fotosRetorno.length >= 4 ? 'default' : 'secondary'}>
                Paso 4
              </Badge>
              <RotateCcw className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base mt-2">Retorno Planta Zion</CardTitle>
            <CardDescription className="text-xs">
              Inspección de regreso y cierre de servicio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!checklistRetornoListo ? (
              <Button
                variant="outline"
                className="w-full text-xs"
                disabled={pasoTablet < 4}
                onClick={() => setIsChecklistRetornoOpen(true)}
              >
                <ClipboardList className="h-4 w-4 mr-1.5" />
                Checklist Retorno
              </Button>
            ) : (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-xs font-semibold text-emerald-500 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Retorno Conforme
                </span>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setIsChecklistRetornoOpen(true)}>
                  Ver
                </Button>
              </div>
            )}

            <div className="text-xs rounded-lg bg-muted p-2.5 border border-border flex justify-between items-center">
              <span className="text-muted-foreground">Fotos Retorno</span>
              <span className="font-semibold">{fotosRetorno.length} / 4</span>
            </div>

            {fotosRetorno.length < 4 ? (
              <Button
                className="w-full text-xs"
                disabled={!checklistRetornoListo}
                onClick={() => setIsCameraRetornoOpen(true)}
              >
                <Camera className="h-4 w-4 mr-1.5" />
                Foto Retorno ({fotosRetorno.length + 1}/4)
              </Button>
            ) : (
              <div className="rounded-lg bg-emerald-600 p-2.5 text-center text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Jornada Cerrada y Sincronizada
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modales del flujo */}
      <ChecklistSalidaModal
        isOpen={isChecklistSalidaOpen}
        onClose={() => setIsChecklistSalidaOpen(false)}
        onCompletar={() => setChecklistSalidaListo(true)}
      />

      <CameraCaptureModal
        isOpen={isCameraSalidaOpen}
        titulo={`Foto 360° Camión: ${NOMBRES_FOTOS_360[fotosSalida.length] || 'Perimetral'}`}
        subtitulo="Enfoque nítidamente la unidad antes de salir de base."
        onClose={() => setIsCameraSalidaOpen(false)}
        onCapture={handleCapturarFotoSalida}
      />

      {/* Modal de Firma Táctil en Pantalla (CU-17) */}
      {isSignatureOTOpen && (
        <TouchSignaturePad
          title="Autorización de Inicio de Faena"
          subtitle="El encargado del cliente debe registrar Nombre, Apellido, RUT y firmar en pantalla."
          isSubmitting={isSubmittingOT}
          onCancel={() => setIsSignatureOTOpen(false)}
          onConfirm={handleConfirmarFirmaOT}
        />
      )}

      <CameraCaptureModal
        isOpen={isCameraFaenaOpen}
        titulo={fotosFaena.length === 0 ? 'Foto Succión en Faena' : 'Foto Cuadrilla con EPP'}
        subtitulo="Evidencia fotográfica obligatoria del servicio en instalaciones del cliente."
        onClose={() => setIsCameraFaenaOpen(false)}
        onCapture={(url: string) => {
          setFotosFaena((prev) => [...prev, url]);
          setIsCameraFaenaOpen(false);
        }}
      />

      <CameraCaptureModal
        isOpen={isCameraSidrepOpen}
        titulo="Captura Documento SIDREP Timbrado"
        subtitulo="Fotografíe claramente el folio y timbre de recepción en romana destino."
        onClose={() => setIsCameraSidrepOpen(false)}
        onCapture={() => {
          setSidrepSellado(true);
          setIsCameraSidrepOpen(false);
        }}
      />

      <ChecklistRetornoModal
        isOpen={isChecklistRetornoOpen}
        onClose={() => setIsChecklistRetornoOpen(false)}
        onCompletar={() => setChecklistRetornoListo(true)}
      />

      <CameraCaptureModal
        isOpen={isCameraRetornoOpen}
        titulo={`Foto Retorno: ${NOMBRES_FOTOS_360[fotosRetorno.length] || 'General'}`}
        subtitulo="Evidencia del estado final del camión al ingresar a la base."
        onClose={() => setIsCameraRetornoOpen(false)}
        onCapture={handleCapturarFotoRetorno}
      />

      {/* Modal Express de Reporte de Incidencia (1-Tap Anti-WhatsApp) */}
      {incidenciaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{incidenciaSeleccionada.emoji}</span>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Reportar: {incidenciaSeleccionada.etiqueta}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    OS: {ordenServicioId} • Bitácora de Terreno
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIncidenciaSeleccionada(null)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Detalle de la Incidencia (Edite si es necesario):</span>
                  <span className="text-[10px] text-muted-foreground">Mínimo 5 caracteres</span>
                </label>
                <textarea
                  value={descripcionIncidencia}
                  onChange={(e) => setDescripcionIncidencia(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-lg border border-border bg-background text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="Detalle la situación ocurrida en terreno..."
                />
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  <span>GPS Terreno:</span>
                </div>
                <div className="text-foreground">
                  {gpsIncidencia
                    ? `${gpsIncidencia.lat.toFixed(5)}, ${gpsIncidencia.lng.toFixed(5)}`
                    : location
                    ? `${location.latitud.toFixed(5)}, ${location.longitud.toFixed(5)}`
                    : 'Obteniendo coordenadas...'}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {navigator.onLine ? (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                    ● Conexión Activa (Transmisión Inmediata)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                    ▲ Sin Conexión (Almacenamiento Offline en IndexedDB)
                  </Badge>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIncidenciaSeleccionada(null)}
                  disabled={enviandoIncidencia}
                  className="flex-1 h-11 text-sm"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleEnviarIncidencia}
                  disabled={enviandoIncidencia || descripcionIncidencia.trim().length < 5}
                  className="flex-1 h-11 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  {enviandoIncidencia ? (
                    'Enviando...'
                  ) : (
                    <>
                      <span>Transmitir a Operaciones</span>
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
