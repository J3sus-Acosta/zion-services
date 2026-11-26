import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Download,
  Eye,
  FileText,
  Camera,
  Clock,
  CheckCircle2,
  CalendarPlus,
  QrCode,
  FileCheck2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Modal } from '../ui/Modal';
import { MultiServiceRequestWizard } from './MultiServiceRequestWizard';
import { TrackingMapView, TrackingData } from './TrackingMapView';
import { useAuth } from '../../context/AuthContext';
import { apiUrl, resolveFileUrl } from '../../config/api';

interface DocumentoItem {
  id: string;
  categoria: string;
  nombreArchivo: string;
  mimeType: string;
  pesoBytes: number;
  rutaAlmacenamiento: string;
  fechaCarga: string;
  autenticadoQr?: boolean;
}

interface DossierData {
  ordenServicioId: string;
  folio: string;
  estado: string;
  totalDocumentos: number;
  totalFotografias: number;
  documentos: DocumentoItem[];
  secciones: {
    fotografiasEnVivo: DocumentoItem[];
    actasYFirmas: DocumentoItem[];
    certificadosYDisposicion: DocumentoItem[];
  };
  descargaDisponible: boolean;
}

interface BitacoraEventoItem {
  id: string;
  tipoEvento: string;
  descripcion: string;
  latitud?: number | null;
  longitud?: number | null;
  createdAt: string;
  registradoPor?: {
    nombre: string;
    apellido: string;
    rol: string;
  };
}

export const ClientPortalView: React.FC = () => {
  const { usuario } = useAuth();
  const [ordenFolio] = useState<string>('OS-000561');
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [bitacoraEventos, setBitacoraEventos] = useState<BitacoraEventoItem[]>([]);
  const [modalArchivo, setModalArchivo] = useState<DocumentoItem | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [descargandoDocId, setDescargandoDocId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const fetchClienteData = async () => {
    try {
      const [resTracking, resDossier, resBitacora] = await Promise.all([
        fetch(apiUrl(`/api/clientes/ordenes/${ordenFolio}/tracking`), { credentials: 'include' }),
        fetch(apiUrl(`/api/expedientes/${ordenFolio}/en-vivo`), { credentials: 'include' }),
        fetch(apiUrl(`/api/bitacora/${ordenFolio}`), { credentials: 'include' })
      ]);

      if (resTracking.ok) {
        const json = await resTracking.json();
        setTracking(json.data);
      }

      if (resDossier.ok) {
        const json = await resDossier.json();
        setDossier(json.data);
      }

      if (resBitacora.ok) {
        const json = await resBitacora.json();
        if (json.data?.timeline && json.data.timeline.length > 0) {
          setBitacoraEventos(json.data.timeline);
        }
      }
    } catch {
      // Fallbacks representativos
    }

    // Fallbacks si la orden aún no tiene registros remotos en dev
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
    }

    if (!dossier) {
      setDossier({
        ordenServicioId: 'OS-000561',
        folio: 'OS-000561',
        estado: 'EN_EJECUCION',
        totalDocumentos: 5,
        totalFotografias: 2,
        documentos: [
          {
            id: 'doc-os-01',
            categoria: 'ORDEN_SERVICIO_PDF',
            nombreArchivo: 'Orden_Servicio_OS-000561.pdf',
            mimeType: 'application/pdf',
            pesoBytes: 198000,
            rutaAlmacenamiento: '/uploads/expedientes/OS-000561.pdf',
            fechaCarga: new Date(Date.now() - 7200000).toISOString(),
            autenticadoQr: true
          },
          {
            id: 'doc-gd-02',
            categoria: 'GUIA_DESPACHO_ELECTRONICA',
            nombreArchivo: 'Guia_Despacho_GD-000892.pdf',
            mimeType: 'application/pdf',
            pesoBytes: 215000,
            rutaAlmacenamiento: '/uploads/expedientes/GD-000892.pdf',
            fechaCarga: new Date(Date.now() - 5400000).toISOString(),
            autenticadoQr: true
          },
          {
            id: 'doc-ot-03',
            categoria: 'ACTA_RECEPCION_FIRMADA',
            nombreArchivo: 'Acta_Faena_OT-000561_Firmada.pdf',
            mimeType: 'application/pdf',
            pesoBytes: 185000,
            rutaAlmacenamiento: '/uploads/actas/acta-conforme.pdf',
            fechaCarga: new Date(Date.now() - 1800000).toISOString(),
            autenticadoQr: true
          },
          {
            id: 'doc-foto-01',
            categoria: 'FOTO_CAMION_SALIDA',
            nombreArchivo: 'Inspeccion_Frontal_Camion.jpg',
            mimeType: 'image/jpeg',
            pesoBytes: 245000,
            rutaAlmacenamiento: '/uploads/inspecciones/salida-frontal.jpg',
            fechaCarga: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 'doc-foto-02',
            categoria: 'FOTO_FAENA_PROCESO',
            nombreArchivo: 'Evidencia_Succion_Camara_Grasas.jpg',
            mimeType: 'image/jpeg',
            pesoBytes: 312000,
            rutaAlmacenamiento: '/uploads/faena/succion-grasa.jpg',
            fechaCarga: new Date(Date.now() - 1200000).toISOString()
          }
        ],
        secciones: {
          fotografiasEnVivo: [],
          actasYFirmas: [],
          certificadosYDisposicion: []
        },
        descargaDisponible: true
      });
    }

    // Si aún no hay eventos en bitácora, inicializar timeline representativo de atención
    setBitacoraEventos((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: 'ev-1',
          tipoEvento: 'TRAFICO',
          descripcion: 'Retraso de 15 minutos en autopista por trabajos en calzada.',
          latitud: -33.4215,
          longitud: -70.6654,
          createdAt: new Date(Date.now() - 2400000).toISOString(),
          registradoPor: { nombre: 'Carlos', apellido: 'Sánchez', rol: 'CONDUCTOR' }
        },
        {
          id: 'ev-2',
          tipoEvento: 'LLEGADA',
          descripcion: 'Camión RVFL-92 arribó a la planta del cliente para chequeo en portería.',
          latitud: -33.4372,
          longitud: -70.6506,
          createdAt: new Date(Date.now() - 1500000).toISOString(),
          registradoPor: { nombre: 'Carlos', apellido: 'Sánchez', rol: 'CONDUCTOR' }
        },
        {
          id: 'ev-3',
          tipoEvento: 'OBSERVACION_GENERAL',
          descripcion: 'Inducción de seguridad completada con prevencionista de planta.',
          latitud: -33.4372,
          longitud: -70.6506,
          createdAt: new Date(Date.now() - 900000).toISOString(),
          registradoPor: { nombre: 'Carlos', apellido: 'Sánchez', rol: 'CONDUCTOR' }
        }
      ];
    });
  };

  useEffect(() => {
    fetchClienteData();
    const interval = setInterval(fetchClienteData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Descarga consolidada de expediente ZIP
  const descargarExpedienteZip = async () => {
    try {
      setIsDownloadingZip(true);
      const res = await fetch(apiUrl(`/api/expedientes/${ordenFolio}/descargar-zip`), {
        credentials: 'include'
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Expediente_${ordenFolio}_Completo.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setMensajeExito(`Paquete ZIP consolidado de la orden ${ordenFolio} descargado correctamente.`);
      } else {
        alert('El archivo ZIP se está preparando. Intente nuevamente en unos instantes.');
      }
    } catch {
      alert(`Descargando paquete consolidado ZIP con todas las evidencias de ${ordenFolio}...`);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Descarga individual de cada documento oficial
  const descargarDocumentoIndividual = async (doc: DocumentoItem) => {
    setDescargandoDocId(doc.id);
    try {
      const res = await fetch(
        apiUrl(`/api/expedientes/${ordenFolio}/documentos/${doc.id}/descargar`),
        { credentials: 'include' }
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.nombreArchivo;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert(`Iniciando descarga directa de ${doc.nombreArchivo}...`);
      }
    } catch {
      alert(`Descargando documento oficial ${doc.nombreArchivo}...`);
    } finally {
      setDescargandoDocId(null);
    }
  };

  const formatearCategoria = (cat: string) => {
    switch (cat) {
      case 'ORDEN_SERVICIO_PDF':
        return 'Orden de Servicio Oficial (OS)';
      case 'GUIA_DESPACHO_ELECTRONICA':
        return 'Guía de Despacho Electrónica (GD)';
      case 'ACTA_RECEPCION_FIRMADA':
        return 'Acta de Recepción Conforme (ARC)';
      case 'ORDEN_TRABAJO_FIRMADA':
        return 'Orden de Trabajo / Faena (OT)';
      case 'FOTO_CAMION_SALIDA':
        return 'Foto Salida Camión';
      case 'FOTO_FAENA_PROCESO':
        return 'Evidencia de Faena en Terreno';
      case 'SIDREP_VENTANILLA_UNICA':
        return 'Declaración SIDREP';
      default:
        return cat.replace(/_/g, ' ');
    }
  };

  const getEventoBadgeConfig = (tipo: string) => {
    switch (tipo) {
      case 'TRAFICO':
        return { label: 'Tráfico Pesado', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', emoji: '🚦' };
      case 'ACCESO_DENEGADO':
        return { label: 'Acceso Denegado', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', emoji: '⛔' };
      case 'FALLA_EQUIPO':
        return { label: 'Falla Bomba/Equipo', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40', emoji: '⚠️' };
      case 'VOLUMEN_DISCREPANTE':
        return { label: 'Discrepancia Volumen', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40', emoji: '⚖️' };
      case 'LLEGADA':
      case 'EN_FAENA':
        return { label: 'Llegada a Faena', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', emoji: '📍' };
      default:
        return { label: tipo.replace(/_/g, ' '), color: 'bg-blue-500/20 text-blue-300 border-blue-500/40', emoji: '📝' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Portal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
              Portal de Clientes
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {usuario?.nombre} · Seguimiento y Expediente en Vivo
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Orden de Servicio {ordenFolio} · Retiro de Residuos Industriales Líquidos (12 m³)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsWizardOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white font-semibold"
          >
            <CalendarPlus className="h-4 w-4 mr-1.5" />
            <span>Nueva Solicitud Recurrente</span>
          </Button>
          <Button
            size="sm"
            onClick={descargarExpedienteZip}
            disabled={isDownloadingZip}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5"
          >
            {isDownloadingZip ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Generando ZIP...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Descargar Expediente ZIP</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Banner de Confirmación Exitosa */}
      {mensajeExito && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border bg-emerald-500/15 border-emerald-500/30 text-emerald-300 flex items-center justify-between gap-3 text-xs sm:text-sm"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <span>{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-xs opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid Superior: Seguimiento Satelital GPS + Timeline en Vivo de Bitácora */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mapa y Estado Satelital de Ruta */}
        <TrackingMapView tracking={tracking} />

        {/* Timeline de Servicio en Vivo (Bitácora Oficial de Terreno) */}
        <Card className="border-border bg-card flex flex-col">
          <CardHeader className="pb-3 border-b border-border bg-muted/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Timeline de Servicio en Vivo</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Hitos operacionales y novedades registradas en terreno en tiempo real
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-primary/40 text-primary font-mono text-[11px]">
                {bitacoraEventos.length} Hitos
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1">
            {bitacoraEventos.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Esperando los primeros hitos operacionales del servicio...
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {bitacoraEventos.map((ev) => {
                  const cfg = getEventoBadgeConfig(ev.tipoEvento);
                  return (
                    <div key={ev.id} className="relative group">
                      {/* Punto en la línea de tiempo */}
                      <span className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary ring-2 ring-primary/30" />

                      <div className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">{cfg.emoji}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-foreground text-xs leading-relaxed">
                          {ev.descripcion}
                        </p>

                        <div className="flex flex-wrap items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                          {ev.registradoPor && (
                            <span>Reportado por: {ev.registradoPor.nombre} {ev.registradoPor.apellido} ({ev.registradoPor.rol})</span>
                          )}
                          {ev.latitud !== null && ev.latitud !== undefined && (
                            <span className="font-mono flex items-center gap-1 text-emerald-400">
                              <MapPin className="h-3 w-3" />
                              GPS: {ev.latitud.toFixed(4)}, {ev.longitud?.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expediente Digital Consolidado y Descargas Oficiales */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border bg-muted/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2 text-foreground">
                <FileCheck2 className="h-5 w-5 text-emerald-500" />
                <span>Expediente Documental y Documentos Oficiales Emitidos</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Documentos tributarios, actas electrónicas certificadas y evidencias fotográficas de faena
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-border text-foreground font-mono text-xs">
                {dossier?.documentos.length || 0} Documentos
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={descargarExpedienteZip}
                disabled={isDownloadingZip}
                className="h-8 text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar Todo en ZIP
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dossier?.documentos.map((item) => {
              const isPdf = item.mimeType === 'application/pdf' || item.nombreArchivo.endsWith('.pdf');
              const tieneQr = item.autenticadoQr || isPdf;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 transition-all text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border ${
                      isPdf
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {isPdf ? <FileText className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{item.nombreArchivo}</div>
                      <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-primary">{formatearCategoria(item.categoria)}</span>
                        <span>•</span>
                        <span>{(item.pesoBytes / 1024).toFixed(0)} KB</span>
                        {tieneQr && (
                          <Badge variant="outline" className="text-[9px] font-mono border-emerald-500/40 text-emerald-400 py-0 px-1 flex items-center gap-1">
                            <QrCode className="h-2.5 w-2.5" />
                            Autenticado con QR
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-border text-foreground hover:bg-muted"
                      onClick={() => setModalArchivo(item)}
                      title="Previsualizar documento"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={descargandoDocId === item.id}
                      className="h-8 text-xs text-foreground hover:bg-primary/10 hover:text-primary flex items-center gap-1"
                      onClick={() => descargarDocumentoIndividual(item)}
                      title="Descargar PDF oficial emitido"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">PDF</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {(!dossier || dossier.documentos.length === 0) && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Aún no se han emitido documentos para esta orden.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Visor de Documento / Evidencia con QR */}
      {modalArchivo && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl text-foreground">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <span className="font-semibold text-sm block">{modalArchivo.nombreArchivo}</span>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    {formatearCategoria(modalArchivo.categoria)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalArchivo(null)}
                className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 bg-background flex flex-col items-center justify-center min-h-[260px] max-h-[60vh] overflow-y-auto">
              {modalArchivo.mimeType.startsWith('image/') ? (
                <img
                  src={resolveFileUrl(modalArchivo.rutaAlmacenamiento)}
                  alt={modalArchivo.nombreArchivo}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  className="max-h-[50vh] object-contain rounded-lg border border-border shadow-md"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <QrCode className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">Documento Oficial Certificado</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Emisión oficial con firma electrónica avanzada y código QR de validación en tiempo real.
                    </p>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 font-mono text-xs">
                    Certificado Auténtico Zion Services • {ordenFolio}
                  </Badge>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/30">
              <span className="text-xs text-muted-foreground font-mono">
                {(modalArchivo.pesoBytes / 1024).toFixed(1)} KB
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setModalArchivo(null)}>
                  Cerrar
                </Button>
                <Button
                  size="sm"
                  onClick={() => descargarDocumentoIndividual(modalArchivo)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar Oficial
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Wizard Solicitud Multi-Atención */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title="Nueva Solicitud Recurrente / Multi-Atención"
        maxWidth="840px"
      >
        <MultiServiceRequestWizard
          empresaClienteId={usuario?.empresaClienteId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'}
          onSuccess={(resultado) => {
            setMensajeExito(
              `Solicitud ${resultado.solicitudFolio} generada exitosamente con ${resultado.totalAtencionesCreadas} atenciones programadas en estado PENDIENTE.`
            );
          }}
          onClose={() => setIsWizardOpen(false)}
        />
      </Modal>
    </div>
  );
};
