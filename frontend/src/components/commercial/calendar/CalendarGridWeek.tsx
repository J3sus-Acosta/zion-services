import React from 'react';
import { AtencionProgramadaDTO } from '../../../types/planning';
import { AttentionCard } from './AttentionCard';

interface CalendarGridWeekProps {
  currentDate: Date;
  atenciones: AtencionProgramadaDTO[];
  onSelectAtencion: (atencion: AtencionProgramadaDTO) => void;
}

const DIAS_SEMANA_NOMBRES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HORAS_OPERATIVAS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 a 20:00

export const CalendarGridWeek: React.FC<CalendarGridWeekProps> = ({
  currentDate,
  atenciones,
  onSelectAtencion
}) => {
  // Calcular lunes de la semana
  const dayOfWeek = currentDate.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  const lunes = new Date(currentDate);
  lunes.setDate(currentDate.getDate() - diffToMonday);

  const hoy = new Date();
  const hoyIsoStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  // 7 días de la semana
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    const isoStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const esHoy = isoStr === hoyIsoStr;

    // Atenciones de este día
    const atencionesDelDia = atenciones.filter((a) => {
      try {
        return a.fechaHoraInicio.split('T')[0] === isoStr;
      } catch {
        return false;
      }
    });

    return {
      nombre: DIAS_SEMANA_NOMBRES[i],
      fechaNumero: d.getDate(),
      isoStr,
      esHoy,
      atenciones: atencionesDelDia
    };
  });

  return (
    <div className="calendar-week-container">
      {/* Cabecera de Columnas */}
      <div className="calendar-week-header-row">
        <div className="calendar-week-gutter-header">Hora</div>
        {diasSemana.map((dia) => (
          <div
            key={dia.isoStr}
            className={`calendar-week-col-header ${dia.esHoy ? 'today' : ''}`}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{dia.nombre}</span>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: dia.esHoy ? 'var(--accent-primary)' : 'transparent',
                color: dia.esHoy ? '#ffffff' : 'inherit'
              }}
            >
              {dia.fechaNumero}
            </span>
          </div>
        ))}
      </div>

      {/* Cuerpo con Scroll Horario */}
      <div className="calendar-week-body-scroll">
        <div className="calendar-week-grid-body">
          {/* Columna de Horas (Gutter) */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {HORAS_OPERATIVAS.map((hora) => (
              <div key={hora} className="calendar-week-hour-slot">
                {String(hora).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* 7 Columnas para cada día */}
          {diasSemana.map((dia) => (
            <div
              key={dia.isoStr}
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid var(--border-color)',
                position: 'relative'
              }}
            >
              {/* Slots de fondo para las líneas horarias */}
              {HORAS_OPERATIVAS.map((hora) => (
                <div key={hora} className="calendar-week-col-slot" />
              ))}

              {/* Contenedor superpuesto de atenciones */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  pointerEvents: 'none'
                }}
              >
                {dia.atenciones.map((atencion) => {
                  let topOffset = 0;
                  try {
                    const d = new Date(atencion.fechaHoraInicio);
                    const horaDecimal = d.getHours() + d.getMinutes() / 60;
                    // Escala: 07:00 es top 0, cada hora mide 52px
                    topOffset = Math.max(0, (horaDecimal - 7) * 52);
                  } catch {}

                  return (
                    <div
                      key={atencion.id}
                      style={{
                        position: 'absolute',
                        top: `${topOffset}px`,
                        left: '4px',
                        right: '4px',
                        pointerEvents: 'auto',
                        zIndex: 5
                      }}
                    >
                      <AttentionCard
                        atencion={atencion}
                        compact={false}
                        onClick={onSelectAtencion}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
