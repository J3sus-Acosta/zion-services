import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Equipo, TipoEquipo, CrearEquipoInput, EditarEquipoInput } from '../../types/fleet';
import { fleetApi, FleetApiError } from '../../services/fleetApi';
import { Truck, AlertCircle, Save, Loader2 } from 'lucide-react';

interface FleetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipo?: Equipo | null;
  onSuccess: (equipo: Equipo) => void;
}

const currentYear = new Date().getFullYear();
const PATENTE_REGEX = /^[A-Z0-9-]{4,10}$/;

export const FleetFormModal: React.FC<FleetFormModalProps> = ({
  isOpen,
  onClose,
  equipo,
  onSuccess
}) => {
  const isEditing = Boolean(equipo);

  const [patente, setPatente] = useState('');
  const [tipoEquipo, setTipoEquipo] = useState<TipoEquipo>('CAMION');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState<number>(currentYear);
  const [capacidadEstanqueM3, setCapacidadEstanqueM3] = useState<number>(0);
  const [equipoHidrojet, setEquipoHidrojet] = useState(false);
  const [equipoVacio, setEquipoVacio] = useState(false);
  const [observaciones, setObservaciones] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (equipo) {
      setPatente(equipo.patente || '');
      setTipoEquipo(equipo.tipoEquipo || 'CAMION');
      setMarca(equipo.marca || '');
      setModelo(equipo.modelo || '');
      setAnio(equipo.anio || currentYear);
      setCapacidadEstanqueM3(Number(equipo.capacidadEstanqueM3) || 0);
      setEquipoHidrojet(Boolean(equipo.equipoHidrojet));
      setEquipoVacio(Boolean(equipo.equipoVacio));
      setObservaciones(equipo.observaciones || '');
    } else {
      setPatente('');
      setTipoEquipo('CAMION');
      setMarca('');
      setModelo('');
      setAnio(currentYear);
      setCapacidadEstanqueM3(0);
      setEquipoHidrojet(false);
      setEquipoVacio(false);
      setObservaciones('');
    }
    setFormError(null);
  }, [equipo, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPatente = patente.trim().toUpperCase();
    if (!PATENTE_REGEX.test(cleanPatente)) {
      setFormError('La patente debe contener entre 4 y 10 caracteres alfanuméricos (se admiten guiones).');
      return;
    }

    if (!marca.trim()) {
      setFormError('La marca es obligatoria.');
      return;
    }

    if (!modelo.trim()) {
      setFormError('El modelo es obligatorio.');
      return;
    }

    const anioNum = Number(anio);
    if (isNaN(anioNum) || anioNum < 1980 || anioNum > currentYear + 1) {
      setFormError(`El año debe ser un número entero entre 1980 y ${currentYear + 1}.`);
      return;
    }

    const capNum = Number(capacidadEstanqueM3);
    if (isNaN(capNum) || capNum < 0) {
      setFormError('La capacidad de estanque no puede ser negativa.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && equipo) {
        const payload: EditarEquipoInput = {};
        if (cleanPatente !== equipo.patente) payload.patente = cleanPatente;
        if (tipoEquipo !== equipo.tipoEquipo) payload.tipoEquipo = tipoEquipo;
        if (marca.trim() !== equipo.marca) payload.marca = marca.trim();
        if (modelo.trim() !== equipo.modelo) payload.modelo = modelo.trim();
        if (anioNum !== equipo.anio) payload.anio = anioNum;
        if (capNum !== Number(equipo.capacidadEstanqueM3)) payload.capacidadEstanqueM3 = capNum;
        if (equipoHidrojet !== equipo.equipoHidrojet) payload.equipoHidrojet = equipoHidrojet;
        if (equipoVacio !== equipo.equipoVacio) payload.equipoVacio = equipoVacio;
        if ((observaciones.trim() || null) !== (equipo.observaciones || null)) {
          payload.observaciones = observaciones.trim() || null;
        }

        if (Object.keys(payload).length === 0) {
          onClose();
          setIsSubmitting(false);
          return;
        }

        const actualizado = await fleetApi.editar(equipo.id, payload);
        onSuccess(actualizado);
      } else {
        const payload: CrearEquipoInput = {
          patente: cleanPatente,
          tipoEquipo,
          marca: marca.trim(),
          modelo: modelo.trim(),
          anio: anioNum,
          capacidadEstanqueM3: capNum,
          equipoHidrojet,
          equipoVacio,
          observaciones: observaciones.trim() || null
        };

        const nuevo = await fleetApi.crear(payload);
        onSuccess(nuevo);
      }
      onClose();
    } catch (err: any) {
      if (err instanceof FleetApiError) {
        if (err.code === 'FLEET_PLATE_DUPLICATE') {
          setFormError(`La patente ${cleanPatente} ya se encuentra registrada en otro equipo.`);
        } else if (err.details && err.details.length > 0) {
          setFormError(err.details.map((d) => d.mensaje).join('. '));
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError(err?.message || 'Error al guardar el equipo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck style={{ width: '20px', height: '20px', color: 'var(--accent-primary)' }} />
          <span>{isEditing ? `Editar Equipo ${equipo?.patente}` : 'Registrar Nuevo Equipo'}</span>
        </div>
      }
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {formError && (
          <div
            role="alert"
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{formError}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {/* Patente */}
          <div className="form-group">
            <label className="form-label" htmlFor="fleet-patente">
              Patente / Matrícula *
            </label>
            <input
              id="fleet-patente"
              type="text"
              className="form-input"
              value={patente}
              onChange={(e) => setPatente(e.target.value.toUpperCase())}
              placeholder="Ej: AB1234 ó AA-BB-11"
              maxLength={10}
              required
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {/* Tipo de Equipo */}
          <div className="form-group">
            <label className="form-label" htmlFor="fleet-tipo">
              Tipo de Equipo *
            </label>
            <select
              id="fleet-tipo"
              className="form-select"
              value={tipoEquipo}
              onChange={(e) => setTipoEquipo(e.target.value as TipoEquipo)}
              disabled={isSubmitting}
            >
              <option value="CAMION">CAMION (Camión cisterna / faena)</option>
              <option value="CAMIONETA">CAMIONETA (Vehículo liviano / soporte)</option>
              <option value="MAQUINARIA">MAQUINARIA (Maquinaria pesada)</option>
              <option value="OTRO">OTRO (Equipamiento auxiliar)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {/* Marca */}
          <div className="form-group">
            <label className="form-label" htmlFor="fleet-marca">
              Marca *
            </label>
            <input
              id="fleet-marca"
              type="text"
              className="form-input"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Ej: Mercedes-Benz, Scania, Ford"
              maxLength={60}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Modelo */}
          <div className="form-group">
            <label className="form-label" htmlFor="fleet-modelo">
              Modelo *
            </label>
            <input
              id="fleet-modelo"
              type="text"
              className="form-input"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Ej: Actros 2645, Ranger XLT"
              maxLength={60}
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {/* Año */}
          <div className="form-group">
            <label className="form-label" htmlFor="fleet-anio">
              Año de Fabricación *
            </label>
            <input
              id="fleet-anio"
              type="number"
              className="form-input"
              value={anio}
              onChange={(e) => setAnio(parseInt(e.target.value, 10))}
              min={1980}
              max={currentYear + 1}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Capacidad Estanque (m³) */}
          <div className="form-group">
            <label className="form-label" htmlFor="fleet-capacidad">
              Capacidad Estanque (m³) *
            </label>
            <input
              id="fleet-capacidad"
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              value={capacidadEstanqueM3}
              onChange={(e) => setCapacidadEstanqueM3(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Equipamiento Especial (Hidrojet / Vacío) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={equipoHidrojet}
              onChange={(e) => setEquipoHidrojet(e.target.checked)}
              disabled={isSubmitting}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
            <span>Equipamiento Hidrojet (Alta Presión)</span>
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={equipoVacio}
              onChange={(e) => setEquipoVacio(e.target.checked)}
              disabled={isSubmitting}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
            <span>Equipamiento de Vacío (Succión)</span>
          </label>
        </div>

        {/* Observaciones */}
        <div className="form-group">
          <label className="form-label" htmlFor="fleet-observaciones">
            Observaciones Adicionales
          </label>
          <textarea
            id="fleet-observaciones"
            className="form-textarea"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Información adicional relevante del equipo (máx 1000 caracteres)..."
            maxLength={1000}
            disabled={isSubmitting}
            rows={3}
          />
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{isEditing ? 'Guardar Cambios' : 'Registrar Equipo'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
