import React, { useState } from 'react';
import {
  CHECKLIST_ITEMS_INICIALES,
  CATEGORIAS_INFO,
  CategoriaChecklist,
  ItemChecklist
} from '../../data/checklist-items';
import { ShieldCheck, AlertOctagon, CheckCircle2, ChevronRight, Check, X, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';

interface ChecklistSalidaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompletar: (items: ItemChecklist[], kilometraje: number, horometro: number) => void;
  patente?: string;
}

export const ChecklistSalidaModal: React.FC<ChecklistSalidaModalProps> = ({
  isOpen,
  onClose,
  onCompletar,
  patente = 'RVFL-92'
}) => {
  const [items, setItems] = useState<ItemChecklist[]>(CHECKLIST_ITEMS_INICIALES);
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaChecklist>('MOTOR_FLUIDOS');
  const [kilometraje, setKilometraje] = useState<number>(142500);
  const [horometro, setHorometro] = useState<number>(4180);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  if (!isOpen) return null;

  const categoriasKeys = Object.keys(CATEGORIAS_INFO) as CategoriaChecklist[];

  // Marcar todos los ítems de una categoría como BUENO
  const marcarCategoriaConforme = (cat: CategoriaChecklist) => {
    setItems((prev) =>
      prev.map((item) => (item.categoria === cat ? { ...item, estado: 'BUENO' } : item))
    );
  };

  // Cambiar estado de un ítem individual
  const cambiarEstadoItem = (id: string, nuevoEstado: ItemChecklist['estado']) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, estado: nuevoEstado } : item))
    );
  };

  // Contabilizar ítems críticos en fallo
  const fallasCriticas = items.filter((item) => item.esCritico && item.estado === 'MALO');

  const validarYContinuar = () => {
    setErrorValidacion(null);

    if (fallasCriticas.length > 0) {
      setErrorValidacion(
        `No se puede autorizar la salida: Se detectaron ${fallasCriticas.length} fallas críticas que comprometen la seguridad.`
      );
      return;
    }

    onCompletar(items, kilometraje, horometro);
    onClose();
  };

  const itemsDeCategoria = items.filter((i) => i.categoria === categoriaActiva);
  const conformesEnCategoria = itemsDeCategoria.filter((i) => i.estado === 'BUENO').length;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Cabecera */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">F-GMT-MAN-004</Badge>
              <h2 className="font-bold text-base sm:text-lg text-foreground">
                Checklist Preoperacional de Salida · {patente}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              80 ítems de inspección obligatoria antes de iniciar ruta desde Planta Zion
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Inputs de Odómetro y Horómetro */}
        <div className="px-4 py-2.5 bg-muted/20 border-b border-border grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Kilometraje Inicial:</span>
            <input
              type="number"
              value={kilometraje}
              onChange={(e) => setKilometraje(Number(e.target.value))}
              className="h-8 w-32 px-2 rounded-md border border-border bg-background text-sm font-mono font-medium"
            />
            <span className="text-xs text-muted-foreground">KM</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Horómetro Inicial:</span>
            <input
              type="number"
              value={horometro}
              onChange={(e) => setHorometro(Number(e.target.value))}
              className="h-8 w-28 px-2 rounded-md border border-border bg-background text-sm font-mono font-medium"
            />
            <span className="text-xs text-muted-foreground">HRS</span>
          </div>
        </div>

        {/* Alerta de Fallas Críticas */}
        {fallasCriticas.length > 0 && (
          <div className="p-3 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 shrink-0" />
            <span className="font-semibold">
              Atención: {fallasCriticas.length} ítem(s) crítico(s) marcado(s) como MALO. La salida del camión quedará bloqueada.
            </span>
          </div>
        )}

        {/* Selector de Categorías (Pestañas) */}
        <div className="flex overflow-x-auto border-b border-border bg-muted/10 p-1.5 gap-1.5 scrollbar-none">
          {categoriasKeys.map((catKey, index) => {
            const cat = CATEGORIAS_INFO[catKey];
            const catItems = items.filter((i) => i.categoria === catKey);
            const tieneFallaCritica = catItems.some((i) => i.esCritico && i.estado === 'MALO');
            const totalConformes = catItems.filter((i) => i.estado === 'BUENO').length;
            const esActiva = categoriaActiva === catKey;

            return (
              <button
                key={catKey}
                onClick={() => setCategoriaActiva(catKey)}
                className={`flex-1 min-w-[140px] px-3 py-2 rounded-xl text-left transition-all border ${
                  esActiva
                    ? 'bg-card border-primary shadow-sm text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Cat. {index + 1}</span>
                  {tieneFallaCritica ? (
                    <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                  ) : totalConformes === cat.total ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : null}
                </div>
                <div className="text-[11px] truncate font-medium mt-0.5">{cat.titulo.split('. ')[1]}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {totalConformes}/{cat.total} Conformes
                </div>
              </button>
            );
          })}
        </div>

        {/* Contenido de la Categoría Activa */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {CATEGORIAS_INFO[categoriaActiva].titulo}
              </h3>
              <p className="text-xs text-muted-foreground">
                {CATEGORIAS_INFO[categoriaActiva].descripcion} ({conformesEnCategoria}/
                {CATEGORIAS_INFO[categoriaActiva].total} revisados)
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => marcarCategoriaConforme(categoriaActiva)}
              className="text-xs border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-500 font-semibold"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Marcar Categoría Conforme
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {itemsDeCategoria.map((item) => (
              <Card
                key={item.id}
                className={`border transition-all ${
                  item.estado === 'MALO'
                    ? 'border-destructive bg-destructive/5'
                    : item.estado === 'REGULAR'
                    ? 'border-yellow-500/40 bg-yellow-500/5'
                    : 'border-border'
                }`}
              >
                <CardContent className="p-3 flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-muted-foreground">#{item.numero}</span>
                      <span className="text-xs font-medium text-foreground leading-snug">{item.nombre}</span>
                    </div>
                    {item.esCritico && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0 uppercase">
                        Crítico
                      </Badge>
                    )}
                  </div>

                  {/* Selector de Estado */}
                  <div className="flex items-center gap-1 shrink-0 bg-muted/60 p-0.5 rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => cambiarEstadoItem(item.id, 'BUENO')}
                      className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                        item.estado === 'BUENO' ? 'bg-emerald-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => cambiarEstadoItem(item.id, 'REGULAR')}
                      className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                        item.estado === 'REGULAR' ? 'bg-yellow-500 text-black shadow-xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      R
                    </button>
                    <button
                      type="button"
                      onClick={() => cambiarEstadoItem(item.id, 'MALO')}
                      className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                        item.estado === 'MALO' ? 'bg-destructive text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      M
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Total General: <span className="font-semibold text-foreground">{items.filter((i) => i.estado === 'BUENO').length}/80 conformes</span>
          </div>

          {errorValidacion && (
            <p className="text-xs text-destructive font-medium">{errorValidacion}</p>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" onClick={onClose} size="sm">
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={validarYContinuar}
              disabled={fallasCriticas.length > 0}
              className="bg-primary font-semibold"
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              Guardar y Continuar a Fotos (4)
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
