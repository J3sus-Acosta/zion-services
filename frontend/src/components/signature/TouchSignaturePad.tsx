import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Eraser, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

export interface SignatureData {
  firmaDataUrl: string;
  encargadoNombre: string;
  encargadoApellido: string;
  encargadoRut: string;
}

export interface TouchSignaturePadProps {
  onConfirm: (data: SignatureData) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  isSubmitting?: boolean;
}

export const TouchSignaturePad: React.FC<TouchSignaturePadProps> = ({
  onConfirm,
  onCancel,
  title = 'Autorización Digital de Faena',
  subtitle = 'El encargado del cliente debe ingresar sus antecedentes y firmar con trazo en pantalla.',
  isSubmitting = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [rut, setRut] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inicializar canvas y configurar resolución HD para pantallas retina/táctiles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#10b981'; // Zion Emerald
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasDrawn(true);
    setErrorMsg(null);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    isDrawing.current = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // Ignorar si el puntero ya fue liberado
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    if (!nombre.trim()) {
      setErrorMsg('El Nombre del encargado es obligatorio.');
      return;
    }
    if (!apellido.trim()) {
      setErrorMsg('El Apellido del encargado es obligatorio.');
      return;
    }
    if (!rut.trim() || rut.trim().length < 7) {
      setErrorMsg('El RUT del encargado es obligatorio (ej: 12.345.678-9).');
      return;
    }
    if (!hasDrawn) {
      setErrorMsg('Debe estampar su firma manuscrita en el recuadro digital.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onConfirm({
      firmaDataUrl: dataUrl,
      encargadoNombre: nombre.trim(),
      encargadoApellido: apellido.trim(),
      encargadoRut: rut.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-zinc-100">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <PenTool className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">{title}</h2>
              <p className="text-xs text-zinc-400">{subtitle}</p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Campos obligatorios de identidad */}
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Nombre Encargado <span className="text-emerald-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Marcelo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Apellido Encargado <span className="text-emerald-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Bravo Salas"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              RUT Encargado <span className="text-emerald-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: 12.345.678-9"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Área de trazo táctil HTML5 Canvas */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <span>Trazo Manuscrito en Pantalla</span>
              <span className="text-emerald-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Eraser className="h-3.5 w-3.5" />
              Limpiar firma
            </button>
          </div>

          <div className="relative rounded-lg border border-dashed border-zinc-700 bg-zinc-900/60 p-1">
            <canvas
              ref={canvasRef}
              className="h-44 w-full cursor-crosshair rounded bg-zinc-950"
              style={{ touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
            {!hasDrawn && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
                <PenTool className="h-6 w-6 mb-1 opacity-40" />
                <span className="text-xs">Firme aquí con el dedo o lápiz óptico</span>
              </div>
            )}
          </div>
        </div>

        {/* Alerta de validación */}
        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Botones de acción */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-800 pt-4">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !hasDrawn || !nombre.trim() || !apellido.trim() || !rut.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? 'Registrando...' : 'Confirmar y Autorizar'}
          </Button>
        </div>
      </div>
    </div>
  );
};
