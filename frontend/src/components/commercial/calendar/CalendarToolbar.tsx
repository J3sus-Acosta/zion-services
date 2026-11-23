import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter
} from 'lucide-react';
import { CalendarFilters, EstadoAtencionProgramada } from '../../../types/planning';

interface CalendarToolbarProps {
  currentDate: Date;
  viewMode: 'mes' | 'semana' | 'dia';
  filters: CalendarFilters;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewModeChange: (mode: 'mes' | 'semana' | 'dia') => void;
  onFilterChange: (filters: CalendarFilters) => void;
  onRefresh: () => void;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  currentDate,
  viewMode,
  filters,
  loading,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
  onFilterChange,
  onRefresh
}) => {
  // Formateador de título según la vista
  const getTituloPeriodo = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'mes') {
      return `${MESES[month]} ${year}`;
    }

    if (viewMode === 'semana') {
      const dayOfWeek = currentDate.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - diffToMonday);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return `${startOfWeek.getDate()} ${MESES[startOfWeek.getMonth()].slice(0, 3)} - ${endOfWeek.getDate()} ${MESES[endOfWeek.getMonth()].slice(0, 3)} ${year}`;
    }

    // 'dia'
    const diaNombre = DIAS_SEMANA[currentDate.getDay()];
    return `${diaNombre} ${currentDate.getDate()} de ${MESES[month]} ${year}`;
  };

  return (
    <div className="calendar-toolbar">
      {/* 1. Navegación de Fecha */}
      <div className="calendar-toolbar-nav">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onToday}
          style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
        >
          Hoy
        </button>

        <div className="btn-group" style={{ gap: '2px' }}>
          <button
            type="button"
            className="btn btn-icon"
            onClick={onPrev}
            title="Periodo anterior"
            aria-label="Periodo anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={onNext}
            title="Periodo siguiente"
            aria-label="Periodo siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <span className="calendar-title-display">{getTituloPeriodo()}</span>
      </div>

      {/* 2. Selector de Vista Mes / Semana / Día */}
      <div className="calendar-view-switcher">
        <button
          type="button"
          className={`calendar-view-btn ${viewMode === 'mes' ? 'active' : ''}`}
          onClick={() => onViewModeChange('mes')}
        >
          Mes
        </button>
        <button
          type="button"
          className={`calendar-view-btn ${viewMode === 'semana' ? 'active' : ''}`}
          onClick={() => onViewModeChange('semana')}
        >
          Semana
        </button>
        <button
          type="button"
          className={`calendar-view-btn ${viewMode === 'dia' ? 'active' : ''}`}
          onClick={() => onViewModeChange('dia')}
        >
          Día
        </button>
      </div>

      {/* 3. Filtros Operativos Rápidos */}
      <div className="calendar-toolbar-filters">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
          <select
            className="form-select"
            style={{ minHeight: '34px', fontSize: '0.75rem', padding: '4px 8px', width: 'auto' }}
            value={filters.estado || 'TODOS'}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                estado: e.target.value as EstadoAtencionProgramada | 'TODOS'
              })
            }
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="PENDIENTE_CONFIRMACION">Pendiente Confirmación</option>
            <option value="PROGRAMADA">Programada</option>
            <option value="EN_CURSO">En Curso</option>
            <option value="COMPLETADA">Completada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>

        <button
          type="button"
          className="btn btn-icon"
          onClick={onRefresh}
          disabled={loading}
          title="Recargar agenda"
          aria-label="Recargar agenda"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
};
