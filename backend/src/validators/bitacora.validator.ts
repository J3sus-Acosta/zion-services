import { z } from 'zod';
import { TipoEventoBitacora } from '@prisma/client';

export const registrarBitacoraSchema = z.object({
  ordenServicioId: z.string({ required_error: 'El ID de la orden de servicio es obligatorio' })
    .min(1, 'El ID de la orden de servicio es obligatorio'),
  tipoEvento: z.nativeEnum(TipoEventoBitacora, {
    errorMap: () => ({ message: 'Tipo de evento de bitácora no válido' })
  }),
  descripcion: z.string({ required_error: 'La descripción del evento es obligatoria' })
    .min(5, 'La descripción debe tener al menos 5 caracteres')
    .max(2000, 'La descripción no puede exceder los 2000 caracteres'),
  latitud: z.number().optional().nullable(),
  longitud: z.number().optional().nullable(),
  fotoUrl: z.string().optional().nullable().or(z.literal(''))
});

export const queryBitacoraSchema = z.object({
  tipoEvento: z.nativeEnum(TipoEventoBitacora).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export type RegistrarBitacoraInput = z.infer<typeof registrarBitacoraSchema>;
export type QueryBitacoraInput = z.infer<typeof queryBitacoraSchema>;
