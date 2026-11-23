import React, { useState, useEffect, useMemo } from 'react';
import {
  Equipo,
  TipoEquipo,
  TransferenciaResultado
} from '../../types/fleet';
import { fleetApi, FleetApiError } from '../../services/fleetApi';
import { useAuth } from '../../context/AuthContext';
import { FleetFormModal } from './FleetFormModal';
import { FleetStatusDialog } from './FleetStatusDialog';
import { FleetTransferDialog } from './FleetTransferDialog';
import {
  Truck,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Edit2,
  CheckCircle,
  AlertTriangle,
  ArrowRightLeft,
  ShieldAlert,
  Droplets,
  Wind,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Car,
  Wrench
} from 'lucide-react';

export const FleetManagementPanel: React.FC = () => {
  const { usuario } = useAuth();

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');

  // Modales
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [equipoAEditar, setEquipoAEditar] = useState<Equipo | null>(null);

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [equipoEstado, setEquipoEstado] = useState<Equipo | null>(null);
  const [modoEstado, setModoEstado] = useState<'HABILITAR' | 'DESHABILITAR'>('DESHABILITAR');

  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [equipoTransfer, setEquipoTransfer] = useState<Equipo | null>(null);

  // Alerta de éxito temporal
  const [bannerExito, setBannerExito] = useState<string | null>(null);

  const cargarFlota = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fleetApi.listar();
      setEquipos(data);
    } catch (err: any) {
      if (err instanceof FleetApiError) {
        setError(err.message);
      } else {
        setError(err?.message || 'Error al conectar con el servicio de flota.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarFlota();
  }, []);

  // Filtrado reactivo en cliente (después de traer el catálogo base)
  const equiposFiltrados = useMemo(() => {
    return equipos.filter((eq) => {
      // Filtro tipo
      if (filtroTipo !== 'TODOS' && eq.tipoEquipo !== filtroTipo) {
        return false;
      }
      // Filtro estado
      if (filtroEstado !== 'TODOS' && eq.estado !== filtroEstado) {
        return false;
      }
      // Búsqueda de texto sobre patente, marca, modelo
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim();
        const coincidePatente = eq.patente.toLowerCase().includes(query);
        const coincideMarca = eq.marca.toLowerCase().includes(query);
        const coincideModelo = eq.modelo.toLowerCase().includes(query);
        if (!coincidePatente && !coincideMarca && !coincideModelo) {
          return false;
        }
      }
      return true;
    });
  }, [equipos, filtroTipo, filtroEstado, busqueda]);

  // KPIs
  const conteoTotal = equipos.length;
  const conteoHabilitados = equipos.filter((e) => e.estado === 'HABILITADO').length;
  const conteoDeshabilitados = equipos.filter((e) => e.estado === 'DESHABILITADO').length;
  const conteoSeguridad = equipos.filter((e) => e.origenBloqueo === 'CHECKLIST_SEGURIDAD').length;

  // Handlers
  const handleNuevoEquipo = () => {
    setEquipoAEditar(null);
    setIsFormModalOpen(true);
  };

  const handleEditarEquipo = (equipo: Equipo) => {
    setEquipoAEditar(equipo);
    setIsFormModalOpen(true);
  };

  const handleAbrirStatusDialog = (equipo: Equipo, modo: 'HABILITAR' | 'DESHABILITAR') => {
    setEquipoEstado(equipo);
    setModoEstado(modo);
    setIsStatusDialogOpen(true);
  };

  const handleAbrirTransferDialog = (equipo: Equipo) => {
    setEquipoTransfer(equipo);
    setIsTransferDialogOpen(true);
  };

  const handleFormSuccess = (equipoGuardado: Equipo) => {
    setBannerExito(`Equipo ${equipoGuardado.patente} guardado exitosamente.`);
    setTimeout(() => setBannerExito(null), 6000);
    cargarFlota();
  };

  const handleStatusSuccess = (res: TransferenciaResultado) => {
    let msg = 'Estado del equipo actualizado correctamente.';
    if (res.transferencia) {
      msg = `Equipo deshabilitado y ${res.transferencia.jornadasTransferidas.length} jornada(s) reasignada(s) a la unidad ${res.transferencia.destino.patente}.`;
    }
    setBannerExito(msg);
    setTimeout(() => setBannerExito(null), 8000);
    cargarFlota();
  };

  const handleTransferSuccess = (res: TransferenciaResultado) => {
    const destinoPatente = res.transferencia?.destino?.patente || 'unidad de reemplazo';
    const total = res.transferencia?.jornadasTransferidas?.length || 0;
    setBannerExito(`Transferencia completada: ${total} jornada(s) reasignada(s) exitosamente a ${destinoPatente}.`);
    setTimeout(() => setBannerExito(null), 8000);
    cargarFlota();
  };

  const renderTipoIcon = (tipo: TipoEquipo) => {
    switch (tipo) {
      case 'CAMION':
        return <Truck size={15} style={{ color: 'var(--accent-primary)' }} />;
      case 'CAMIONETA':
        return <Car size={15} style={{ color: 'var(--info)' }} />;
      case 'MAQUINARIA':
        return <Wrench size={15} style={{ color: 'var(--warning)' }} />;
      default:
        return <Truck size={15} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Cabecera del Panel */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Truck size={26} style={{ color: 'var(--accent-primary)' }} />
              <span>Gestión de Flota y Unidades</span>
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Catálogo de camiones, camionetas y maquinaria, control de operatividad y transferencias atómicas de jornada.
            </p>
          </div>

          <div className="btn-group">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={cargarFlota}
              disabled={loading}
              title="Recargar catálogo de equipos"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Actualizar</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNuevoEquipo}
            >
              <Plus size={16} />
              <span>Nuevo Equipo</span>
            </button>
          </div>
        </div>

        {/* Banner de Éxito Temporal */}
        {bannerExito && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--success-bg)',
              color: 'var(--success)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{bannerExito}</span>
          </div>
        )}
      </div>

      {/* 2. Resumen KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px'
        }}
      >
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Catálogo
          </span>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {conteoTotal}
          </span>
        </div>

        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--success)', textTransform: 'uppercase', fontWeight: 600 }}>
            Habilitados / Despachables
          </span>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>
            {conteoHabilitados}
          </span>
        </div>

        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--danger)', textTransform: 'uppercase', fontWeight: 600 }}>
            Deshabilitados
          </span>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--danger)' }}>
            {conteoDeshabilitados}
          </span>
        </div>

        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--warning)', textTransform: 'uppercase', fontWeight: 600 }}>
            Bloqueos Seguridad F-GMT
          </span>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning)' }}>
            {conteoSeguridad}
          </span>
        </div>
      </div>

      {/* 3. Barra de Búsqueda y Filtros */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 260px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            type="text"
            className="form-input"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por patente, marca o modelo..."
            style={{ paddingLeft: '36px' }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Tipo:</span>
            <select
              className="form-select"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{ width: 'auto', minWidth: '130px' }}
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="CAMION">Camión</option>
              <option value="CAMIONETA">Camioneta</option>
              <option value="MAQUINARIA">Maquinaria</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Estado:</span>
            <select
              className="form-select"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={{ width: 'auto', minWidth: '150px' }}
            >
              <option value="TODOS">Todos los estados</option>
              <option value="HABILITADO">Solo Habilitados</option>
              <option value="DESHABILITADO">Solo Deshabilitados</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Estados: LOADING, ERROR, EMPTY, DATA */}
      {loading ? (
        <div
          role="status"
          aria-busy="true"
          style={{
            padding: '60px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)'
          }}
        >
          <RefreshCw size={32} className="animate-spin text-primary" style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '0.925rem' }}>Cargando catálogo de flota SATEM...</span>
        </div>
      ) : error ? (
        <div
          role="alert"
          style={{
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            textAlign: 'center'
          }}
        >
          <AlertCircle size={36} />
          <div style={{ fontWeight: 600, fontSize: '1rem' }}>No se pudo cargar la flota</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '460px' }}>
            {error}
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={cargarFlota}
            style={{ marginTop: '8px' }}
          >
            <RefreshCw size={15} />
            <span>Reintentar</span>
          </button>
        </div>
      ) : equiposFiltrados.length === 0 ? (
        <div
          style={{
            padding: '50px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            textAlign: 'center'
          }}
        >
          <Truck size={42} style={{ color: 'var(--text-muted)' }} />
          <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
            No se encontraron equipos
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '420px' }}>
            {equipos.length === 0
              ? 'No hay unidades registradas en la flota institucional. Registre el primer equipo con el botón "Nuevo Equipo".'
              : 'No hay unidades que coincidan con los criterios de búsqueda y filtros seleccionados.'}
          </div>
          {equipos.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setFiltroTipo('TODOS');
                setFiltroEstado('TODOS');
                setBusqueda('');
              }}
              style={{ marginTop: '6px' }}
            >
              <span>Restablecer Filtros</span>
            </button>
          )}
        </div>
      ) : (
        /* VISTA DATA */
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block">
            <div className="table-container">
              <table className="satem-table">
                <thead>
                  <tr>
                    <th>Patente</th>
                    <th>Tipo</th>
                    <th>Marca / Modelo</th>
                    <th>Año</th>
                    <th>Capacidad</th>
                    <th>Equipamiento</th>
                    <th>Estado</th>
                    <th>Motivo / Origen</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {equiposFiltrados.map((eq) => {
                    const esHabilitado = eq.estado === 'HABILITADO';
                    const esChecklist = eq.origenBloqueo === 'CHECKLIST_SEGURIDAD';

                    return (
                      <tr key={eq.id}>
                        {/* Patente */}
                        <td>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              letterSpacing: '0.05em',
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-primary)'
                            }}
                          >
                            {eq.patente}
                          </span>
                        </td>

                        {/* Tipo */}
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}>
                            {renderTipoIcon(eq.tipoEquipo)}
                            <span>{eq.tipoEquipo}</span>
                          </div>
                        </td>

                        {/* Marca / Modelo */}
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{eq.marca}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{eq.modelo}</div>
                        </td>

                        {/* Año */}
                        <td>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            {eq.anio}
                          </span>
                        </td>

                        {/* Capacidad */}
                        <td>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {Number(eq.capacidadEstanqueM3).toFixed(2)} m³
                          </span>
                        </td>

                        {/* Equipamiento Especial */}
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {eq.equipoHidrojet && (
                              <span
                                className="badge badge-info"
                                title="Equipado con Hidrojet de alta presión"
                                style={{ fontSize: '0.7rem', padding: '2px 7px' }}
                              >
                                <Droplets size={12} />
                                <span>Hidrojet</span>
                              </span>
                            )}
                            {eq.equipoVacio && (
                              <span
                                className="badge badge-neutral"
                                title="Equipado con Sistema de Vacío"
                                style={{ fontSize: '0.7rem', padding: '2px 7px' }}
                              >
                                <Wind size={12} />
                                <span>Vacío</span>
                              </span>
                            )}
                            {!eq.equipoHidrojet && !eq.equipoVacio && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estándar</span>
                            )}
                          </div>
                        </td>

                        {/* Estado */}
                        <td>
                          {esHabilitado ? (
                            <span className="badge badge-success">
                              <CheckCircle2 size={13} />
                              <span>HABILITADO</span>
                            </span>
                          ) : (
                            <span className="badge badge-danger">
                              <XCircle size={13} />
                              <span>DESHABILITADO</span>
                            </span>
                          )}
                        </td>

                        {/* Motivo / Origen */}
                        <td style={{ maxWidth: '200px' }}>
                          {!esHabilitado ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                {esChecklist ? (
                                  <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                                    <ShieldAlert size={11} />
                                    <span>Seguridad F-GMT</span>
                                  </span>
                                ) : (
                                  <span className="badge badge-neutral" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                                    <span>Manual</span>
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-secondary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                                title={eq.motivoEstado || ''}
                              >
                                {eq.motivoEstado || 'Sin motivo registrado'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Operativo</span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {/* Editar */}
                            <button
                              type="button"
                              className="btn btn-icon"
                              onClick={() => handleEditarEquipo(eq)}
                              title="Editar características técnicas"
                              aria-label={`Editar equipo ${eq.patente}`}
                              style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', padding: '6px' }}
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* Reasignar Operaciones (si está deshabilitado) */}
                            {!esHabilitado && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleAbrirTransferDialog(eq)}
                                title="Reasignar operaciones y jornadas activas a otra unidad"
                                aria-label={`Reasignar operaciones del equipo ${eq.patente}`}
                                style={{ height: '32px', minHeight: '32px', padding: '4px 10px', fontSize: '0.75rem' }}
                              >
                                <ArrowRightLeft size={13} />
                                <span>Reasignar</span>
                              </button>
                            )}

                            {/* Cambiar Estado (Habilitar / Deshabilitar) */}
                            {esHabilitado ? (
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => handleAbrirStatusDialog(eq, 'DESHABILITAR')}
                                title="Deshabilitar equipo"
                                aria-label={`Deshabilitar equipo ${eq.patente}`}
                                style={{ height: '32px', minHeight: '32px', padding: '4px 10px', fontSize: '0.75rem' }}
                              >
                                <AlertTriangle size={13} />
                                <span>Deshabilitar</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleAbrirStatusDialog(eq, 'HABILITAR')}
                                title="Habilitar equipo"
                                aria-label={`Habilitar equipo ${eq.patente}`}
                                style={{
                                  height: '32px',
                                  minHeight: '32px',
                                  padding: '4px 10px',
                                  fontSize: '0.75rem',
                                  color: 'var(--success)',
                                  borderColor: 'rgba(16, 185, 129, 0.4)'
                                }}
                              >
                                <CheckCircle size={13} />
                                <span>Habilitar</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="md:hidden flex flex-col gap-3">
            {equiposFiltrados.map((eq) => {
              const esHabilitado = eq.estado === 'HABILITADO';
              const esChecklist = eq.origenBloqueo === 'CHECKLIST_SEGURIDAD';

              return (
                <div
                  key={eq.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.925rem',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        {eq.patente}
                      </span>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {renderTipoIcon(eq.tipoEquipo)}
                        <span>{eq.tipoEquipo}</span>
                      </div>
                    </div>

                    {esHabilitado ? (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                        HABILITADO
                      </span>
                    ) : (
                      <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                        DESHABILITADO
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {eq.marca} {eq.modelo}{' '}
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem' }}>({eq.anio})</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div>
                      Capacidad: <strong>{Number(eq.capacidadEstanqueM3).toFixed(2)} m³</strong>
                    </div>
                    {eq.equipoHidrojet && (
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                        Hidrojet
                      </span>
                    )}
                    {eq.equipoVacio && (
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                        Vacío
                      </span>
                    )}
                  </div>

                  {!esHabilitado && (
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.775rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        {esChecklist ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                            <ShieldAlert size={10} />
                            Seguridad F-GMT
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                            Manual
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {eq.motivoEstado || 'Sin motivo registrado'}
                      </div>
                    </div>
                  )}

                  {/* Acciones Mobile */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleEditarEquipo(eq)}
                      style={{ flex: '1 1 auto', height: '36px', minHeight: '36px', fontSize: '0.8rem' }}
                    >
                      <Edit2 size={14} />
                      <span>Editar</span>
                    </button>

                    {!esHabilitado && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleAbrirTransferDialog(eq)}
                        style={{ flex: '1 1 auto', height: '36px', minHeight: '36px', fontSize: '0.8rem' }}
                      >
                        <ArrowRightLeft size={14} />
                        <span>Reasignar</span>
                      </button>
                    )}

                    {esHabilitado ? (
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => handleAbrirStatusDialog(eq, 'DESHABILITAR')}
                        style={{ flex: '1 1 auto', height: '36px', minHeight: '36px', fontSize: '0.8rem' }}
                      >
                        <AlertTriangle size={14} />
                        <span>Deshabilitar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleAbrirStatusDialog(eq, 'HABILITAR')}
                        style={{
                          flex: '1 1 auto',
                          height: '36px',
                          minHeight: '36px',
                          fontSize: '0.8rem',
                          color: 'var(--success)',
                          borderColor: 'rgba(16, 185, 129, 0.4)'
                        }}
                      >
                        <CheckCircle size={14} />
                        <span>Habilitar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 5. Modales y Diálogos */}
      <FleetFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEquipoAEditar(null);
        }}
        equipo={equipoAEditar}
        onSuccess={handleFormSuccess}
      />

      <FleetStatusDialog
        isOpen={isStatusDialogOpen}
        onClose={() => {
          setIsStatusDialogOpen(false);
          setEquipoEstado(null);
        }}
        equipo={equipoEstado}
        modo={modoEstado}
        userRole={usuario?.rol}
        onSuccess={handleStatusSuccess}
      />

      <FleetTransferDialog
        isOpen={isTransferDialogOpen}
        onClose={() => {
          setIsTransferDialogOpen(false);
          setEquipoTransfer(null);
        }}
        equipo={equipoTransfer}
        onSuccess={handleTransferSuccess}
      />
    </div>
  );
};
