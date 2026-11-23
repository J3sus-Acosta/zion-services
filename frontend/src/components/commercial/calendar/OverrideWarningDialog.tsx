import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { ConflictWarningPayload } from '../../../types/planning';
import { Modal } from '../../ui/Modal';

interface OverrideWarningDialogProps {
  isOpen: boolean;
  warningPayload: ConflictWarningPayload | null;
  onConfirmForce: (justificacion: string) => Promise<void>;
  onCancel: () => void;
}

export const OverrideWarningDialog: React.FC<OverrideWarningDialogProps> = ({
  isOpen,
  warningPayload,
  onConfirmForce,
  onCancel
}) => {
  const [justificacion, setJustificacion] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen || !warningPayload) return null;

  const detalles = warningPayload.detalles;
  const margenMin = detalles?.margenMinutos ?? 120;
  const horasMargen = (margenMin / 60).toFixed(1);
  const esValido = justificacion.trim().length >= 10;

  const handleForzar = async () => {
    if (!esValido) return;
    setSubmitting(true);
    try {
      await onConfirmForce(justificacion.trim());
      setJustificacion('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Advertencia de Intervalo de Traslado Intercomunal"
      maxWidth="600px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-primary)' }}>
        {/* Banner de advertencia */}
        <div
          style={{
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}
        >
          <AlertTriangle size={24} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--warning)' }}>
              Margen de Tiempo Inferior al Estándar Operacional (4 Horas)
            </h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {warningPayload.message}
            </p>
          </div>
        </div>

        {/* Detalle del intervalo */}
        {detalles && (
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              fontSize: '0.8125rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Recurso en conflicto:</span>
              <strong style={{ color: 'var(--accent-primary)' }}>
                {detalles.tipoRecurso}: {detalles.recursoIdentificador}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Margen disponible:</span>
              <strong style={{ color: 'var(--warning)' }}>
                {margenMin} minutos ({horasMargen} h) — Exigido: 240 minutos (4.0 h)
              </strong>
            </div>

            {detalles.faenaAnterior && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Faena anterior:</span>
                <span>
                  Folio {detalles.faenaAnterior.folio} en {detalles.faenaAnterior.comuna} (Término estimado: {new Date(detalles.faenaAnterior.termino).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
              </div>
            )}
          </div>
        )}

        {/* Campo de Justificación Obligatoria */}
        <div className="form-group">
          <label className="form-label" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={15} style={{ color: 'var(--warning)' }} />
              Justificación de la Asignación Forzada (Obligatoria):
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: esValido ? 'var(--success)' : 'var(--text-muted)'
              }}
            >
              {justificacion.trim().length}/10 caracteres mín.
            </span>
          </label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Explique el motivo por el cual es viable la faena (ej. Faenas contiguas en misma comuna, conductor de apoyo en ruta, cliente autorizó ventana extendida...)"
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
          />
        </div>

        {/* Botones de acción */}
        <div
          className="modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-color)'
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar y Ajustar Horario
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleForzar}
            disabled={!esValido || submitting}
            style={{
              background: esValido ? 'var(--warning)' : undefined,
              borderColor: esValido ? 'var(--warning)' : undefined,
              color: '#0f172a'
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Forzando...</span>
              </>
            ) : (
              <span>Autorizar con Justificación</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
