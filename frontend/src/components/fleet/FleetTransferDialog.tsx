import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import {
  Equipo,
  OperacionesAfectadasResponse,
  TransferenciaResultado
} from '../../types/fleet';
import { fleetApi, FleetApiError } from '../../services/fleetApi';
import {
  ArrowRightLeft,
  AlertCircle,
  Loader2,
  Calendar,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface FleetTransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  equipo: Equipo | null;
  onSuccess: (resultado: TransferenciaResultado) => void;
}

export const FleetTransferDialog: React.FC<FleetTransferDialogProps> = ({
  isOpen,
  onClose,
  equipo,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [operacionesData, setOperacionesData] = useState<OperacionesAfectadasResponse | null>(null);
  const [jornadasSeleccionadas, setJornadasSeleccionadas] = useState<string[]>([]);
  const [vehiculoDestinoId, setVehiculoDestinoId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !equipo) {
      setOperacionesData(null);
      setJornadasSeleccionadas([]);
      setVehiculoDestinoId('');
      setErrorMessage(null);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    fleetApi
      .obtenerOperacionesAfectadas(equipo.id)
      .then((res) => {
        setOperacionesData(res);
        // Seleccionar todas las jornadas activas por defecto
        setJornadasSeleccionadas(res.jornadas.map((j) => j.id));
        // Seleccionar primer candidato sin conflicto
        const primerDisponible = res.candidatos.find((c) => !c.tieneConflicto);
        if (primerDisponible) {
          setVehiculoDestinoId(primerDisponible.id);
        }
      })
      .catch((err) => {
        setErrorMessage(err?.message || 'Error al obtener operaciones afectadas.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, equipo]);

  if (!equipo) return null;

  const jornadas = operacionesData?.jornadas || [];
  const candidatos = operacionesData?.candidatos || [];
  const candidatosSinConflicto = candidatos.filter((c) => !c.tieneConflicto);

  const toggleJornada = (id: string) => {
    setJornadasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (jornadasSeleccionadas.length === jornadas.length) {
      setJornadasSeleccionadas([]);
    } else {
      setJornadasSeleccionadas(jornadas.map((j) => j.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!vehiculoDestinoId) {
      setErrorMessage('Debe seleccionar un equipo de destino habilitado.');
      return;
    }

    if (jornadasSeleccionadas.length === 0) {
      setErrorMessage('Debe seleccionar al menos una jornada para transferir.');
      return;
    }

    setSubmitting(true);
    try {
      const resultado = await fleetApi.transferir(equipo.id, {
        vehiculoDestinoId,
        jornadaIds: jornadasSeleccionadas.length === jornadas.length ? undefined : jornadasSeleccionadas
      });
      onSuccess(resultado);
      onClose();
    } catch (err: any) {
      if (err instanceof FleetApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(err?.message || 'Error al transferir operaciones.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled =
    loading ||
    submitting ||
    !vehiculoDestinoId ||
    jornadasSeleccionadas.length === 0 ||
    jornadas.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)' }}>
          <ArrowRightLeft size={20} />
          <span>Reasignar Operaciones: {equipo.patente}</span>
        </div>
      }
      maxWidth="680px"
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

        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Transfiera las jornadas activas del equipo <strong>{equipo.patente}</strong> hacia otra unidad operativa habilitada sin modificar el estado actual del equipo origen.
        </div>

        {loading ? (
          <div
            style={{
              padding: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              color: 'var(--text-secondary)'
            }}
            aria-busy="true"
          >
            <Loader2 size={22} className="animate-spin text-primary" />
            <span>Cargando jornadas activas y unidades habilitadas...</span>
          </div>
        ) : jornadas.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem'
            }}
          >
            <CheckCircle2 size={32} style={{ color: 'var(--success)', margin: '0 auto 8px' }} />
            <div>No hay jornadas activas ni pendientes en este equipo para reasignar.</div>
          </div>
        ) : (
          <>
            {/* Lista de Jornadas con selección */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Jornadas Activas Disponibles ({jornadas.length})
                </span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    padding: '2px 6px'
                  }}
                >
                  {jornadasSeleccionadas.length === jornadas.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </button>
              </div>

              <div
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '8px',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)'
                }}
              >
                {jornadas.map((j) => {
                  const isChecked = jornadasSeleccionadas.includes(j.id);
                  return (
                    <label
                      key={j.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: isChecked ? 'rgba(0, 168, 150, 0.1)' : 'var(--bg-surface)',
                        border: `1px solid ${isChecked ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        cursor: 'pointer',
                        transition: 'background var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleJornada(j.id)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={13} style={{ color: 'var(--accent-primary)' }} />
                            <span>Jornada: {j.estado}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              ({new Date(j.fechaInicio).toLocaleDateString()})
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Conductor: {j.conductor.nombre} ({j.conductor.rut})
                          </div>
                        </div>
                      </div>

                      {j.ordenes && j.ordenes.length > 0 && (
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          {j.ordenes.length} OS vinculada(s)
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Selector de Unidad Destino */}
            <div className="form-group">
              <label className="form-label" htmlFor="transfer-destino">
                Unidad de Reemplazo Habilitada *
              </label>
              {candidatos.length === 0 ? (
                <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', fontSize: '0.8125rem' }}>
                  No existen otros equipos habilitados en el sistema para recibir operaciones.
                </div>
              ) : (
                <select
                  id="transfer-destino"
                  className="form-select"
                  value={vehiculoDestinoId}
                  onChange={(e) => setVehiculoDestinoId(e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="">-- Seleccionar unidad destino --</option>
                  {candidatos.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={c.tieneConflicto}
                    >
                      {c.patente} - {c.marca} {c.modelo} ({c.tipoEquipo}, {c.capacidadEstanqueM3} m³)
                      {c.tieneConflicto ? ' [SOLAPA EN HORARIO]' : ' [DISPONIBLE]'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {candidatosSinConflicto.length === 0 && candidatos.length > 0 && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--warning-bg)', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'var(--warning)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>Todos los equipos habilitados presentan conflicto de horario con las jornadas seleccionadas.</span>
              </div>
            )}
          </>
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
            disabled={isSubmitDisabled}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Reasignando...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft size={16} />
                <span>Transferir ({jornadasSeleccionadas.length}) Jornada(s)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
