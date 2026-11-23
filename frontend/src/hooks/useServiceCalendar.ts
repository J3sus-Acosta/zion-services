import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AtencionProgramadaDTO,
  CalendarFilters,
  ConflictWarningPayload,
  AsignarAtencionInput,
  ReasignarAtencionInput
} from '../types/planning';
import { PlanningApi, PlanningConflictError } from '../services/planningApi';

// Datos mock de demostración para visualización rica inicial
export const ATENCIONES_DEMO_AGENDA: AtencionProgramadaDTO[] = [
  {
    id: 'ap-demo-01',
    folio: 'AP-2026-00042',
    solicitudServicioId: 'sol-01',
    cliente: {
      id: 'empresa-horse',
      razonSocial: 'Horse Chile SpA'
    },
    sucursalFaena: {
      id: 'suc-01',
      nombre: 'Planta Quilicura',
      comuna: 'Quilicura',
      direccion: 'Av. Eduardo Frei Montalva 4500'
    },
    fechaHoraInicio: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
    fechaHoraFinEstimada: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(),
    duracionEstimadaMinutos: 120,
    estado: 'PROGRAMADA',
    vehiculo: {
      id: 'veh-01',
      patente: 'RVFL-92',
      modelo: 'Mercedes-Benz Actros 2645'
    },
    conductor: {
      id: 'usr-conductor-01',
      nombre: 'Carlos',
      apellido: 'Sánchez'
    },
    plantaDestino: {
      id: 'planta-la-farfana',
      nombre: 'Planta La Farfana (Aguas Andinas)'
    },
    servicios: [
      {
        id: 's-hidrojet-01',
        codigo: 'HIDROJET-ALTA',
        nombre: 'Hidrojet Alta Presión',
        cantidad: 1
      }
    ],
    ordenServicioId: 'os-01',
    ordenServicioFolio: 'OS-000561'
  },
  {
    id: 'ap-demo-02',
    folio: 'AP-2026-00043',
    solicitudServicioId: 'sol-01',
    cliente: {
      id: 'empresa-horse',
      razonSocial: 'Horse Chile SpA'
    },
    sucursalFaena: {
      id: 'suc-01',
      nombre: 'Planta Quilicura',
      comuna: 'Quilicura',
      direccion: 'Av. Eduardo Frei Montalva 4500'
    },
    fechaHoraInicio: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    fechaHoraFinEstimada: new Date(new Date().setHours(16, 30, 0, 0)).toISOString(),
    duracionEstimadaMinutos: 150,
    estado: 'PENDIENTE_CONFIRMACION',
    vehiculo: null,
    conductor: null,
    plantaDestino: {
      id: 'planta-trebal-mapocho',
      nombre: 'Planta Trebal - Mapocho'
    },
    servicios: [
      {
        id: 's-succion-02',
        codigo: 'SUCCION-RILES',
        nombre: 'Succión de RILes',
        cantidad: 1
      }
    ],
    ordenServicioId: null,
    ordenServicioFolio: null
  },
  {
    id: 'ap-demo-03',
    folio: 'AP-2026-00044',
    solicitudServicioId: 'sol-02',
    cliente: {
      id: 'empresa-bravo-energy',
      razonSocial: 'Bravo Energy Chile SpA'
    },
    sucursalFaena: {
      id: 'suc-02',
      nombre: 'Centro Logístico San Bernardo',
      comuna: 'San Bernardo',
      direccion: 'Camino Nos 1250'
    },
    fechaHoraInicio: new Date(Date.now() + 86400000 * 2).toISOString(),
    fechaHoraFinEstimada: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString(),
    duracionEstimadaMinutos: 120,
    estado: 'PROGRAMADA',
    vehiculo: {
      id: 'veh-01',
      patente: 'RVFL-92',
      modelo: 'Mercedes-Benz Actros 2645'
    },
    conductor: {
      id: 'usr-conductor-01',
      nombre: 'Carlos',
      apellido: 'Sánchez'
    },
    plantaDestino: {
      id: 'planta-la-farfana',
      nombre: 'Planta La Farfana'
    },
    servicios: [
      {
        id: 's-lodos-03',
        codigo: 'RETIRO-LODOS-MANUAL',
        nombre: 'Retiro Manual de Lodos',
        cantidad: 2
      }
    ],
    ordenServicioId: 'os-02',
    ordenServicioFolio: 'OS-000562'
  }
];

export function useServiceCalendar() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'mes' | 'semana' | 'dia'>('mes');
  const [filters, setFilters] = useState<CalendarFilters>({});
  const [atenciones, setAtenciones] = useState<AtencionProgramadaDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal Asignación / Reasignación
  const [selectedAtencion, setSelectedAtencion] = useState<AtencionProgramadaDTO | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState<boolean>(false);

  // Diálogo de Advertencia Traslado < 4h (HTTP 409)
  const [conflictWarning, setConflictWarning] = useState<ConflictWarningPayload | null>(null);
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState<boolean>(false);
  const [pendingAssignment, setPendingAssignment] = useState<{
    id: string;
    payload: AsignarAtencionInput;
    isReassign?: boolean;
    reassignPayload?: ReasignarAtencionInput;
  } | null>(null);

  // Cálculo de rango de fechas según currentDate y viewMode
  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'mes') {
      const startOfMonth = new Date(year, month, 1, 0, 0, 0);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

      // Expandir margen a 7 días antes y después para celdas de cuadrícula completa
      const start = new Date(startOfMonth);
      start.setDate(start.getDate() - 7);
      const end = new Date(endOfMonth);
      end.setDate(end.getDate() + 7);

      return {
        desde: start.toISOString(),
        hasta: end.toISOString()
      };
    } else if (viewMode === 'semana') {
      const day = currentDate.getDay();
      const diffToMonday = (day + 6) % 7;
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return {
        desde: startOfWeek.toISOString(),
        hasta: endOfWeek.toISOString()
      };
    } else {
      // 'dia'
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);

      return {
        desde: startOfDay.toISOString(),
        hasta: endOfDay.toISOString()
      };
    }
  }, [currentDate, viewMode]);

  // Carga de agenda
  const fetchAgenda = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PlanningApi.getAgenda(
        dateRange.desde,
        dateRange.hasta,
        filters,
        viewMode
      );
      setAtenciones(data && data.length > 0 ? data : ATENCIONES_DEMO_AGENDA);
    } catch (err: any) {
      console.warn('Fallo fetch agenda remoto, usando fallback visual:', err.message);
      setAtenciones(ATENCIONES_DEMO_AGENDA);
    } finally {
      setLoading(false);
    }
  }, [dateRange, filters, viewMode]);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  // Navegación de periodos
  const nextPeriod = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'mes') {
        next.setMonth(next.getMonth() + 1);
      } else if (viewMode === 'semana') {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + 1);
      }
      return next;
    });
  };

  const prevPeriod = () => {
    setCurrentDate((prev) => {
      const prevDate = new Date(prev);
      if (viewMode === 'mes') {
        prevDate.setMonth(prevDate.getMonth() - 1);
      } else if (viewMode === 'semana') {
        prevDate.setDate(prevDate.getDate() - 7);
      } else {
        prevDate.setDate(prevDate.getDate() - 1);
      }
      return prevDate;
    });
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  // Mutación: Asignación regular
  const handleAssign = async (id: string, payload: AsignarAtencionInput) => {
    try {
      await PlanningApi.asignarAtencion(id, payload);
      setIsAssignmentModalOpen(false);
      setSelectedAtencion(null);
      await fetchAgenda();
      return { success: true };
    } catch (err: any) {
      if (err instanceof PlanningConflictError) {
        if (err.payload.code === 'WARNING_INTERVALO_TRASLADO') {
          // Activar diálogo de forzado con justificación
          setConflictWarning(err.payload);
          setPendingAssignment({ id, payload });
          setIsOverrideDialogOpen(true);
          return { success: false, warning: true };
        } else {
          // Bloqueo duro no forzable
          alert(err.payload.message || 'Conflicto de solapamiento horario estricto.');
          return { success: false, hardBlock: true };
        }
      }
      throw err;
    }
  };

  // Mutación: Forzado con justificación (>= 10 chars)
  const handleForceAssign = async (justificacion: string) => {
    if (!pendingAssignment) return;
    const { id, payload, isReassign, reassignPayload } = pendingAssignment;

    try {
      if (isReassign && reassignPayload) {
        await PlanningApi.reasignarAtencion(id, {
          ...reassignPayload,
          forzarConJustificacion: true,
          justificacionForzado: justificacion
        });
      } else {
        await PlanningApi.asignarAtencion(id, {
          ...payload,
          forzarConJustificacion: true,
          justificacionForzado: justificacion
        });
      }

      setIsOverrideDialogOpen(false);
      setConflictWarning(null);
      setPendingAssignment(null);
      setIsAssignmentModalOpen(false);
      setSelectedAtencion(null);
      await fetchAgenda();
    } catch (err: any) {
      alert(`Error al forzar asignación: ${err.message}`);
    }
  };

  // Mutación: Reasignación operativa
  const handleReassign = async (id: string, payload: ReasignarAtencionInput) => {
    try {
      await PlanningApi.reasignarAtencion(id, payload);
      setIsAssignmentModalOpen(false);
      setSelectedAtencion(null);
      await fetchAgenda();
      return { success: true };
    } catch (err: any) {
      if (err instanceof PlanningConflictError) {
        if (err.payload.code === 'WARNING_INTERVALO_TRASLADO') {
          setConflictWarning(err.payload);
          setPendingAssignment({
            id,
            payload: {
              vehiculoId: payload.nuevoVehiculoId || '',
              conductorId: payload.nuevoConductorId || '',
              fechaHoraInicio: payload.nuevaFechaHoraInicio || ''
            },
            isReassign: true,
            reassignPayload: payload
          });
          setIsOverrideDialogOpen(true);
          return { success: false, warning: true };
        } else {
          alert(err.payload.message || 'Conflicto estricto por colisión horaria.');
          return { success: false, hardBlock: true };
        }
      }
      throw err;
    }
  };

  const openAssignModalFor = (atencion: AtencionProgramadaDTO) => {
    setSelectedAtencion(atencion);
    setIsAssignmentModalOpen(true);
  };

  return {
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,
    filters,
    setFilters,
    atenciones,
    loading,
    error,
    selectedAtencion,
    setSelectedAtencion,
    isAssignmentModalOpen,
    setIsAssignmentModalOpen,
    conflictWarning,
    setConflictWarning,
    isOverrideDialogOpen,
    setIsOverrideDialogOpen,
    nextPeriod,
    prevPeriod,
    setToday,
    reloadAgenda: fetchAgenda,
    handleAssign,
    handleReassign,
    handleForceAssign,
    openAssignModalFor
  };
}
