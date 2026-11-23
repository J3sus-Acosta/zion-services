import React, { useState, useEffect } from 'react';
import {
  Truck,
  User,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  AtencionProgramadaDTO,
  AsignarAtencionInput,
  ReasignarAtencionInput,
  PlantaDestinoItem
} from '../../../types/planning';
import { PlanningApi } from '../../../services/planningApi';
import { Modal } from '../../ui/Modal';

export interface AssignmentResult {
  success: boolean;
  warning?: boolean;
  hardBlock?: boolean;
}

interface AssignmentModalProps {
  isOpen: boolean;
  atencion: AtencionProgramadaDTO | null;
  onAssign: (id: string, payload: AsignarAtencionInput) => Promise<AssignmentResult | void>;
  onReassign: (id: string, payload: ReasignarAtencionInput) => Promise<AssignmentResult | void>;
  onClose: () => void;
}

const VEHICULOS_DEFAULT = [
  { id: 'veh-01', patente: 'RVFL-92', modelo: 'Mercedes-Benz Actros 2645 (15 m³)' },
  { id: 'veh-02', patente: 'KHYZ-44', modelo: 'Scania P360 Limpiafosas (12 m³)' },
  { id: 'veh-03', patente: 'PHTR-81', modelo: 'Volvo FMX 420 Hidrojet (18 m³)' }
];

const CONDUCTORES_DEFAULT = [
  { id: 'usr-conductor-01', nombre: 'Carlos', apellido: 'Sánchez', rut: '4-3' },
  { id: 'usr-conductor-02', nombre: 'Roberto', apellido: 'Pérez', rut: '8-1' },
  { id: 'usr-conductor-03', nombre: 'Mauricio', apellido: 'Gutiérrez', rut: '9-4' }
];

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  atencion,
  onAssign,
  onReassign,
  onClose
}) => {
  const [plantasDestino, setPlantasDestino] = useState<PlantaDestinoItem[]>([]);
  const [vehiculoId, setVehiculoId] = useState<string>(VEHICULOS_DEFAULT[0].id);
  const [conductorId, setConductorId] = useState<string>(CONDUCTORES_DEFAULT[0].id);
  const [plantaDestinoId, setPlantaDestinoId] = useState<string>('');
  const [fechaHoraInicio, setFechaHoraInicio] = useState<string>('');
  const [duracionEstimadaMinutos, setDuracionEstimadaMinutos] = useState<number>(120);
  const [motivoReasignacion, setMotivoReasignacion] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Inicializar valores según atencion seleccionada
  useEffect(() => {
    if (!atencion) return;

    if (atencion.vehiculo?.id) {
      setVehiculoId(atencion.vehiculo.id);
    } else {
      setVehiculoId(VEHICULOS_DEFAULT[0].id);
    }

    if (atencion.conductor?.id) {
      setConductorId(atencion.conductor.id);
    } else {
      setConductorId(CONDUCTORES_DEFAULT[0].id);
    }

    if (atencion.plantaDestino?.id) {
      setPlantaDestinoId(atencion.plantaDestino.id);
    }

    if (atencion.duracionEstimadaMinutos) {
      setDuracionEstimadaMinutos(atencion.duracionEstimadaMinutos);
    }

    // Formatear para <input type="datetime-local" />
    try {
      const d = new Date(atencion.fechaHoraInicio);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
      setFechaHoraInicio(localISOTime);
    } catch {
      setFechaHoraInicio('');
    }

    setMotivoReasignacion('');
    setErrorLocal(null);
  }, [atencion]);

  // Cargar plantas de destino
  useEffect(() => {
    PlanningApi.getPlantasDestino().then(setPlantasDestino).catch(() => {});
  }, []);

  if (!isOpen || !atencion) return null;

  const esReasignacion = atencion.estado !== 'PENDIENTE_CONFIRMACION';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!vehiculoId || !conductorId || !fechaHoraInicio) {
      setErrorLocal('Por favor complete el vehículo, conductor y fecha/hora.');
      return;
    }

    if (esReasignacion && motivoReasignacion.trim().length < 5) {
      setErrorLocal('Debe ingresar un motivo para la reasignación de al menos 5 caracteres.');
      return;
    }

    setSubmitting(true);
    const isoFecha = new Date(fechaHoraInicio).toISOString();

    try {
      if (esReasignacion) {
        await onReassign(atencion.id, {
          nuevoVehiculoId: vehiculoId,
          nuevoConductorId: conductorId,
          nuevaFechaHoraInicio: isoFecha,
          nuevaDuracionEstimadaMinutos: duracionEstimadaMinutos,
          nuevaPlantaDestinoId: plantaDestinoId || undefined,
          motivoReasignacion: motivoReasignacion.trim()
        });
      } else {
        await onAssign(atencion.id, {
          vehiculoId,
          conductorId,
          fechaHoraInicio: isoFecha,
          duracionEstimadaMinutos,
          plantaDestinoId: plantaDestinoId || undefined
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar la asignación.';
      setErrorLocal(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        esReasignacion
          ? `Reasignar Atención ${atencion.folio}`
          : `Asignar Recursos a Atención ${atencion.folio}`
      }
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Resumen de la Atención */}
        <div
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            fontSize: '0.8125rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px'
          }}
        >
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Cliente:</span>
            <div style={{ fontWeight: 600 }}>{atencion.cliente.razonSocial}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Sucursal Faena:</span>
            <div style={{ fontWeight: 600 }}>
              {atencion.sucursalFaena.nombre} ({atencion.sucursalFaena.comuna})
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Servicios:</span>
            <div>{atencion.servicios.map((s) => `${s.nombre} (x${s.cantidad})`).join(', ') || 'General'}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Estado Actual:</span>
            <div>
              <span className={`badge badge-${atencion.estado === 'PROGRAMADA' ? 'info' : 'warning'}`}>
                {atencion.estado}
              </span>
            </div>
          </div>
        </div>

        {errorLocal && (
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} />
            <span>{errorLocal}</span>
          </div>
        )}

        {/* Formulario de Recursos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">
              <Truck size={15} /> Unidad / Camión de Flota
            </label>
            <select
              className="form-select"
              value={vehiculoId}
              onChange={(e) => setVehiculoId(e.target.value)}
              required
            >
              {VEHICULOS_DEFAULT.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.patente} · {v.modelo}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              <User size={15} /> Conductor Calificado
            </label>
            <select
              className="form-select"
              value={conductorId}
              onChange={(e) => setConductorId(e.target.value)}
              required
            >
              {CONDUCTORES_DEFAULT.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido} (RUT: {c.rut})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">
              <Calendar size={15} /> Fecha y Hora de Inicio
            </label>
            <input
              type="datetime-local"
              className="form-input"
              value={fechaHoraInicio}
              onChange={(e) => setFechaHoraInicio(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Clock size={15} /> Duración Estimada
            </label>
            <select
              className="form-select"
              value={duracionEstimadaMinutos}
              onChange={(e) => setDuracionEstimadaMinutos(parseInt(e.target.value, 10))}
            >
              <option value={60}>1 hora (60 min)</option>
              <option value={90}>1.5 horas (90 min)</option>
              <option value={120}>2 horas (120 min)</option>
              <option value={180}>3 horas (180 min)</option>
              <option value={240}>4 horas (240 min)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <MapPin size={15} /> Planta de Destino / Descarga Autorizada
          </label>
          <select
            className="form-select"
            value={plantaDestinoId}
            onChange={(e) => setPlantaDestinoId(e.target.value)}
          >
            <option value="">Selección automática por tipo de residuo</option>
            {plantasDestino.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.comuna})
              </option>
            ))}
          </select>
        </div>

        {esReasignacion && (
          <div className="form-group">
            <label className="form-label">
              <FileText size={15} /> Motivo del Cambio / Reasignación (Obligatorio)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej. Solicitud formal del cliente por retraso en planta / falla mecánica preventiva"
              value={motivoReasignacion}
              onChange={(e) => setMotivoReasignacion(e.target.value)}
              required
            />
          </div>
        )}

        <div
          className="modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '14px',
            borderTop: '1px solid var(--border-color)'
          }}
        >
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
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Guardando...</span>
              </>
            ) : esReasignacion ? (
              <>
                <CheckCircle2 size={16} />
                <span>Guardar Reasignación</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Confirmar y Emitir OS</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
