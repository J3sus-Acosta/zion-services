import React from 'react';
import {
  Clock,
  MapPin,
  Truck,
  User,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';
import { AtencionProgramadaDTO, EstadoAtencionProgramada } from '../../../types/planning';

interface AttentionCardProps {
  atencion: AtencionProgramadaDTO;
  onClick?: (atencion: AtencionProgramadaDTO) => void;
  compact?: boolean;
}

const ESTADO_CONFIG: Record<
  EstadoAtencionProgramada,
  { label: string; bgClass: string; color: string; icon: React.ReactNode }
> = {
  PENDIENTE_CONFIRMACION: {
    label: 'Pendiente',
    bgClass: 'estado-PENDIENTE_CONFIRMACION',
    color: '#f59e0b',
    icon: <AlertTriangle size={11} />
  },
  PROGRAMADA: {
    label: 'Programada',
    bgClass: 'estado-PROGRAMADA',
    color: '#3b82f6',
    icon: <Calendar size={11} />
  },
  EN_CURSO: {
    label: 'En Curso',
    bgClass: 'estado-EN_CURSO',
    color: '#10b981',
    icon: <Clock size={11} />
  },
  COMPLETADA: {
    label: 'Completada',
    bgClass: 'estado-COMPLETADA',
    color: '#64748b',
    icon: <CheckCircle2 size={11} />
  },
  CANCELADA: {
    label: 'Cancelada',
    bgClass: 'estado-CANCELADA',
    color: '#ef4444',
    icon: <AlertTriangle size={11} />
  },
  REPROGRAMADA: {
    label: 'Reprogramada',
    bgClass: 'estado-REPROGRAMADA',
    color: '#8b5cf6',
    icon: <Calendar size={11} />
  }
};

export const AttentionCard: React.FC<AttentionCardProps> = ({
  atencion,
  onClick,
  compact = false
}) => {
  const cfg = ESTADO_CONFIG[atencion.estado] || ESTADO_CONFIG.PENDIENTE_CONFIRMACION;

  const formatHora = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const horaInicio = formatHora(atencion.fechaHoraInicio);
  const horaFin = formatHora(atencion.fechaHoraFinEstimada);

  if (compact) {
    return (
      <div
        className={`attention-card ${cfg.bgClass}`}
        onClick={() => onClick && onClick(atencion)}
        title={`${atencion.folio} - ${atencion.cliente.razonSocial} (${atencion.sucursalFaena.comuna})\n${horaInicio} a ${horaFin}`}
        style={{ padding: '4px 6px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
          <strong style={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {atencion.folio}
          </strong>
          <span style={{ fontSize: '0.65rem', opacity: 0.9 }}>{horaInicio}</span>
        </div>
        <div
          style={{
            fontSize: '0.68rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            opacity: 0.95
          }}
        >
          {atencion.cliente.razonSocial}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`attention-card ${cfg.bgClass}`}
      onClick={() => onClick && onClick(atencion)}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <span
          className="attention-badge-pill"
          style={{ background: 'rgba(0,0,0,0.25)', color: cfg.color }}
        >
          {cfg.icon} {cfg.label}
        </span>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Clock size={11} /> {horaInicio} - {horaFin}
        </span>
      </div>

      <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '2px' }}>
        {atencion.folio} · {atencion.cliente.razonSocial}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.725rem', opacity: 0.9 }}>
        <MapPin size={11} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {atencion.sucursalFaena.nombre} ({atencion.sucursalFaena.comuna})
        </span>
      </div>

      {/* Vehículo y Conductor Asignado */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.7rem', marginTop: '3px' }}>
        {atencion.vehiculo ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#93c5fd' }}>
            <Truck size={11} /> {atencion.vehiculo.patente}
          </span>
        ) : (
          <span style={{ color: '#fca5a5', fontStyle: 'italic' }}>Sin camión</span>
        )}

        {atencion.conductor ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#86efac' }}>
            <User size={11} /> {atencion.conductor.nombre} {atencion.conductor.apellido}
          </span>
        ) : (
          <span style={{ color: '#fca5a5', fontStyle: 'italic' }}>Sin conductor</span>
        )}
      </div>

      {/* Servicios asociados */}
      {atencion.servicios && atencion.servicios.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.675rem',
            color: 'var(--text-secondary)',
            marginTop: '2px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '3px'
          }}
        >
          <Layers size={10} />
          <span>
            {atencion.servicios.map((s) => `${s.nombre} (x${s.cantidad})`).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
};
