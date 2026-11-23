import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import {
  Equipo,
  OperacionesAfectadasResponse,
  TransferenciaResultado
} from '../../types/fleet';
import { fleetApi, FleetApiError } from '../../services/fleetApi';
import {
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';

interface FleetStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  equipo: Equipo | null;
  modo: 'HABILITAR' | 'DESHABILITAR';
  userRole?: string;
  onSuccess: (resultado: TransferenciaResultado) => void;
}

export const FleetStatusDialog: React.FC<FleetStatusDialogProps> = ({
  isOpen,
  onClose,
  equipo,
  modo,
  userRole,
  onSuccess
}) => {
  const [motivo, setMotivo] = useState('');
  const [vehiculoDestinoId, setVehiculoDestinoId] = useState('');
  const [loadingOps, setLoadingOps] = useState(false);
  const [operacionesData, setOperacionesData] = useState<OperacionesAfectadasResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Regla R1: Solo ADMIN y SUPERADMIN pueden levantar bloqueos de CHECKLIST_SEGURIDAD
  const esBloqueoSeguridad = equipo?.origenBloqueo === 'CHECKLIST_SEGURIDAD';
  const puedeLevantarBloqueo =
    !esBloqueoSeguridad || (userRole === 'SUPERADMIN' || userRole === 'ADMIN');

  useEffect(() => {
    if (!isOpen || !equipo) {
      setMotivo('');
      setVehiculoDestinoId('');
      setOperacionesData(null);
      setErrorMessage(null);
      return;
    }

    setMotivo('');
    setVehiculoDestinoId('');
    setErrorMessage(null);

    if (modo === 'DESHABILITAR') {
      setLoadingOps(true);
      fleetApi
        .obtenerOperacionesAfectadas(equipo.id)
        .then((res) => {
          setOperacionesData(res);
          // Si hay candidatos disponibles sin conflicto, preseleccionar el primero
          const primerDisponible = res.candidatos.find((c) => !c.tieneConflicto);
          if (primerDisponible) {
            setVehiculoDestinoId(primerDisponible.id);
          }
        })
        .catch((err) => {
          setErrorMessage(err?.message || 'Error al consultar operaciones activas del equipo.');
        })
        .finally(() => {
          setLoadingOps(false);
        });
    }
  }, [isOpen, equipo, modo]);

  if (!equipo) return null;

  const jornadasActivas = operacionesData?.jornadas || [];
  const tieneJornadasActivas = jornadasActivas.length > 0;
  const candidatos = operacionesData?.candidatos || [];
  const candidatosSinConflicto = candidatos.filter((c) => !c.tieneConflicto);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (modo === 'DESHABILITAR') {
      const cleanMotivo = motivo.trim();
      if (cleanMotivo.length < 5) {
        setErrorMessage('El motivo de deshabilitación es obligatorio y debe tener al menos 5 caracteres.');
        return;
      }

      if (tieneJornadasActivas && !vehiculoDestinoId) {
        setErrorMessage('Es obligatorio seleccionar un equipo habilitado de reemplazo para transferir las operaciones activas.');
        return;
      }

      setSubmitting(true);
      try {
        const resultado = await fleetApi.cambiarEstado(equipo.id, {
          estado: 'DESHABILITADO',
          motivo: cleanMotivo,
          vehiculoDestinoId: tieneJornadasActivas ? vehiculoDestinoId : undefined
        });
        onSuccess(resultado);
        onClose();
      } catch (err: any) {
        if (err instanceof FleetApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage(err?.message || 'Error al cambiar estado del equipo.');
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      // HABILITAR
      if (!puedeLevantarBloqueo) {
        setErrorMessage('Solo usuarios con rol SUPERADMIN o ADMIN pueden levantar un bloqueo originado por Checklist de Seguridad.');
        return;
      }

      setSubmitting(true);
      try {
        const resultado = await fleetApi.cambiarEstado(equipo.id, {
          estado: 'HABILITADO'
        });
        onSuccess(resultado);
        onClose();
      } catch (err: any) {
        if (err instanceof FleetApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage(err?.message || 'Error al habilitar el equipo.');
        }
      } finally {
        setSubmitting(false);
      }
    }
  };

  const isDisableButtonDisabled =
    submitting ||
    loadingOps ||
    motivo.trim().length < 5 ||
    (tieneJornadasActivas && (!vehiculoDestinoId || candidatosSinConflicto.length === 0));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        modo === 'DESHABILITAR' ? (
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Deshabilitar Equipo: {equipo.patente}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="h-5 w-5" />
            <span>Habilitar Equipo: {equipo.patente}</span>
          </div>
        )
      }
      maxWidth="620px"
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

        {modo === 'HABILITAR' ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              ¿Está seguro de que desea habilitar el equipo <strong className="font-mono">{equipo.patente}</strong> ({equipo.marca} {equipo.modelo})?
            </p>

            {esBloqueoSeguridad && (
              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-amber-400 text-sm">
                    Bloqueo originado por Checklist de Seguridad F-GMT
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Motivo registrado: {equipo.motivoEstado || 'Falla crítica detectada durante inspección.'}
                  </div>
                  {!puedeLevantarBloqueo && (
                    <div className="text-xs text-destructive font-medium mt-2">
                      ⚠️ Su rol actual ({userRole}) no tiene facultades para levantar este bloqueo. Se requiere autorización de ADMIN o SUPERADMIN (Regla R1).
                    </div>
                  )}
                </div>
              </div>
            )}

            {!esBloqueoSeguridad && equipo.motivoEstado && (
              <div className="p-3 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground">
                <strong className="text-foreground">Motivo anterior:</strong> {equipo.motivoEstado}
              </div>
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
                disabled={submitting || !puedeLevantarBloqueo}
                title={!puedeLevantarBloqueo ? 'Solo ADMIN o SUPERADMIN pueden levantar este bloqueo' : 'Habilitar equipo'}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Habilitando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    <span>Confirmar Habilitación</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* MODO DESHABILITAR */
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Al deshabilitar el equipo <strong className="font-mono text-foreground">{equipo.patente}</strong> ({equipo.marca} {equipo.modelo}), quedará inhabilitado para nuevos despachos y operaciones.
            </p>

            {/* Motivo de deshabilitación */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="status-motivo">
                Motivo de Deshabilitación * (mínimo 5 caracteres)
              </label>
              <textarea
                id="status-motivo"
                className="w-full p-3 rounded-lg border border-border bg-background text-sm resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Indique la justificación técnica u operativa (ej: Mantención preventiva 50.000 km, falla en toma de fuerza)..."
                minLength={5}
                maxLength={500}
                required
                disabled={submitting}
                rows={3}
                autoFocus
              />
              <div className="text-[11px] text-muted-foreground text-right">
                {motivo.length}/500 caracteres
              </div>
            </div>

            {/* Estado de carga de operaciones */}
            {loadingOps ? (
              <div
                className="p-6 flex items-center justify-center gap-2.5 text-muted-foreground bg-muted/40 rounded-lg border border-border text-sm"
                aria-busy="true"
              >
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Analizando operaciones y jornadas activas...</span>
              </div>
            ) : tieneJornadasActivas ? (
              /* ALERTA DE TRANSFERENCIA OBLIGATORIA */
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 space-y-3">
                <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Transferencia Obligatoria Requerida</span>
                </div>

                <div className="text-xs text-foreground leading-relaxed">
                  Este equipo tiene <strong>{jornadasActivas.length} jornada(s) activa(s)</strong> (PROGRAMADA / EN CURSO). De acuerdo con la normativa operativa (R7), para deshabilitarlo debe seleccionar obligatoriamente un equipo habilitado de reemplazo:
                </div>

                {/* Lista de jornadas activas */}
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {jornadasActivas.map((j) => (
                    <div
                      key={j.id}
                      className="p-2.5 rounded bg-background/80 border border-destructive/20 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-foreground">Jornada: {j.estado}</span>
                        <span className="text-muted-foreground">({new Date(j.fechaInicio).toLocaleDateString()})</span>
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Conductor: <strong className="text-foreground">{j.conductor.nombre}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selector Obligatorio de Reemplazo */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-foreground" htmlFor="status-destino">
                    Seleccione Equipo Habilitado de Reemplazo *
                  </label>
                  {candidatos.length === 0 ? (
                    <div className="p-2.5 rounded bg-destructive/15 text-destructive text-xs">
                      No existen otros equipos habilitados en el sistema. Debe registrar o habilitar un equipo antes de deshabilitar este.
                    </div>
                  ) : candidatosSinConflicto.length === 0 ? (
                    <div className="p-2.5 rounded bg-destructive/15 text-destructive text-xs">
                      Todos los equipos habilitados presentan conflicto de horario con las jornadas activas.
                    </div>
                  ) : (
                    <select
                      id="status-destino"
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={vehiculoDestinoId}
                      onChange={(e) => setVehiculoDestinoId(e.target.value)}
                      required
                      disabled={submitting}
                    >
                      <option value="">-- Seleccionar equipo de reemplazo --</option>
                      {candidatos.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          disabled={c.tieneConflicto}
                        >
                          {c.patente} - {c.marca} {c.modelo} ({c.tipoEquipo}, {c.capacidadEstanqueM3} m³)
                          {c.tieneConflicto ? ' [CONFLICTO DE HORARIO]' : ' [DISPONIBLE]'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ) : (
              /* Sin operaciones activas */
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>No hay jornadas activas asociadas. El equipo se deshabilitará de inmediato.</span>
              </div>
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
                variant="destructive"
                size="sm"
                disabled={isDisableButtonDisabled}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-1.5" />
                    <span>Confirmar Deshabilitación</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
