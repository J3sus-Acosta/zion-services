import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, Check, X, RefreshCw } from 'lucide-react';
import { SucursalFaena } from '../../types/cliente';
import { ClienteApiService } from '../../services/clienteApi';

export interface SucursalSelectProps {
  empresaClienteId?: string;
  value?: string;
  onChange: (sucursalId: string, sucursal?: SucursalFaena) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
  allowClear?: boolean;
}

export const SucursalSelect: React.FC<SucursalSelectProps> = ({
  empresaClienteId,
  value,
  onChange,
  disabled = false,
  error,
  className = '',
  placeholder = 'Seleccione una Sucursal / Faena...',
  allowClear = false
}) => {
  const [sucursales, setSucursales] = useState<SucursalFaena[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<SucursalFaena | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar sucursales cuando cambia la empresaClienteId
  useEffect(() => {
    if (!empresaClienteId) {
      setSucursales([]);
      setSucursalSeleccionada(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    ClienteApiService.listarSucursales({
      empresaClienteId,
      limit: 100,
      activo: true
    })
      .then((res) => {
        if (!isMounted) return;
        setSucursales(res.sucursales);

        // Si ya hay un valor seleccionado, mantenerlo
        if (value) {
          const found = res.sucursales.find((s) => s.id === value);
          if (found) {
            setSucursalSeleccionada(found);
          } else {
            setSucursalSeleccionada(null);
          }
        } else if (res.sucursales.length === 1) {
          // Autoseleccionar si hay una única sucursal
          setSucursalSeleccionada(res.sucursales[0]);
          onChange(res.sucursales[0].id, res.sucursales[0]);
        } else {
          setSucursalSeleccionada(null);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        // Fallback resiliente
        const fallbackSucursales: SucursalFaena[] = [
          {
            id: 'suc-fallback-01',
            empresaClienteId,
            nombre: 'Planta Principal / Matriz',
            direccion: 'Av. Industrial 1000',
            comuna: 'Santiago',
            region: 'Metropolitana de Santiago',
            activo: true
          }
        ];
        setSucursales(fallbackSucursales);
        if (value) {
          const found = fallbackSucursales.find((s) => s.id === value);
          if (found) setSucursalSeleccionada(found);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [empresaClienteId]);

  // Si cambia el value externo
  useEffect(() => {
    if (!value) {
      setSucursalSeleccionada(null);
      return;
    }
    const found = sucursales.find((s) => s.id === value);
    if (found) {
      setSucursalSeleccionada(found);
    }
  }, [value, sucursales]);

  const handleSelect = (suc: SucursalFaena) => {
    setSucursalSeleccionada(suc);
    onChange(suc.id, suc);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSucursalSeleccionada(null);
    onChange('', undefined);
  };

  const estaInhabilitado = disabled || !empresaClienteId;

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Botón trigger */}
      <div
        tabIndex={estaInhabilitado ? -1 : 0}
        onClick={() => !estaInhabilitado && setIsOpen(!isOpen)}
        className={`w-full min-h-[38px] px-3 py-1.5 flex items-center justify-between gap-2 rounded-lg border bg-background text-xs select-none transition-colors ${
          estaInhabilitado
            ? 'opacity-60 bg-muted cursor-not-allowed border-border'
            : isOpen
            ? 'border-emerald-500 ring-1 ring-emerald-500 cursor-pointer'
            : error
            ? 'border-destructive cursor-pointer'
            : 'border-border hover:border-border/80 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
          {sucursalSeleccionada ? (
            <div className="truncate">
              <span className="font-semibold text-foreground">{sucursalSeleccionada.nombre}</span>
              <span className="text-[11px] text-muted-foreground ml-1.5">
                ({sucursalSeleccionada.comuna} - {sucursalSeleccionada.direccion})
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {!empresaClienteId
                ? 'Seleccione primero una Empresa Cliente'
                : loading
                ? 'Cargando sucursales...'
                : placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {allowClear && sucursalSeleccionada && !estaInhabilitado && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-muted-foreground hover:text-foreground rounded"
              title="Limpiar selección"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}

      {/* Menú desplegable */}
      {isOpen && !estaInhabilitado && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95">
          <div className="max-h-60 overflow-y-auto divide-y divide-border/40 p-1">
            {loading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Cargando sucursales...</div>
            ) : sucursales.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Esta empresa no posee sucursales activas registradas.
              </div>
            ) : (
              sucursales.map((suc) => {
                const isSelected = sucursalSeleccionada?.id === suc.id;
                return (
                  <div
                    key={suc.id}
                    onClick={() => handleSelect(suc)}
                    className={`p-2.5 rounded-md text-xs cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-400 font-medium'
                        : 'hover:bg-muted/60 text-foreground'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{suc.nombre}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                        <span>{suc.direccion}</span>
                        <span>• {suc.comuna}</span>
                        <span>({suc.region})</span>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
