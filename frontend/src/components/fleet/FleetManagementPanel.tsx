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
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

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
        return <Truck className="h-4 w-4 text-primary shrink-0" />;
      case 'CAMIONETA':
        return <Car className="h-4 w-4 text-blue-400 shrink-0" />;
      case 'MAQUINARIA':
        return <Wrench className="h-4 w-4 text-amber-400 shrink-0" />;
      default:
        return <Truck className="h-4 w-4 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Cabecera del Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              <span>Gestión de Flota Operacional</span>
            </h1>
            <Badge variant="outline" className="text-xs font-mono border-primary/40 text-primary">
              Flota Zion Services
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Catálogo de camiones, camionetas y maquinaria, control de operatividad y transferencias atómicas de jornada.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={cargarFlota}
            disabled={loading}
            title="Recargar catálogo de equipos"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </Button>
          <Button size="sm" onClick={handleNuevoEquipo}>
            <Plus className="h-4 w-4" />
            <span>Nuevo Equipo</span>
          </Button>
        </div>
      </div>

      {/* Banner de Éxito Temporal */}
      {bannerExito && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2.5 animate-in fade-in-50 duration-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{bannerExito}</span>
        </div>
      )}

      {/* 2. Resumen KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium text-muted-foreground">
              Total Catálogo
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {conteoTotal}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Unidades registradas en flota
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase font-medium text-emerald-400">
                Habilitados / Despachables
              </CardDescription>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
                Activo
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-emerald-400">
              {conteoHabilitados}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Listos para asignación y ruta
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase font-medium text-destructive">
                Deshabilitados
              </CardDescription>
              <Badge variant="destructive" className="text-[10px]">
                Fuera de servicio
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-destructive">
              {conteoDeshabilitados}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            En mantención o detenidos
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase font-medium text-amber-400">
                Bloqueos Seguridad F-GMT
              </CardDescription>
              <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">
                Checklist
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-amber-400">
              {conteoSeguridad}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Requiere autorización admin (R1)
          </CardContent>
        </Card>
      </div>

      {/* 3. Barra de Búsqueda y Filtros */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por patente, marca o modelo..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Tipo:</span>
              <select
                className="h-9 px-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="TODOS">Todos los tipos</option>
                <option value="CAMION">Camión</option>
                <option value="CAMIONETA">Camioneta</option>
                <option value="MAQUINARIA">Maquinaria</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Estado:</span>
              <select
                className="h-9 px-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="TODOS">Todos los estados</option>
                <option value="HABILITADO">Solo Habilitados</option>
                <option value="DESHABILITADO">Solo Deshabilitados</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Estados: LOADING, ERROR, EMPTY, DATA */}
      {loading ? (
        <div
          role="status"
          aria-busy="true"
          className="p-16 flex flex-col items-center justify-center gap-3 bg-card rounded-xl border border-border text-muted-foreground"
        >
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Cargando catálogo de flota Zion Services...</span>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="p-10 flex flex-col items-center justify-center gap-3 bg-card rounded-xl border border-destructive/50 text-destructive text-center"
        >
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div className="font-semibold text-base text-foreground">No se pudo cargar la flota</div>
          <div className="text-sm text-muted-foreground max-w-md">{error}</div>
          <Button variant="outline" size="sm" onClick={cargarFlota} className="mt-2">
            <RefreshCw className="h-4 w-4" />
            <span>Reintentar</span>
          </Button>
        </div>
      ) : equiposFiltrados.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 bg-card rounded-xl border border-border text-muted-foreground text-center">
          <Truck className="h-12 w-12 text-muted-foreground/50" />
          <div className="font-semibold text-base text-foreground">No se encontraron equipos</div>
          <div className="text-sm text-muted-foreground max-w-md">
            {equipos.length === 0
              ? 'No hay unidades registradas en la flota institucional. Registre el primer equipo con el botón "Nuevo Equipo".'
              : 'No hay unidades que coincidan con los criterios de búsqueda y filtros seleccionados.'}
          </div>
          {equipos.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFiltroTipo('TODOS');
                setFiltroEstado('TODOS');
                setBusqueda('');
              }}
              className="mt-2"
            >
              <span>Restablecer Filtros</span>
            </Button>
          )}
        </div>
      ) : (
        /* VISTA DATA */
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block">
            <Card className="border-border bg-card shadow-sm overflow-hidden">
              <div className="table-container border-0 rounded-none">
                <table className="table zion-table">
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
                      <th className="text-right">Acciones</th>
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
                            <span className="font-mono font-bold text-xs px-2 py-1 rounded bg-muted border border-border text-foreground tracking-wider">
                              {eq.patente}
                            </span>
                          </td>

                          {/* Tipo */}
                          <td>
                            <div className="inline-flex items-center gap-1.5 text-xs">
                              {renderTipoIcon(eq.tipoEquipo)}
                              <span>{eq.tipoEquipo}</span>
                            </div>
                          </td>

                          {/* Marca / Modelo */}
                          <td>
                            <div className="font-semibold text-foreground text-sm">{eq.marca}</div>
                            <div className="text-xs text-muted-foreground">{eq.modelo}</div>
                          </td>

                          {/* Año */}
                          <td>
                            <span className="text-xs text-muted-foreground">
                              {eq.anio}
                            </span>
                          </td>

                          {/* Capacidad */}
                          <td>
                            <span className="text-xs font-semibold text-foreground">
                              {Number(eq.capacidadEstanqueM3).toFixed(2)} m³
                            </span>
                          </td>

                          {/* Equipamiento Especial */}
                          <td>
                            <div className="flex items-center gap-1.5">
                              {eq.equipoHidrojet && (
                                <Badge
                                  variant="outline"
                                  className="border-sky-500/30 text-sky-400 bg-sky-500/10 text-[10px] px-1.5 py-0.5 gap-1"
                                  title="Equipado con Hidrojet de alta presión"
                                >
                                  <Droplets className="h-3 w-3" />
                                  <span>Hidrojet</span>
                                </Badge>
                              )}
                              {eq.equipoVacio && (
                                <Badge
                                  variant="outline"
                                  className="border-border text-muted-foreground bg-muted text-[10px] px-1.5 py-0.5 gap-1"
                                  title="Equipado con Sistema de Vacío"
                                >
                                  <Wind className="h-3 w-3" />
                                  <span>Vacío</span>
                                </Badge>
                              )}
                              {!eq.equipoHidrojet && !eq.equipoVacio && (
                                <span className="text-xs text-muted-foreground">Estándar</span>
                              )}
                            </div>
                          </td>

                          {/* Estado */}
                          <td>
                            {esHabilitado ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-semibold text-[11px] gap-1 px-2 py-0.5"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>HABILITADO</span>
                              </Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                className="font-semibold text-[11px] gap-1 px-2 py-0.5"
                              >
                                <XCircle className="h-3 w-3" />
                                <span>DESHABILITADO</span>
                              </Badge>
                            )}
                          </td>

                          {/* Motivo / Origen */}
                          <td className="max-w-[200px]">
                            {!esHabilitado ? (
                              <div className="space-y-1">
                                {esChecklist ? (
                                  <Badge
                                    variant="outline"
                                    className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px] px-1.5 py-0 gap-1 font-normal"
                                  >
                                    <ShieldAlert className="h-3 w-3" />
                                    <span>Seguridad F-GMT</span>
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="border-border text-muted-foreground bg-muted text-[10px] px-1.5 py-0 font-normal"
                                  >
                                    <span>Manual</span>
                                  </Badge>
                                )}
                                <div
                                  className="text-xs text-muted-foreground truncate"
                                  title={eq.motivoEstado || ''}
                                >
                                  {eq.motivoEstado || 'Sin motivo registrado'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Operativo</span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {/* Editar */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditarEquipo(eq)}
                                title="Editar características técnicas"
                                aria-label={`Editar equipo ${eq.patente}`}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>

                              {/* Reasignar Operaciones (si está deshabilitado) */}
                              {!esHabilitado && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAbrirTransferDialog(eq)}
                                  title="Reasignar operaciones y jornadas activas a otra unidad"
                                  aria-label={`Reasignar operaciones del equipo ${eq.patente}`}
                                  className="h-8 text-xs gap-1.5"
                                >
                                  <ArrowRightLeft className="h-3 w-3" />
                                  <span>Reasignar</span>
                                </Button>
                              )}

                              {/* Cambiar Estado (Habilitar / Deshabilitar) */}
                              {esHabilitado ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAbrirStatusDialog(eq, 'DESHABILITAR')}
                                  title="Deshabilitar equipo"
                                  aria-label={`Deshabilitar equipo ${eq.patente}`}
                                  className="h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>Deshabilitar</span>
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAbrirStatusDialog(eq, 'HABILITAR')}
                                  title="Habilitar equipo"
                                  aria-label={`Habilitar equipo ${eq.patente}`}
                                  className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Habilitar</span>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="md:hidden flex flex-col gap-3">
            {equiposFiltrados.map((eq) => {
              const esHabilitado = eq.estado === 'HABILITADO';
              const esChecklist = eq.origenBloqueo === 'CHECKLIST_SEGURIDAD';

              return (
                <Card
                  key={eq.id}
                  className="border-border bg-card p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-muted border border-border text-foreground">
                        {eq.patente}
                      </span>
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {renderTipoIcon(eq.tipoEquipo)}
                        <span>{eq.tipoEquipo}</span>
                      </div>
                    </div>

                    {esHabilitado ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] px-1.5 py-0"
                      >
                        HABILITADO
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        DESHABILITADO
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm font-semibold text-foreground">
                    {eq.marca} {eq.modelo}{' '}
                    <span className="font-normal text-muted-foreground text-xs">({eq.anio})</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <div>
                      Capacidad: <strong className="text-foreground">{Number(eq.capacidadEstanqueM3).toFixed(2)} m³</strong>
                    </div>
                    {eq.equipoHidrojet && (
                      <Badge variant="outline" className="border-sky-500/30 text-sky-400 bg-sky-500/10 text-[10px] px-1.5 py-0">
                        Hidrojet
                      </Badge>
                    )}
                    {eq.equipoVacio && (
                      <Badge variant="outline" className="border-border text-muted-foreground bg-muted text-[10px] px-1.5 py-0">
                        Vacío
                      </Badge>
                    )}
                  </div>

                  {!esHabilitado && (
                    <div className="p-2.5 rounded-lg bg-muted/60 border border-border text-xs space-y-1">
                      <div className="flex items-center gap-1.5">
                        {esChecklist ? (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px] px-1 py-0">
                            <ShieldAlert className="h-2.5 w-2.5 mr-1 inline" />
                            Seguridad F-GMT
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-border text-muted-foreground bg-muted text-[10px] px-1 py-0">
                            Manual
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {eq.motivoEstado || 'Sin motivo registrado'}
                      </div>
                    </div>
                  )}

                  {/* Acciones Mobile */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditarEquipo(eq)}
                      className="flex-1 h-9 text-xs gap-1.5"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </Button>

                    {!esHabilitado && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAbrirTransferDialog(eq)}
                        className="flex-1 h-9 text-xs gap-1.5"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        <span>Reasignar</span>
                      </Button>
                    )}

                    {esHabilitado ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAbrirStatusDialog(eq, 'DESHABILITAR')}
                        className="flex-1 h-9 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Deshabilitar</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAbrirStatusDialog(eq, 'HABILITAR')}
                        className="flex-1 h-9 text-xs gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Habilitar</span>
                      </Button>
                    )}
                  </div>
                </Card>
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
