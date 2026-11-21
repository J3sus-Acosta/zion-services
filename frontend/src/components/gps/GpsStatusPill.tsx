import React from 'react';
import { GpsLocation, GpsStatus } from '../../services/gps-tracker';
import { Navigation, AlertCircle, Signal } from 'lucide-react';

interface GpsStatusPillProps {
  status: GpsStatus;
  location: GpsLocation | null;
}

export const GpsStatusPill: React.FC<GpsStatusPillProps> = ({ status, location }) => {
  if (status === 'ACTIVO' && location) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Navigation className="h-3 w-3" />
        <span>GPS Online</span>
        <span className="text-muted-foreground">· ±{location.precisionMts}m</span>
      </div>
    );
  }

  if (status === 'BUSCANDO') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
        <Signal className="h-3 w-3 animate-pulse" />
        <span>Sincronizando GPS...</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
      <AlertCircle className="h-3 w-3" />
      <span>GPS Standby</span>
    </div>
  );
};
