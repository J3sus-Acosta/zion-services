import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import {
  Equipo,
  OperacionesAfectadasResponse,
  TransferenciaResultado
} from '../../types/fleet';
import { fleetApi, FleetApiError } from '../../services/fleetApi';
import {
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface FleetStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  equipo: Equipo | null;
  modo: 'HABILITAR' | 'DESHABILITAR';
  userRole?: string;
  onSuccess: (resultado: TransferenciaResultado) => void;
}

export const FleetStatusDialog: React.FC<FleetStatusDialogProps> = ({
  isOpen,
  onClose,
  equipo,
  modo,
  userRole,
  onSuccess
}) => {
  const [motivo, setMotivo] = useState('');
  const [vehiculoDestinoId, setVehiculoDestinoId] = useState('');
  const [loadingOps, setLoadingOps] = useState(false);
  const [operacionesData, setOperacionesData] = useState<OperacionesAfectadasResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Regla R1: Solo ADMIN y SUPERADMIN pueden levantar bloqueos de CHECKLIST_SEGURIDAD
  const esBloqueoSeguridad = equipo?.origenBloqueo === 'CHECKLIST_SEGURIDAD';
  const puedeLevantarBloqueo =
    !esBloqueoSeguridad || (userRole === 'SUPERADMIN' || userRole === 'ADMIN');

  useEffect(() => {
    if (!isOpen || !equipo) {
      setMotivo('');
      setVehiculoDestinoId('');
      setOperacionesData(null);
      setErrorMessage(null);
      return;
    }

    setMotivo('');
    setVehiculoDestinoId('');
    setErrorMessage(null);

    if (modo === 'DESHABILITAR') {
      setLoadingOps(true);
      fleetApi
        .obtenerOperacionesAfectadas(equipo.id)
        .then((res) => {
          setOperacionesData(res);
          // Si hay candidatos disponibles sin conflicto, preseleccionar el primero
          const primerDisponible = res.candidatos.find((c) => !c.tieneConflicto);
          if (primerDisponible) {
            setVehiculoDestinoId(primerDisponible.id);
          }
        })
        .catch((err) => {
          setErrorMessage(err?.message || 'Error al consultar operaciones activas del equipo.');
        })
        .finally(() => {
          setLoadingOps(false);
        });
    }
  }, [isOpen, equipo, modo]);

  if (!equipo) return null;

  const jornadasActivas = operacionesData?.jornadas || [];
  const tieneJornadasActivas = jornadasActivas.length > 0;
  const candidatos = operacionesData?.candidatos || [];
  const candidatosSinConflicto = candidatos.filter((c) => !c.tieneConflicto);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (modo === 'DESHABILITAR') {
      const cleanMotivo = motivo.trim();
      if (cleanMotivo.length < 5) {
        setErrorMessage('El motivo de deshabilitación es obligatorio y debe tener al menos 5 caracteres.');
        return;
      }

      if (tieneJornadasActivas && !vehiculoDestinoId) {
        setErrorMessage('Es obligatorio seleccionar un equipo habilitado de reemplazo para transferir las operaciones activas.');
        return;
      }

      setSubmitting(true);
      try {
        const resultado = await fleetApi.cambiarEstado(equipo.id, {
          estado: 'DESHABILITADO',
          motivo: cleanMotivo,
          vehiculoDestinoId: tieneJornadasActivas ? vehiculoDestinoId : undefined
        });
        onSuccess(resultado);
        onClose();
      } catch (err: any) {
        if (err instanceof FleetApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage(err?.message || 'Error al cambiar estado del equipo.');
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      // HABILITAR
      if (!puedeLevantarBloqueo) {
        setErrorMessage('Solo usuarios con rol SUPERADMIN o ADMIN pueden levantar un bloqueo originado por Checklist de Seguridad.');
        return;
      }

      setSubmitting(true);
      try {
        const resultado = await fleetApi.cambiarEstado(equipo.id, {
          estado: 'HABILITADO'
        });
        onSuccess(resultado);
        onClose();
      } catch (err: any) {
        if (err instanceof FleetApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage(err?.message || 'Error al habilitar el equipo.');
        }
      } finally {
        setSubmitting(false);
      }
    }
  };

  const isDisableButtonDisabled =
    submitting ||
    loadingOps ||
    motivo.trim().length < 5 ||
    (tieneJornadasActivas && (!vehiculoDestinoId || candidatosSinConflicto.length === 0));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        modo === 'DESHABILITAR' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
            <AlertTriangle size={20} />
            <span>Deshabilitar Equipo: {equipo.patente}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
            <CheckCircle size={20} />
            <span>Habilitar Equipo: {equipo.patente}</span>
          </div>
        )
      }
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMessage && (
          <div
            role="alert"
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {modo === 'HABILITAR' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.925rem', color: 'var(--text-primary)' }}>
              ¿Está seguro de que desea habilitar el equipo <strong>{equipo.patente}</strong> ({equipo.marca} {equipo.modelo})?
            </p>

            {esBloqueoSeguridad && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--warning-bg)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <ShieldAlert size={22} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--warning)', fontSize: '0.875rem' }}>
                    Bloqueo originado por Checklist de Seguridad F-GMT
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Motivo registrado: {equipo.motivoEstado || 'Falla crítica detectada durante inspección.'}
                  </div>
                  {!puedeLevantarBloqueo && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--danger)', fontWeight: 600, marginTop: '8px' }}>
                      ⚠️ Su rol actual ({userRole}) no tiene facultades para levantar este bloqueo. Se requiere autorización de ADMIN o SUPERADMIN (Regla R1).
                    </div>
                  )}
                </div>
              </div>
            )}

            {!esBloqueoSeguridad && equipo.motivoEstado && (
              <div style={{ padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <strong>Motivo anterior:</strong> {equipo.motivoEstado}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !puedeLevantarBloqueo}
                title={!puedeLevantarBloqueo ? 'Solo ADMIN o SUPERADMIN pueden levantar este bloqueo' : 'Habilitar equipo'}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Habilitando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    <span>Confirmar Habilitación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* MODO DESHABILITAR */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Al deshabilitar el equipo <strong>{equipo.patente}</strong> ({equipo.marca} {equipo.modelo}), quedará inhabilitado para nuevos despachos y operaciones.
            </p>

            {/* Motivo de deshabilitación */}
            <div className="form-group">
              <label className="form-label" htmlFor="status-motivo">
                Motivo de Deshabilitación * (mínimo 5 caracteres)
              </label>
              <textarea
                id="status-motivo"
                className="form-textarea"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Indique la justificación técnica u operativa (ej: Mantención preventiva 50.000 km, falla en toma de fuerza)..."
                minLength={5}
                maxLength={500}
                required
                disabled={submitting}
                rows={3}
                autoFocus
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                {motivo.length}/500 caracteres
              </span>
            </div>

            {/* Estado de carga de operaciones */}
            {loadingOps ? (
              <div
                style={{
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)'
                }}
                aria-busy="true"
              >
                <Loader2 size={20} className="animate-spin text-primary" />
                <span>Analizando operaciones y jornadas activas...</span>
              </div>
            ) : tieneJornadasActivas ? (
              /* ALERTA DE TRANSFERENCIA OBLIGATORIA */
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--danger-bg)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontWeight: 600, fontSize: '0.925rem' }}>
                  <AlertTriangle size={20} />
                  <span>Transferencia Obligatoria Requerida</span>
                </div>

                <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  Este equipo tiene <strong>{jornadasActivas.length} jornada(s) activa(s)</strong> (PROGRAMADA / EN CURSO). De acuerdo con la normativa operativa (R7), para deshabilitarlo debe seleccionar obligatoriamente un equipo habilitado de reemplazo:
                </div>

                {/* Lista de jornadas activas */}
                <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {jornadasActivas.map((j) => (
                    <div
                      key={j.id}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} style={{ color: 'var(--accent-primary)' }} />
                        <span>Jornada: {j.estado}</span>
                        <span style={{ color: 'var(--text-muted)' }}>({new Date(j.fechaInicio).toLocaleDateString()})</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        Conductor: <strong>{j.conductor.nombre}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selector Obligatorio de Reemplazo */}
                <div className="form-group" style={{ marginTop: '4px' }}>
                  <label className="form-label" htmlFor="status-destino" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    Seleccione Equipo Habilitado de Reemplazo *
                  </label>
                  {candidatos.length === 0 ? (
                    <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', fontSize: '0.8125rem' }}>
                      No existen otros equipos habilitados en el sistema. Debe registrar o habilitar un equipo antes de deshabilitar este.
                    </div>
                  ) : candidatosSinConflicto.length === 0 ? (
                    <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', fontSize: '0.8125rem' }}>
                      Todos los equipos habilitados presentan conflicto de horario con las jornadas activas.
                    </div>
                  ) : (
                    <select
                      id="status-destino"
                      className="form-select"
                      value={vehiculoDestinoId}
                      onChange={(e) => setVehiculoDestinoId(e.target.value)}
                      required
                      disabled={submitting}
                      style={{ background: 'var(--bg-surface)' }}
                    >
                      <option value="">-- Seleccionar equipo de reemplazo --</option>
                      {candidatos.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          disabled={c.tieneConflicto}
                        >
                          {c.patente} - {c.marca} {c.modelo} ({c.tipoEquipo}, {c.capacidadEstanqueM3} m³)
                          {c.tieneConflicto ? ' [CONFLICTO DE HORARIO]' : ' [DISPONIBLE]'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ) : (
              /* Sin operaciones activas */
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                <span>No hay jornadas activas asociadas. El equipo se deshabilitará de inmediato.</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={isDisableButtonDisabled}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} />
                    <span>Confirmar Deshabilitación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
