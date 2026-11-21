import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string, blob: Blob) => void;
  titulo?: string;
  subtitulo?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  titulo = 'Captura de Fotografía',
  subtitulo = 'Alinee el camión dentro del recuadro'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean>(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageSizeKb, setImageSizeKb] = useState<number>(0);
  const [cameraLoading, setCameraLoading] = useState<boolean>(true);

  // Iniciar stream de cámara WebRTC
  useEffect(() => {
    if (!isOpen) {
      detenerCamara();
      setCapturedImage(null);
      return;
    }

    iniciarCamara();

    return () => {
      detenerCamara();
    };
  }, [isOpen]);

  const iniciarCamara = async () => {
    setCameraLoading(true);
    setHasCameraAccess(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC no soportado');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraLoading(false);
    } catch {
      // Si falla WebRTC (permisos denegados, HTTP, etc.), activar modo fallback nativo
      setHasCameraAccess(false);
      setCameraLoading(false);
    }
  };

  const detenerCamara = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Captura mediante Video Canvas con compresión a < 500 KB
  const tomarFotoCanvas = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');

    // Redimensionar a máximo 1280px para optimizar peso
    const MAX_WIDTH = 1280;
    const scale = Math.min(1, MAX_WIDTH / (video.videoWidth || 1280));
    canvas.width = (video.videoWidth || 1280) * scale;
    canvas.height = (video.videoHeight || 720) * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Compresión JPEG con calidad 0.82
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    setCapturedImage(dataUrl);

    // Calcular peso estimado
    const stringLength = dataUrl.length - 'data:image/jpeg;base64,'.length;
    const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.562489633438312;
    setImageSizeKb(Math.round(sizeInBytes / 1024));

    detenerCamara();
  };

  // Fallback con <input type="file" capture="environment">
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setCapturedImage(compressedDataUrl);
          setImageSizeKb(Math.round(file.size / 1024));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const confirmarFoto = () => {
    if (!capturedImage) return;

    // Convertir dataURL a Blob
    const arr = capturedImage.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });

    onCapture(capturedImage, blob);
    onClose();
  };

  const reintentar = () => {
    setCapturedImage(null);
    iniciarCamara();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-base sm:text-lg">{titulo}</h3>
            <p className="text-xs text-muted-foreground">{subtitulo}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Visor de Cámara o Previsualización */}
        <div className="relative flex-1 bg-black min-h-[320px] sm:min-h-[420px] flex items-center justify-center overflow-hidden">
          {capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img src={capturedImage} alt="Captura" className="max-h-[70vh] w-auto object-contain" />
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="bg-black/70 text-white border-0 text-xs">
                  {imageSizeKb} KB · Comprimida
                </Badge>
              </div>
            </div>
          ) : hasCameraAccess ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Marco guía de encuadre perimetral */}
              <div className="absolute inset-8 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                <span className="text-[10px] text-white/80 uppercase font-mono tracking-wider">Encuadre Perimetral</span>
                <span className="text-[10px] text-white/80 uppercase font-mono tracking-wider text-right">Zion Fleet</span>
              </div>
            </>
          ) : (
            /* Fallback a cámara nativa */
            <div className="p-6 text-center space-y-4 max-w-sm">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Cámara WebRTC no disponible</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Puede utilizar la cámara nativa de su dispositivo móvil o tablet con el botón inferior.
                </p>
              </div>
              <Button
                variant="default"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Abrir Cámara del Dispositivo
              </Button>
            </div>
          )}

          {cameraLoading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Iniciando visor...
            </div>
          )}
        </div>

        {/* Input oculto para fallback nativo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Barra de Acciones */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-3">
          {capturedImage ? (
            <>
              <Button variant="outline" onClick={reintentar}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Repetir Foto
              </Button>
              <Button variant="default" onClick={confirmarFoto} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Check className="h-4 w-4 mr-1.5" />
                Usar esta Fotografía
              </Button>
            </>
          ) : hasCameraAccess ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                title="Usar selector nativo del sistema"
              >
                <ImageIcon className="h-4 w-4 mr-1.5" />
                Cámara Nativa
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={tomarFotoCanvas}
                className="px-6 rounded-full font-semibold"
              >
                <Camera className="h-5 w-5 mr-2" />
                Capturar Foto
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose} className="w-full">
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
