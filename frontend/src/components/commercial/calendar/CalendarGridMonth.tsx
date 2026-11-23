import React, { useState } from 'react';
import { AtencionProgramadaDTO } from '../../../types/planning';
import { AttentionCard } from './AttentionCard';
import { Modal } from '../../ui/Modal';

interface CalendarGridMonthProps {
  currentDate: Date;
  atenciones: AtencionProgramadaDTO[];
  onSelectAtencion: (atencion: AtencionProgramadaDTO) => void;
}

const DIAS_CABECERA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const CalendarGridMonth: React.FC<CalendarGridMonthProps> = ({
  currentDate,
  atenciones,
  onSelectAtencion
}) => {
  const [diaDetalleModal, setDiaDetalleModal] = useState<{
    fechaStr: string;
    items: AtencionProgramadaDTO[];
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Primer día del mes
  const primerDiaMes = new Date(year, month, 1);
  // Último día del mes
  const ultimoDiaMes = new Date(year, month + 1, 0);

  // Offset del día de la semana (Lunes = 0, Domingo = 6)
  const offsetInicio = (primerDiaMes.getDay() + 6) % 7;

  // Días totales a mostrar (cuadrícula de 35 o 42 celdas)
  const totalDiasMes = ultimoDiaMes.getDate();
  const celdasTotales = Math.ceil((offsetInicio + totalDiasMes) / 7) * 7;

  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const celdas = [];
  for (let i = 0; i < celdasTotales; i++) {
    const diaNumero = i - offsetInicio + 1;
    const esOtroMes = diaNumero < 1 || diaNumero > totalDiasMes;

    let fechaCelda: Date;
    if (diaNumero < 1) {
      fechaCelda = new Date(year, month, diaNumero);
    } else if (diaNumero > totalDiasMes) {
      fechaCelda = new Date(year, month, diaNumero);
    } else {
      fechaCelda = new Date(year, month, diaNumero);
    }

    const fechaIsoStr = `${fechaCelda.getFullYear()}-${String(fechaCelda.getMonth() + 1).padStart(2, '0')}-${String(fechaCelda.getDate()).padStart(2, '0')}`;
    const esHoy = fechaIsoStr === hoyStr;

    // Atenciones para esta fecha
    const atencionesDelDia = atenciones.filter((a) => {
      try {
        const itemDateStr = a.fechaHoraInicio.split('T')[0];
        return itemDateStr === fechaIsoStr;
      } catch {
        return false;
      }
    });

    celdas.push({
      indice: i,
      numero: fechaCelda.getDate(),
      fechaIsoStr,
      esOtroMes,
      esHoy,
      atenciones: atencionesDelDia
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Cabecera de días de la semana */}
      <div className="calendar-month-grid" style={{ borderBottom: 'none' }}>
        {DIAS_CABECERA.map((d) => (
          <div key={d} className="calendar-month-header-cell">
            {d}
          </div>
        ))}
      </div>

      {/* Celdas del mes */}
      <div className="calendar-month-grid">
        {celdas.map((celda) => {
          const maxVisibles = 2;
          const visibles = celda.atenciones.slice(0, maxVisibles);
          const restantes = celda.atenciones.length - maxVisibles;

          return (
            <div
              key={celda.indice}
              className={`calendar-month-day-cell ${celda.esOtroMes ? 'other-month' : ''} ${celda.esHoy ? 'today' : ''}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="calendar-day-number">{celda.numero}</span>
                {celda.atenciones.length > 0 && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {celda.atenciones.length} {celda.atenciones.length === 1 ? 'faena' : 'faenas'}
                  </span>
                )}
              </div>

              <div className="calendar-day-items">
                {visibles.map((atencion) => (
                  <AttentionCard
                    key={atencion.id}
                    atencion={atencion}
                    compact={true}
                    onClick={onSelectAtencion}
                  />
                ))}

                {restantes > 0 && (
                  <button
                    type="button"
                    className="calendar-more-badge"
                    onClick={() =>
                      setDiaDetalleModal({
                        fechaStr: celda.fechaIsoStr,
                        items: celda.atenciones
                      })
                    }
                  >
                    +{restantes} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal popover con todas las atenciones del día */}
      {diaDetalleModal && (
        <Modal
          isOpen={true}
          onClose={() => setDiaDetalleModal(null)}
          title={`Atenciones programadas para el ${diaDetalleModal.fechaStr}`}
          maxWidth="520px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {diaDetalleModal.items.map((atencion) => (
              <AttentionCard
                key={atencion.id}
                atencion={atencion}
                onClick={(item) => {
                  setDiaDetalleModal(null);
                  onSelectAtencion(item);
                }}
              />
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};
