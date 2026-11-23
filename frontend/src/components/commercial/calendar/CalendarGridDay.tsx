import React from 'react';
import {
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { AtencionProgramadaDTO } from '../../../types/planning';
import { AttentionCard } from './AttentionCard';

interface CalendarGridDayProps {
  currentDate: Date;
  atenciones: AtencionProgramadaDTO[];
  onSelectAtencion: (atencion: AtencionProgramadaDTO) => void;
}

const HORAS_OPERATIVAS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 a 20:00

export const CalendarGridDay: React.FC<CalendarGridDayProps> = ({
  currentDate,
  atenciones,
  onSelectAtencion
}) => {
  const fechaIsoStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  const atencionesDelDia = atenciones.filter((a) => {
    try {
      return a.fechaHoraInicio.split('T')[0] === fechaIsoStr;
    } catch {
      return false;
    }
  });

  const totalPendientes = atencionesDelDia.filter((a) => a.estado === 'PENDIENTE_CONFIRMACION').length;
  const totalProgramadas = atencionesDelDia.filter((a) => a.estado === 'PROGRAMADA' || a.estado === 'EN_CURSO').length;

  return (
    <div className="calendar-day-view-container">
      {/* Cabecera del Día */}
      <div className="calendar-day-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
              Agenda Operativa del Día: {fechaIsoStr}
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {atencionesDelDia.length} atenciones registradas en total
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {totalPendientes > 0 && (
            <span className="badge badge-warning">{totalPendientes} Pendientes</span>
          )}
          {totalProgramadas > 0 && (
            <span className="badge badge-info">{totalProgramadas} Programadas / En Curso</span>
          )}
        </div>
      </div>

      {/* Timeline Horario */}
      <div className="calendar-day-timeline">
        {HORAS_OPERATIVAS.map((hora) => {
          const atencionesEnEstaHora = atencionesDelDia.filter((a) => {
            try {
              const d = new Date(a.fechaHoraInicio);
              return d.getHours() === hora;
            } catch {
              return false;
            }
          });

          return (
            <div key={hora} className="calendar-day-time-row">
              <div className="calendar-day-time-label">
                {String(hora).padStart(2, '0')}:00
              </div>

              <div className="calendar-day-time-content">
                {atencionesEnEstaHora.length > 0 ? (
                  atencionesEnEstaHora.map((item) => (
                    <div key={item.id} style={{ minWidth: '320px', flex: 1, maxWidth: '480px' }}>
                      <AttentionCard
                        atencion={item}
                        compact={false}
                        onClick={onSelectAtencion}
                      />
                    </div>
                  ))
                ) : (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      padding: '4px 0'
                    }}
                  >
                    Sin faenas programadas para este intervalo
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {atencionesDelDia.length === 0 && (
        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
          <CheckCircle2 size={32} style={{ margin: '0 auto 8px', color: 'var(--accent-primary)', opacity: 0.8 }} />
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
            No hay atenciones programadas para este día
          </p>
          <span style={{ fontSize: '0.75rem' }}>
            Los recursos y conductores se encuentran libres de asignación.
          </span>
        </div>
      )}
    </div>
  );
};
