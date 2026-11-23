import React, { useState, useEffect, useRef } from 'react';
import { Building2, Search, ChevronDown, Check, X, RefreshCw } from 'lucide-react';
import { EmpresaCliente } from '../../types/cliente';
import { ClienteApiService } from '../../services/clienteApi';

export interface EmpresaSelectProps {
  value?: string;
  onChange: (empresaId: string, empresa?: EmpresaCliente) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
  allowClear?: boolean;
}

export const EmpresaSelect: React.FC<EmpresaSelectProps> = ({
  value,
  onChange,
  disabled = false,
  error,
  className = '',
  placeholder = 'Seleccione una Empresa Cliente...',
  allowClear = false
}) => {
  const [empresas, setEmpresas] = useState<EmpresaCliente[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<EmpresaCliente | null>(null);

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

  // Cargar empresas clientes
  const fetchEmpresas = async (query = '') => {
    setLoading(true);
    try {
      const res = await ClienteApiService.listarEmpresas({
        search: query.trim() || undefined,
        limit: 50,
        activo: true
      });
      setEmpresas(res.empresas);
      if (value) {
        const found = res.empresas.find((e) => e.id === value);
        if (found) setEmpresaSeleccionada(found);
      }
    } catch {
      // Fallback estático para testing offline
      const fallbackList: EmpresaCliente[] = [
        {
          id: 'emp-01',
          rut: '76.123.456-7',
          razonSocial: 'Sociedad Minera Los Andes SpA',
          nombreFantasia: 'Minera Los Andes',
          activo: true
        },
        {
          id: 'emp-02',
          rut: '77.890.123-K',
          razonSocial: 'Bravo Energy Chile S.A.',
          nombreFantasia: 'Bravo Energy',
          activo: true
        },
        {
          id: 'emp-horse',
          rut: '78.456.789-2',
          razonSocial: 'Horse Chile Logística Industrial Ltda.',
          nombreFantasia: 'Horse Logistics',
          activo: true
        }
      ];
      setEmpresas(fallbackList);
      if (value) {
        const found = fallbackList.find((e) => e.id === value);
        if (found) setEmpresaSeleccionada(found);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas(searchTerm);
  }, []);

  // Debounce en búsqueda interactiva
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        fetchEmpresas(searchTerm);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  // Si cambia el value externo, buscar el objeto correspondiente
  useEffect(() => {
    if (!value) {
      setEmpresaSeleccionada(null);
      return;
    }
    const found = empresas.find((e) => e.id === value);
    if (found) {
      setEmpresaSeleccionada(found);
    } else {
      // Intentar obtenerlo directamente
      ClienteApiService.obtenerEmpresaPorId(value)
        .then((emp) => setEmpresaSeleccionada(emp))
        .catch(() => {});
    }
  }, [value, empresas]);

  const handleSelect = (emp: EmpresaCliente) => {
    setEmpresaSeleccionada(emp);
    onChange(emp.id, emp);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEmpresaSeleccionada(null);
    onChange('', undefined);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Botón trigger del selector */}
      <div
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[38px] px-3 py-1.5 flex items-center justify-between gap-2 rounded-lg border bg-background text-xs cursor-pointer select-none transition-colors ${
          disabled
            ? 'opacity-60 bg-muted cursor-not-allowed border-border'
            : isOpen
            ? 'border-primary ring-1 ring-primary'
            : error
            ? 'border-destructive'
            : 'border-border hover:border-border/80'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          {empresaSeleccionada ? (
            <div className="truncate">
              <span className="font-semibold text-foreground">{empresaSeleccionada.razonSocial}</span>
              <span className="text-[11px] font-mono text-muted-foreground ml-1.5">
                ({empresaSeleccionada.rut})
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowClear && empresaSeleccionada && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-muted-foreground hover:text-foreground rounded"
              title="Limpiar selección"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}

      {/* Menú desplegable con búsqueda predictiva */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95">
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por RUT o Razón Social..."
                autoFocus
                className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {loading && (
                <RefreshCw className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-border/40 p-1">
            {loading && empresas.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Cargando empresas...</div>
            ) : empresas.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No se encontraron empresas clientes
              </div>
            ) : (
              empresas.map((emp) => {
                const isSelected = empresaSeleccionada?.id === emp.id;
                return (
                  <div
                    key={emp.id}
                    onClick={() => handleSelect(emp)}
                    className={`p-2.5 rounded-md text-xs cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-primary/15 text-primary font-medium'
                        : 'hover:bg-muted/60 text-foreground'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{emp.razonSocial}</div>
                      <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{emp.rut}</span>
                        {emp.nombreFantasia && <span>• {emp.nombreFantasia}</span>}
                        {emp.comuna && <span>• {emp.comuna}</span>}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
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
