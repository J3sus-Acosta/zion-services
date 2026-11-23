import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Building2,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Package,
  Layers,
  MapPin,
  FileText,
  Loader2
} from 'lucide-react';
import {
  ServicioCatalogoItem,
  PlantaDestinoItem,
  SolicitudMultiAtencionInput,
  ItemAtencionSolicitudInput
} from '../../types/planning';
import { PlanningApi } from '../../services/planningApi';

interface SucursalOption {
  id: string;
  nombre: string;
  direccion: string;
  comuna: string;
}

const SUCURSALES_DEFAULT: SucursalOption[] = [
  {
    id: 'b11c2233-4455-6677-8899-aabbccddeeff',
    nombre: 'Planta Principal Quilicura',
    direccion: 'Av. Eduardo Frei Montalva 4500',
    comuna: 'Quilicura'
  },
  {
    id: 'c22d3344-5566-7788-99aa-bbccddeeff00',
    nombre: 'Centro Logístico San Bernardo',
    direccion: 'Camino Nos 1250',
    comuna: 'San Bernardo'
  },
  {
    id: 'd33e4455-6677-8899-aabb-ccddeeff0011',
    nombre: 'Base Pudahuel Poniente',
    direccion: 'Parque Industrial Enea 800',
    comuna: 'Pudahuel'
  }
];

const TIPOS_RESIDUO = [
  { value: 'RIL_GRASAS', label: 'RILes y Grasas de Cámara Desgrasadora' },
  { value: 'LODOS_ORGANICOS', label: 'Lodos Orgánicos y Fosas Sépticas' },
  { value: 'SUCCION_RILES', label: 'Residuos Industriales Líquidos (RILes)' },
  { value: 'LODOS_DESHIDRATADOS', label: 'Tortas de Lodo Deshidratado (PTR)' },
  { value: 'AGUAS_SERVIDAS', label: 'Aguas Servidas y Alcantarillado' },
  { value: 'HIDROCARBUROS', label: 'Aguas con Hidrocarburos y Aceites Usados' }
];

export interface MultiServiceRequestWizardProps {
  empresaClienteId?: string;
  onSuccess?: (resultado: { solicitudFolio: string; totalAtencionesCreadas: number }) => void;
  onClose?: () => void;
}

interface BloqueFechaDraft {
  id: string;
  fecha: string;
  hora: string;
  duracionEstimadaMinutos: number;
  plantaDestinoId?: string;
  serviciosSeleccionados: {
    [servicioId: string]: {
      checked: boolean;
      cantidad: number;
      observaciones: string;
    };
  };
}

export const MultiServiceRequestWizard: React.FC<MultiServiceRequestWizardProps> = ({
  empresaClienteId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  onSuccess,
  onClose
}) => {
  const [pasoActual, setPasoActual] = useState<number>(1);
  const [catalogosCargando, setCatalogosCargando] = useState<boolean>(true);
  const [catalogoServicios, setCatalogoServicios] = useState<ServicioCatalogoItem[]>([]);
  const [plantasDestino, setPlantasDestino] = useState<PlantaDestinoItem[]>([]);

  // Paso 1: Datos Base y Sucursal
  const [sucursalFaenaId, setSucursalFaenaId] = useState<string>(SUCURSALES_DEFAULT[0].id);
  const [tipoResiduo, setTipoResiduo] = useState<string>('RIL_GRASAS');
  const [descripcionGeneral, setDescripcionGeneral] = useState<string>('');
  const [cantidadEstimada, setCantidadEstimada] = useState<number>(15);
  const [unidadEstimada, setUnidadEstimada] = useState<'KG' | 'TON' | 'M3' | 'LITROS'>('M3');

  // Paso 2 y 3: Bloques de fechas y servicios
  const getTomorrowDateStr = (daysToAdd = 1) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    return d.toISOString().split('T')[0];
  };

  const [bloquesFechas, setBloquesFechas] = useState<BloqueFechaDraft[]>([
    {
      id: 'bloque-1',
      fecha: getTomorrowDateStr(1),
      hora: '09:00',
      duracionEstimadaMinutos: 120,
      serviciosSeleccionados: {}
    }
  ]);

  // Estados de envío y feedback
  const [enviando, setEnviando] = useState<boolean>(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [exitoResultado, setExitoResultado] = useState<{
    solicitudFolio: string;
    totalAtencionesCreadas: number;
    atenciones?: Array<{ id: string; folio: string; fechaHoraInicio: string; estado: string }>;
  } | null>(null);

  // Cargar catálogos iniciales
  useEffect(() => {
    const cargarCatalogos = async () => {
      setCatalogosCargando(true);
      try {
        const [servicios, plantas] = await Promise.all([
          PlanningApi.getCatalogoServicios(),
          PlanningApi.getPlantasDestino()
        ]);
        setCatalogoServicios(servicios);
        setPlantasDestino(plantas);

        // Preseleccionar primer servicio en el bloque 1 si aún no tiene selección
        if (servicios.length > 0) {
          setBloquesFechas((prev) =>
            prev.map((b) => {
              if (Object.keys(b.serviciosSeleccionados).length === 0) {
                return {
                  ...b,
                  serviciosSeleccionados: {
                    [servicios[0].id]: {
                      checked: true,
                      cantidad: 1,
                      observaciones: ''
                    }
                  }
                };
              }
              return b;
            })
          );
        }
      } catch (e) {
        console.error('Error al cargar catálogos:', e);
      } finally {
        setCatalogosCargando(false);
      }
    };

    cargarCatalogos();
  }, []);

  // Agregar nuevo bloque de fecha
  const handleAgregarBloqueFecha = () => {
    const ultimoBloque = bloquesFechas[bloquesFechas.length - 1];
    let proximaFecha = getTomorrowDateStr(bloquesFechas.length + 1);

    if (ultimoBloque?.fecha) {
      const d = new Date(ultimoBloque.fecha);
      d.setDate(d.getDate() + 2); // sugerir cada 2 días
      proximaFecha = d.toISOString().split('T')[0];
    }

    const defaultServicios: BloqueFechaDraft['serviciosSeleccionados'] = {};
    if (catalogoServicios.length > 0) {
      defaultServicios[catalogoServicios[0].id] = { checked: true, cantidad: 1, observaciones: '' };
    }

    setBloquesFechas((prev) => [
      ...prev,
      {
        id: `bloque-${Date.now()}`,
        fecha: proximaFecha,
        hora: '09:00',
        duracionEstimadaMinutos: 120,
        serviciosSeleccionados: defaultServicios
      }
    ]);
  };

  const handleEliminarBloqueFecha = (id: string) => {
    if (bloquesFechas.length <= 1) return;
    setBloquesFechas((prev) => prev.filter((b) => b.id !== id));
  };

  const handleUpdateBloque = (id: string, campo: Partial<BloqueFechaDraft>) => {
    setBloquesFechas((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...campo } : b))
    );
  };

  const handleToggleServicio = (bloqueId: string, servicioId: string) => {
    setBloquesFechas((prev) =>
      prev.map((b) => {
        if (b.id !== bloqueId) return b;
        const actual = b.serviciosSeleccionados[servicioId] || { checked: false, cantidad: 1, observaciones: '' };
        return {
          ...b,
          serviciosSeleccionados: {
            ...b.serviciosSeleccionados,
            [servicioId]: {
              ...actual,
              checked: !actual.checked
            }
          }
        };
      })
    );
  };

  const handleUpdateCantidadServicio = (bloqueId: string, servicioId: string, cantidad: number) => {
    setBloquesFechas((prev) =>
      prev.map((b) => {
        if (b.id !== bloqueId) return b;
        const actual = b.serviciosSeleccionados[servicioId] || { checked: true, cantidad: 1, observaciones: '' };
        return {
          ...b,
          serviciosSeleccionados: {
            ...b.serviciosSeleccionados,
            [servicioId]: {
              ...actual,
              cantidad: Math.max(1, cantidad)
            }
          }
        };
      })
    );
  };

  // Validaciones por paso
  const validarPaso1 = (): boolean => {
    return Boolean(sucursalFaenaId && tipoResiduo && cantidadEstimada > 0);
  };

  const validarPaso2 = (): boolean => {
    return (
      bloquesFechas.length >= 1 &&
      bloquesFechas.every((b) => b.fecha && b.hora && b.duracionEstimadaMinutos >= 30)
    );
  };

  const validarPaso3 = (): boolean => {
    return bloquesFechas.every((b) =>
      Object.values(b.serviciosSeleccionados).some((s) => s.checked && s.cantidad >= 1)
    );
  };

  const construirPayload = (): SolicitudMultiAtencionInput => {
    const atenciones: ItemAtencionSolicitudInput[] = bloquesFechas.map((b) => {
      const fechaHoraIso = new Date(`${b.fecha}T${b.hora}:00`).toISOString();
      const servicios = Object.entries(b.serviciosSeleccionados)
        .filter(([, s]) => s.checked)
        .map(([sId, s]) => ({
          servicioCatalogoId: sId,
          cantidad: s.cantidad,
          observaciones: s.observaciones || undefined
        }));

      return {
        fechaHoraInicio: fechaHoraIso,
        duracionEstimadaMinutos: b.duracionEstimadaMinutos,
        sucursalFaenaId,
        plantaDestinoId: b.plantaDestinoId || undefined,
        servicios
      };
    });

    return {
      empresaClienteId,
      sucursalFaenaId,
      tipoResiduo,
      descripcion: descripcionGeneral.trim() || undefined,
      cantidadEstimada,
      unidadEstimada,
      atenciones
    };
  };

  const handleEnviarSolicitud = async () => {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const payload = construirPayload();
      const res = await PlanningApi.crearSolicitudMulti(payload);
      const data = res.data || {
        solicitudFolio: `SOL-${Date.now().toString().slice(-5)}`,
        totalAtencionesCreadas: payload.atenciones.length,
        atenciones: payload.atenciones.map((a, i) => ({
          id: `ap-${i + 1}`,
          folio: `AP-${Date.now().toString().slice(-4)}-${i + 1}`,
          fechaHoraInicio: a.fechaHoraInicio,
          estado: 'PENDIENTE_CONFIRMACION'
        }))
      };

      setExitoResultado(data);
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err: any) {
      setErrorEnvio(err.message || 'Ocurrió un error al registrar la solicitud multi-atención');
    } finally {
      setEnviando(false);
    }
  };

  // Si ya se envió exitosamente, mostrar resumen de éxito
  if (exitoResultado) {
    return (
      <div className="wizard-container" style={{ padding: '24px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--success)'
            }}
          >
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            ¡Solicitud Multi-Atención Registrada!
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 20px', fontSize: '0.925rem' }}>
            Su requerimiento ha sido emitido con éxito. El equipo comercial y de despacho evaluará los recursos para la confirmación operativa.
          </p>

          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              maxWidth: '480px',
              margin: '0 auto 24px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Folio de Solicitud:</span>
              <strong style={{ color: 'var(--accent-primary)', fontSize: '0.95rem' }}>{exitoResultado.solicitudFolio}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Atenciones Solicitadas:</span>
              <span className="badge badge-warning">{exitoResultado.totalAtencionesCreadas} Fechas</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Estado Inicial:</span>
              <span className="badge badge-warning">PENDIENTE CONFIRMACIÓN</span>
            </div>
          </div>

          <div className="btn-group" style={{ justifyContent: 'center' }}>
            {onClose && (
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Finalizar y Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="multi-wizard"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        color: 'var(--text-primary)'
      }}
    >
      {/* Stepper Visual Canónico */}
      <div
        className="wizard-stepper"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '16px'
        }}
      >
        {[
          { num: 1, titulo: '1. Sucursal & Residuo' },
          { num: 2, titulo: '2. Fechas / Horarios' },
          { num: 3, titulo: '3. Servicios Catálogo' },
          { num: 4, titulo: '4. Confirmación' }
        ].map((p) => {
          const activo = pasoActual === p.num;
          const completado = pasoActual > p.num;
          return (
            <div
              key={p.num}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                background: activo ? 'rgba(0, 168, 150, 0.12)' : 'transparent',
                borderBottom: activo ? '2px solid var(--accent-primary)' : '2px solid transparent'
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: completado
                    ? 'var(--success)'
                    : activo
                    ? 'var(--accent-primary)'
                    : 'var(--bg-card-hover)',
                  color: '#ffffff'
                }}
              >
                {completado ? '✓' : p.num}
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: activo ? 600 : 500,
                  color: activo ? 'var(--text-primary)' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {p.titulo}
              </span>
            </div>
          );
        })}
      </div>

      {/* Alerta de Error */}
      {errorEnvio && (
        <div
          style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.875rem'
          }}
        >
          <AlertCircle size={20} />
          <span>{errorEnvio}</span>
        </div>
      )}

      {/* Contenido según paso */}
      <div className="wizard-step-body" style={{ minHeight: '320px' }}>
        {/* =========================================================
            PASO 1: SUCURSAL Y TIPO DE RESIDUO
            ========================================================= */}
        {pasoActual === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">
                <Building2 size={16} /> Sucursal / Faena Destino
              </label>
              <select
                className="form-select"
                value={sucursalFaenaId}
                onChange={(e) => setSucursalFaenaId(e.target.value)}
              >
                {SUCURSALES_DEFAULT.map((suc) => (
                  <option key={suc.id} value={suc.id}>
                    {suc.nombre} ({suc.comuna} - {suc.direccion})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  <Package size={16} /> Tipo de Residuo Primario
                </label>
                <select
                  className="form-select"
                  value={tipoResiduo}
                  onChange={(e) => setTipoResiduo(e.target.value)}
                >
                  {TIPOS_RESIDUO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Layers size={16} /> Volumen / Cantidad Estimada
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    className="form-input"
                    value={cantidadEstimada}
                    onChange={(e) => setCantidadEstimada(parseFloat(e.target.value) || 1)}
                  />
                  <select
                    className="form-select"
                    style={{ width: '110px' }}
                    value={unidadEstimada}
                    onChange={(e) => setUnidadEstimada(e.target.value as any)}
                  >
                    <option value="M3">m³</option>
                    <option value="LITROS">Litros</option>
                    <option value="TON">Ton</option>
                    <option value="KG">Kg</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FileText size={16} /> Observaciones Generales de la Faena (Opcional)
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Indique puntos de acceso, restricciones horarias de portería o requerimientos de EPP específicos..."
                value={descripcionGeneral}
                onChange={(e) => setDescripcionGeneral(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* =========================================================
            PASO 2: BLOQUES DE FECHA Y HORARIOS PREFERENTES
            ========================================================= */}
        {pasoActual === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                  Itinerario de Retiros Recurrentes
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Defina cada fecha y horario preferente en que requiere la atención de nuestro equipo técnico.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAgregarBloqueFecha}
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                <Plus size={15} /> Agregar Fecha
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bloquesFechas.map((bloque, index) => (
                <div
                  key={bloque.id}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr 1fr 1fr auto',
                    gap: '12px',
                    alignItems: 'center'
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(0, 168, 150, 0.2)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '0.8rem'
                    }}
                  >
                    #{index + 1}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>
                      <Calendar size={13} /> Fecha
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={bloque.fecha}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleUpdateBloque(bloque.id, { fecha: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>
                      <Clock size={13} /> Hora Inicio
                    </label>
                    <input
                      type="time"
                      className="form-input"
                      value={bloque.hora}
                      onChange={(e) => handleUpdateBloque(bloque.id, { hora: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>
                      Duración Estimada
                    </label>
                    <select
                      className="form-select"
                      value={bloque.duracionEstimadaMinutos}
                      onChange={(e) =>
                        handleUpdateBloque(bloque.id, {
                          duracionEstimadaMinutos: parseInt(e.target.value, 10)
                        })
                      }
                    >
                      <option value={60}>1 hora (60m)</option>
                      <option value={90}>1.5 horas (90m)</option>
                      <option value={120}>2 horas (120m)</option>
                      <option value={180}>3 horas (180m)</option>
                      <option value={240}>4 horas (240m)</option>
                    </select>
                  </div>

                  <div>
                    <button
                      type="button"
                      className="btn btn-icon btn-outline-danger"
                      title="Eliminar esta fecha"
                      disabled={bloquesFechas.length <= 1}
                      onClick={() => handleEliminarBloqueFecha(bloque.id)}
                      style={{ opacity: bloquesFechas.length <= 1 ? 0.3 : 1 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================
            PASO 3: CATÁLOGO DE SERVICIOS POR FECHA
            ========================================================= */}
        {pasoActual === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                Servicios Requeridos por Atención
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Seleccione los ítems de catálogo autorizados y la planta de disposición final para cada retiro.
              </p>
            </div>

            {catalogosCargando ? (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto', color: 'var(--accent-primary)' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Cargando catálogo oficial de servicios...
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {bloquesFechas.map((bloque, index) => (
                  <div
                    key={bloque.id}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-color)',
                        paddingBottom: '8px',
                        marginBottom: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-info">Atención #{index + 1}</span>
                        <strong style={{ fontSize: '0.875rem' }}>
                          {bloque.fecha} a las {bloque.hora} ({bloque.duracionEstimadaMinutos} min)
                        </strong>
                      </div>

                      {/* Planta Destino preferente opcional */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={14} style={{ color: 'var(--text-secondary)' }} />
                        <select
                          className="form-select"
                          style={{ minHeight: '30px', fontSize: '0.75rem', padding: '4px 8px' }}
                          value={bloque.plantaDestinoId || ''}
                          onChange={(e) =>
                            handleUpdateBloque(bloque.id, { plantaDestinoId: e.target.value || undefined })
                          }
                        >
                          <option value="">Planta Destino sugerida (Automática)</option>
                          {plantasDestino.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} ({p.comuna})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
                      {catalogoServicios.map((srv) => {
                        const sel = bloque.serviciosSeleccionados[srv.id];
                        const isChecked = sel?.checked || false;
                        const cantidad = sel?.cantidad || 1;

                        return (
                          <div
                            key={srv.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: isChecked
                                ? '1px solid var(--accent-primary)'
                                : '1px solid var(--border-color)',
                              background: isChecked ? 'rgba(0, 168, 150, 0.08)' : 'var(--bg-surface)'
                            }}
                          >
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                flex: 1,
                                fontSize: '0.825rem'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleServicio(bloque.id, srv.id)}
                                style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                              />
                              <div>
                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{srv.nombre}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                  Código: {srv.codigo}
                                </div>
                              </div>
                            </label>

                            {isChecked && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cant:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={cantidad}
                                  onChange={(e) =>
                                    handleUpdateCantidadServicio(bloque.id, srv.id, parseInt(e.target.value, 10) || 1)
                                  }
                                  className="form-input"
                                  style={{
                                    width: '54px',
                                    minHeight: '28px',
                                    padding: '2px 6px',
                                    fontSize: '0.8rem',
                                    textAlign: 'center'
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            PASO 4: RESUMEN Y CONFIRMACIÓN
            ========================================================= */}
        {pasoActual === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px'
              }}
            >
              <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 600 }}>
                Resumen de la Solicitud Multi-Atención
              </h4>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  marginBottom: '16px'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sucursal Destino:</span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {SUCURSALES_DEFAULT.find((s) => s.id === sucursalFaenaId)?.nombre || 'Sucursal Principal'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tipo de Residuo:</span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {TIPOS_RESIDUO.find((t) => t.value === tipoResiduo)?.label || tipoResiduo}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Volumen Total Estimado:</span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {cantidadEstimada} {unidadEstimada}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total de Atenciones:</span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    <span className="badge badge-warning">{bloquesFechas.length} Fechas Programadas</span>
                  </div>
                </div>
              </div>

              {descripcionGeneral && (
                <div style={{ marginBottom: '16px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Observaciones: </span>
                  <span style={{ color: 'var(--text-primary)' }}>{descripcionGeneral}</span>
                </div>
              )}

              <div className="table-container" style={{ marginTop: '12px' }}>
                <table className="satem-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Fecha / Hora Inicio</th>
                      <th>Duración</th>
                      <th>Servicios Contratados</th>
                      <th>Planta Descarga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bloquesFechas.map((b, i) => {
                      const serviciosSel = Object.entries(b.serviciosSeleccionados)
                        .filter(([, s]) => s.checked)
                        .map(([sId, s]) => {
                          const itemCat = catalogoServicios.find((c) => c.id === sId);
                          return `${itemCat?.nombre || sId} (x${s.cantidad})`;
                        });

                      const plantaSel = plantasDestino.find((p) => p.id === b.plantaDestinoId);

                      return (
                        <tr key={b.id}>
                          <td>{i + 1}</td>
                          <td>
                            <strong>{b.fecha}</strong> a las {b.hora}
                          </td>
                          <td>{b.duracionEstimadaMinutos} min</td>
                          <td>
                            {serviciosSel.length > 0 ? (
                              serviciosSel.join(', ')
                            ) : (
                              <span style={{ color: 'var(--danger)' }}>Sin servicios seleccionados</span>
                            )}
                          </td>
                          <td>{plantaSel ? plantaSel.nombre : 'Sugerida por operaciones'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botones de Navegación del Wizard */}
      <div
        className="modal-footer"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0 0',
          borderTop: '1px solid var(--border-color)'
        }}
      >
        <div>
          {onClose && (
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={enviando}>
              Cancelar
            </button>
          )}
        </div>

        <div className="btn-group">
          {pasoActual > 1 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPasoActual((p) => p - 1)}
              disabled={enviando}
            >
              <ArrowLeft size={16} /> Anterior
            </button>
          )}

          {pasoActual < 4 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setPasoActual((p) => p + 1)}
              disabled={
                (pasoActual === 1 && !validarPaso1()) ||
                (pasoActual === 2 && !validarPaso2()) ||
                (pasoActual === 3 && !validarPaso3())
              }
            >
              Siguiente <ArrowRight size={16} />
            </button>
          )}

          {pasoActual === 4 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleEnviarSolicitud}
              disabled={enviando}
              style={{ background: 'var(--accent-primary)', minWidth: '180px' }}
            >
              {enviando ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirmar y Enviar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
