import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import {
  Equipo,
  OperacionesAfectadasResponse,
  TransferenciaResultado
} from '../../types/fleet';
import { fleetApi, FleetApiError } from '../../services/fleetApi';
import {
  ArrowRightLeft,
  AlertCircle,
  Loader2,
  Calendar,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface FleetTransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  equipo: Equipo | null;
  onSuccess: (resultado: TransferenciaResultado) => void;
}

export const FleetTransferDialog: React.FC<FleetTransferDialogProps> = ({
  isOpen,
  onClose,
  equipo,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [operacionesData, setOperacionesData] = useState<OperacionesAfectadasResponse | null>(null);
  const [jornadasSeleccionadas, setJornadasSeleccionadas] = useState<string[]>([]);
  const [vehiculoDestinoId, setVehiculoDestinoId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !equipo) {
      setOperacionesData(null);
      setJornadasSeleccionadas([]);
      setVehiculoDestinoId('');
      setErrorMessage(null);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    fleetApi
      .obtenerOperacionesAfectadas(equipo.id)
      .then((res) => {
        setOperacionesData(res);
        // Seleccionar todas las jornadas activas por defecto
        setJornadasSeleccionadas(res.jornadas.map((j) => j.id));
        // Seleccionar primer candidato sin conflicto
        const primerDisponible = res.candidatos.find((c) => !c.tieneConflicto);
        if (primerDisponible) {
          setVehiculoDestinoId(primerDisponible.id);
        }
      })
      .catch((err) => {
        setErrorMessage(err?.message || 'Error al obtener operaciones afectadas.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, equipo]);

  if (!equipo) return null;

  const jornadas = operacionesData?.jornadas || [];
  const candidatos = operacionesData?.candidatos || [];
  const candidatosSinConflicto = candidatos.filter((c) => !c.tieneConflicto);

  const toggleJornada = (id: string) => {
    setJornadasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (jornadasSeleccionadas.length === jornadas.length) {
      setJornadasSeleccionadas([]);
    } else {
      setJornadasSeleccionadas(jornadas.map((j) => j.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!vehiculoDestinoId) {
      setErrorMessage('Debe seleccionar un equipo de destino habilitado.');
      return;
    }

    if (jornadasSeleccionadas.length === 0) {
      setErrorMessage('Debe seleccionar al menos una jornada para transferir.');
      return;
    }

    setSubmitting(true);
    try {
      const resultado = await fleetApi.transferir(equipo.id, {
        vehiculoDestinoId,
        jornadaIds: jornadasSeleccionadas.length === jornadas.length ? undefined : jornadasSeleccionadas
      });
      onSuccess(resultado);
      onClose();
    } catch (err: any) {
      if (err instanceof FleetApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(err?.message || 'Error al transferir operaciones.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled =
    loading ||
    submitting ||
    !vehiculoDestinoId ||
    jornadasSeleccionadas.length === 0 ||
    jornadas.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-primary">
          <ArrowRightLeft className="h-5 w-5" />
          <span>Reasignar Operaciones: {equipo.patente}</span>
        </div>
      }
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="text-sm text-muted-foreground leading-relaxed">
          Transfiera las jornadas activas del equipo <strong className="font-mono text-foreground">{equipo.patente}</strong> hacia otra unidad operativa habilitada sin modificar el estado actual del equipo origen.
        </div>

        {loading ? (
          <div
            className="p-8 flex items-center justify-center gap-2.5 text-muted-foreground bg-muted/40 rounded-lg border border-border text-sm"
            aria-busy="true"
          >
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Cargando jornadas activas y unidades habilitadas...</span>
          </div>
        ) : jornadas.length === 0 ? (
          <div className="p-6 text-center bg-muted/40 rounded-lg border border-border text-muted-foreground text-sm space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <div>No hay jornadas activas ni pendientes en este equipo para reasignar.</div>
          </div>
        ) : (
          <>
            {/* Lista de Jornadas con selección */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Jornadas Activas Disponibles ({jornadas.length})
                </span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-primary hover:underline font-medium cursor-pointer"
                >
                  {jornadasSeleccionadas.length === jornadas.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-muted/40 rounded-lg border border-border">
                {jornadas.map((j) => {
                  const isChecked = jornadasSeleccionadas.includes(j.id);
                  return (
                    <label
                      key={j.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-primary/10 border-primary/40'
                          : 'bg-background border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleJornada(j.id)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary/40"
                        />
                        <div>
                          <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            <span>Jornada: {j.estado}</span>
                            <span className="text-muted-foreground font-normal">
                              ({new Date(j.fechaInicio).toLocaleDateString()})
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Conductor: {j.conductor.nombre} ({j.conductor.rut})
                          </div>
                        </div>
                      </div>

                      {j.ordenes && j.ordenes.length > 0 && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {j.ordenes.length} OS vinculada(s)
                        </Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Selector de Unidad Destino */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="transfer-destino">
                Unidad de Reemplazo Habilitada *
              </label>
              {candidatos.length === 0 ? (
                <div className="p-2.5 rounded-lg bg-destructive/15 text-destructive text-xs">
                  No existen otros equipos habilitados en el sistema para recibir operaciones.
                </div>
              ) : (
                <select
                  id="transfer-destino"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={vehiculoDestinoId}
                  onChange={(e) => setVehiculoDestinoId(e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="">-- Seleccionar unidad destino --</option>
                  {candidatos.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={c.tieneConflicto}
                    >
                      {c.patente} - {c.marca} {c.modelo} ({c.tipoEquipo}, {c.capacidadEstanqueM3} m³)
                      {c.tieneConflicto ? ' [SOLAPA EN HORARIO]' : ' [DISPONIBLE]'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {candidatosSinConflicto.length === 0 && candidatos.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Todos los equipos habilitados presentan conflicto de horario con las jornadas seleccionadas.</span>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitDisabled}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                <span>Reasignando...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-1.5" />
                <span>Transferir ({jornadasSeleccionadas.length}) Jornada(s)</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
