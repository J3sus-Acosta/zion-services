import React, { useState } from 'react';
import { Check, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface ChecklistRetornoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompletar: (datos: {
    kilometrajeFinal: number;
    horometroFinal: number;
    herramientasCompletas: boolean;
    danosReportados: boolean;
    observaciones: string;
  }) => void;
  kilometrajeInicial?: number;
  patente?: string;
}

export const ChecklistRetornoModal: React.FC<ChecklistRetornoModalProps> = ({
  isOpen,
  onClose,
  onCompletar,
  kilometrajeInicial = 142500,
  patente = 'RVFL-92'
}) => {
  const [kilometrajeFinal, setKilometrajeFinal] = useState<number>(kilometrajeInicial + 85);
  const [horometroFinal, setHorometroFinal] = useState<number>(4186);
  const [herramientasCompletas, setHerramientasCompletas] = useState<boolean>(true);
  const [danosReportados, setDanosReportados] = useState<boolean>(false);
  const [observaciones, setObservaciones] = useState<string>('');
  const [errorKm, setErrorKm] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (kilometrajeFinal < kilometrajeInicial) {
      setErrorKm(`El kilometraje final (${kilometrajeFinal} km) no puede ser inferior al inicial (${kilometrajeInicial} km).`);
      return;
    }

    onCompletar({
      kilometrajeFinal,
      horometroFinal,
      herramientasCompletas,
      danosReportados,
      observaciones
    });
    onClose();
  };

  const distanciaRecorrida = kilometrajeFinal - kilometrajeInicial;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Retorno a Base</Badge>
              <h2 className="font-bold text-base sm:text-lg text-foreground">
                Checklist de Cierre y Retorno · {patente}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inspección final de arribo a Planta Zion previo a las 4 fotos de cierre
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {errorKm && (
            <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorKm}</span>
            </div>
          )}

          {/* Odómetros */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Kilometraje Final (KM)</label>
              <input
                type="number"
                required
                value={kilometrajeFinal}
                onChange={(e) => setKilometrajeFinal(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono font-medium"
              />
              <span className="text-[11px] text-muted-foreground">
                Distancia en viaje: <strong className="text-foreground">{distanciaRecorrida >= 0 ? distanciaRecorrida : 0} KM</strong>
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Horómetro Final (HRS)</label>
              <input
                type="number"
                required
                value={horometroFinal}
                onChange={(e) => setHorometroFinal(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono font-medium"
              />
            </div>
          </div>

          {/* Chequeo de Herramientas y Daños */}
          <div className="space-y-3 pt-2 border-t border-border">
            <Card className="border-border">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Inventario de Herramientas y Cuñas</h4>
                  <p className="text-[11px] text-muted-foreground">Mangueras, acoples, cuñas, gata y llaves completos</p>
                </div>
                <Button
                  type="button"
                  variant={herramientasCompletas ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setHerramientasCompletas(!herramientasCompletas)}
                  className="text-xs"
                >
                  {herramientasCompletas ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Completo
                    </>
                  ) : (
                    'Faltantes'
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Novedad de Daños o Desgaste</h4>
                  <p className="text-[11px] text-muted-foreground">¿Se produjeron impactos, rayaduras o fallas en el servicio?</p>
                </div>
                <Button
                  type="button"
                  variant={danosReportados ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setDanosReportados(!danosReportados)}
                  className="text-xs"
                >
                  {danosReportados ? 'Sí, Con Daños' : 'Sin Novedad'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Observaciones */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Observaciones de Cierre de Jornada</label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Indique detalles de faena, estado del camión o novedades en descarga..."
              className="w-full p-2.5 rounded-lg border border-border bg-background text-xs resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="bg-primary font-semibold">
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              Guardar y Tomar Fotos de Retorno (4)
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
