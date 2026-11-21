import { useState, useEffect } from 'react';

export interface GpsLocation {
  latitud: number;
  longitud: number;
  precisionMts: number;
  timestamp: string;
  velocidadKmh?: number | null;
}

export type GpsStatus = 'ACTIVO' | 'BUSCANDO' | 'SIN_PERMISO' | 'ERROR';

export function useGpsTracker(autoStart: boolean = true) {
  const [location, setLocation] = useState<GpsLocation | null>({
    latitud: -33.4372,
    longitud: -70.6506,
    precisionMts: 8,
    timestamp: new Date().toISOString()
  });
  const [status, setStatus] = useState<GpsStatus>('BUSCANDO');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!autoStart || !navigator.geolocation) {
      if (!navigator.geolocation) {
        setStatus('ERROR');
        setErrorMsg('Geolocalización no soportada en este navegador.');
      }
      return;
    }

    let watchId: number;

    try {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setStatus('ACTIVO');
          setErrorMsg(null);
          setLocation({
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
            precisionMts: Math.round(position.coords.accuracy),
            timestamp: new Date(position.timestamp).toISOString(),
            velocidadKmh: position.coords.speed ? Math.round(position.coords.speed * 3.6) : null
          });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setStatus('SIN_PERMISO');
            setErrorMsg('Permiso de GPS denegado por el usuario.');
          } else {
            setStatus('BUSCANDO');
            setErrorMsg('Esperando señal satelital GPS...');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    } catch {
      setStatus('ERROR');
    }

    return () => {
      if (watchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [autoStart]);

  const registrarHitoGps = async (ordenServicioId: string, hito: string) => {
    if (!location) return;

    try {
      await fetch('http://localhost:3000/api/jornadas/jornada-01/geolocalizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          latitud: location.latitud,
          longitud: location.longitud,
          precisionMts: location.precisionMts,
          ordenServicioId,
          estadoTramo: hito
        })
      });
    } catch {}
  };

  return {
    location,
    status,
    errorMsg,
    registrarHitoGps
  };
}
