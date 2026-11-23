import React from 'react';
import { useServiceCalendar } from './useServiceCalendar';
import { CalendarToolbar } from './CalendarToolbar';
import { CalendarGridMonth } from './CalendarGridMonth';
import { CalendarGridWeek } from './CalendarGridWeek';
import { CalendarGridDay } from './CalendarGridDay';
import { AssignmentModal } from './AssignmentModal';
import { OverrideWarningDialog } from './OverrideWarningDialog';
import { Loader2, AlertCircle } from 'lucide-react';
import './calendar.css';

export const ServiceCalendar: React.FC = () => {
  const {
    currentDate,
    viewMode,
    filters,
    atenciones,
    loading,
    error,
    selectedAtencion,
    isAssignmentModalOpen,
    conflictWarning,
    isOverrideDialogOpen,
    setViewMode,
    setFilters,
    setIsAssignmentModalOpen,
    setIsOverrideDialogOpen,
    nextPeriod,
    prevPeriod,
    setToday,
    reloadAgenda,
    handleAssign,
    handleReassign,
    handleForceAssign,
    openAssignModalFor
  } = useServiceCalendar();

  return (
    <div className="satem-calendar-root">
      {/* Barra de herramientas */}
      <CalendarToolbar
        currentDate={currentDate}
        viewMode={viewMode}
        filters={filters}
        loading={loading}
        onPrev={prevPeriod}
        onNext={nextPeriod}
        onToday={setToday}
        onViewModeChange={setViewMode}
        onFilterChange={setFilters}
        onRefresh={reloadAgenda}
      />

      {/* Alerta de Error si ocurre */}
      {error && (
        <div
          style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: 'var(--danger)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Renderizado de vista activa */}
      <div style={{ position: 'relative' }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 20,
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-pill)',
              padding: '4px 10px',
              fontSize: '0.75rem',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Loader2 size={13} className="animate-spin" />
            <span>Actualizando agenda...</span>
          </div>
        )}

        {viewMode === 'mes' && (
          <CalendarGridMonth
            currentDate={currentDate}
            atenciones={atenciones}
            onSelectAtencion={openAssignModalFor}
          />
        )}

        {viewMode === 'semana' && (
          <CalendarGridWeek
            currentDate={currentDate}
            atenciones={atenciones}
            onSelectAtencion={openAssignModalFor}
          />
        )}

        {viewMode === 'dia' && (
          <CalendarGridDay
            currentDate={currentDate}
            atenciones={atenciones}
            onSelectAtencion={openAssignModalFor}
          />
        )}
      </div>

      {/* Modal de Asignación / Reasignación */}
      <AssignmentModal
        isOpen={isAssignmentModalOpen}
        atencion={selectedAtencion}
        onAssign={handleAssign}
        onReassign={handleReassign}
        onClose={() => setIsAssignmentModalOpen(false)}
      />

      {/* Diálogo de Advertencia de Traslado < 4h (HTTP 409) */}
      <OverrideWarningDialog
        isOpen={isOverrideDialogOpen}
        warningPayload={conflictWarning}
        onConfirmForce={handleForceAssign}
        onCancel={() => {
          setIsOverrideDialogOpen(false);
        }}
      />
    </div>
  );
};
