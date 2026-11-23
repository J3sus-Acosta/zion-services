import { z } from 'zod';
import { EstadoAtencionProgramada } from '@prisma/client';

// -------------------------------------------------------------
// 1. SOLICITUD MULTI-ATENCIÓN (Portal Clientes / Comercial)
// -------------------------------------------------------------

export const itemServicioSolicitudSchema = z.object({
  servicioCatalogoId: z.string().uuid({ message: 'ID de servicio de catálogo inválido' }),
  cantidad: z.number().int().min(1, { message: 'La cantidad mínima es 1' }).default(1),
  observaciones: z.string().max(500).optional()
});

export const itemAtencionSolicitudSchema = z.object({
  fechaHoraInicio: z.string().datetime({ message: 'Formato ISO 8601 requerido para fechaHoraInicio' }),
  duracionEstimadaMinutos: z.number().int().min(30).max(720).default(120),
  sucursalFaenaId: z.string().uuid({ message: 'ID de sucursal faena inválido' }).optional(),
  plantaDestinoId: z.string().uuid({ message: 'ID de planta destino inválido' }).optional(),
  servicios: z.array(itemServicioSolicitudSchema).min(1, { message: 'Debe seleccionar al menos un servicio' })
});

export const solicitudMultiAtencionSchema = z.object({
  empresaClienteId: z.string().uuid({ message: 'ID de empresa cliente inválido' }),
  sucursalFaenaId: z.string().uuid({ message: 'ID de sucursal faena inválido' }),
  tipoResiduo: z.string().min(2, { message: 'Debe especificar el tipo de residuo' }),
  descripcion: z.string().max(1000).optional(),
  cantidadEstimada: z.number().positive().optional(),
  unidadEstimada: z.enum(['KG', 'TON', 'M3', 'LITROS']).default('M3'),
  atenciones: z
    .array(itemAtencionSolicitudSchema)
    .min(1, { message: 'Debe ingresar al menos una fecha de atención' })
    .max(30, { message: 'Máximo 30 atenciones por solicitud multi-servicio' })
});

export type SolicitudMultiAtencionInput = z.infer<typeof solicitudMultiAtencionSchema>;
export type ItemAtencionSolicitudInput = z.infer<typeof itemAtencionSolicitudSchema>;
export type ItemServicioSolicitudInput = z.infer<typeof itemServicioSolicitudSchema>;

// -------------------------------------------------------------
// 2. ASIGNACIÓN OPERATIVA DE ATENCIÓN
// -------------------------------------------------------------

export const asignarAtencionSchema = z.object({
  vehiculoId: z.string().uuid({ message: 'Vehículo inválido' }),
  conductorId: z.string().uuid({ message: 'Conductor inválido' }),
  fechaHoraInicio: z.string().datetime({ message: 'Formato ISO requerido para fechaHoraInicio' }),
  duracionEstimadaMinutos: z.number().int().min(30).max(720).default(120),
  plantaDestinoId: z.string().uuid({ message: 'Planta destino inválida' }).optional(),
  jornadaId: z.string().uuid({ message: 'Jornada inválida' }).optional(),
  forzarConJustificacion: z.boolean().default(false),
  justificacionForzado: z.string().max(500).optional()
}).refine((data) => {
  if (data.forzarConJustificacion) {
    return !!data.justificacionForzado && data.justificacionForzado.trim().length >= 10;
  }
  return true;
}, {
  message: 'La justificación es obligatoria y debe contener al menos 10 caracteres al forzar una asignación',
  path: ['justificacionForzado']
});

export type AsignarAtencionInput = z.infer<typeof asignarAtencionSchema>;

// -------------------------------------------------------------
// 3. REASIGNACIÓN Y EDICIÓN DE ATENCIÓN PROGRAMADA
// -------------------------------------------------------------

export const reasignarAtencionSchema = z.object({
  nuevoVehiculoId: z.string().uuid({ message: 'Vehículo inválido' }).optional(),
  nuevoConductorId: z.string().uuid({ message: 'Conductor inválido' }).optional(),
  nuevaFechaHoraInicio: z.string().datetime({ message: 'Formato ISO requerido para nuevaFechaHoraInicio' }).optional(),
  nuevaDuracionEstimadaMinutos: z.number().int().min(30).max(720).optional(),
  nuevaPlantaDestinoId: z.string().uuid({ message: 'Planta destino inválida' }).optional(),
  motivoReasignacion: z.string().min(5, { message: 'Debe especificar el motivo del cambio (mínimo 5 caracteres)' }),
  forzarConJustificacion: z.boolean().default(false),
  justificacionForzado: z.string().max(500).optional()
}).refine((data) => {
  if (data.forzarConJustificacion) {
    return !!data.justificacionForzado && data.justificacionForzado.trim().length >= 10;
  }
  return true;
}, {
  message: 'La justificación de forzado debe contener al menos 10 caracteres',
  path: ['justificacionForzado']
});

export type ReasignarAtencionInput = z.infer<typeof reasignarAtencionSchema>;

// -------------------------------------------------------------
// 4. FILTROS DE CONSULTA DE AGENDA (Query String)
// -------------------------------------------------------------

export const agendaQuerySchema = z.object({
  fechaDesde: z.string().datetime({ message: 'fechaDesde debe ser formato ISO' }),
  fechaHasta: z.string().datetime({ message: 'fechaHasta debe ser formato ISO' }),
  vehiculoId: z.string().uuid({ message: 'vehiculoId inválido' }).optional(),
  conductorId: z.string().uuid({ message: 'conductorId inválido' }).optional(),
  sucursalId: z.string().uuid({ message: 'sucursalId inválido' }).optional(),
  estado: z.nativeEnum(EstadoAtencionProgramada).optional(),
  vista: z.enum(['mes', 'semana', 'dia']).default('mes')
});

export type AgendaQueryParams = z.infer<typeof agendaQuerySchema>;
