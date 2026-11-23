import { z } from 'zod';
import { TipoEquipo, EstadoEquipo } from '@prisma/client';

const currentYear = new Date().getFullYear();

// Patente: 4 a 10 caracteres alfanuméricos y guiones, sin espacios intermedios
const patenteRegex = /^[A-Z0-9-]{4,10}$/;

export const CrearEquipoSchema = z.object({
  patente: z
    .string({ required_error: 'La patente es requerida' })
    .trim()
    .transform((val) => val.toUpperCase())
    .pipe(
      z
        .string()
        .regex(
          patenteRegex,
          'La patente debe tener entre 4 y 10 caracteres alfanuméricos en mayúsculas (se permiten guiones)'
        )
    ),
  tipoEquipo: z.nativeEnum(TipoEquipo, {
    errorMap: () => ({ message: 'Tipo de equipo inválido (CAMION, CAMIONETA, MAQUINARIA, OTRO)' })
  }),
  marca: z
    .string({ required_error: 'La marca es requerida' })
    .trim()
    .min(1, 'La marca no puede estar vacía')
    .max(60, 'La marca no puede exceder 60 caracteres'),
  modelo: z
    .string({ required_error: 'El modelo es requerido' })
    .trim()
    .min(1, 'El modelo no puede estar vacío')
    .max(60, 'El modelo no puede exceder 60 caracteres'),
  anio: z
    .number({ required_error: 'El año es requerido' })
    .int('El año debe ser un número entero')
    .min(1980, 'El año debe ser igual o posterior a 1980')
    .max(currentYear + 1, `El año no puede ser superior a ${currentYear + 1}`),
  capacidadEstanqueM3: z
    .number({ required_error: 'La capacidad de estanque es requerida' })
    .min(0, 'La capacidad de estanque no puede ser negativa')
    .max(999999.99, 'La capacidad de estanque excede el límite permitido')
    .refine((val) => {
      const parts = val.toString().split('.');
      return !parts[1] || parts[1].length <= 2;
    }, 'La capacidad de estanque permite hasta 2 decimales'),
  equipoHidrojet: z.boolean().default(false),
  equipoVacio: z.boolean().default(false),
  observaciones: z
    .string()
    .max(1000, 'Las observaciones no pueden exceder 1000 caracteres')
    .nullable()
    .optional()
}).strict();

export type CrearEquipoInput = z.infer<typeof CrearEquipoSchema>;

export const EditarEquipoSchema = z
  .object({
    patente: z
      .string()
      .trim()
      .transform((val) => val.toUpperCase())
      .pipe(
        z
          .string()
          .regex(
            patenteRegex,
            'La patente debe tener entre 4 y 10 caracteres alfanuméricos en mayúsculas (se permiten guiones)'
          )
      )
      .optional(),
    tipoEquipo: z.nativeEnum(TipoEquipo).optional(),
    marca: z.string().trim().min(1).max(60).optional(),
    modelo: z.string().trim().min(1).max(60).optional(),
    anio: z
      .number()
      .int('El año debe ser un número entero')
      .min(1980)
      .max(currentYear + 1)
      .optional(),
    capacidadEstanqueM3: z
      .number()
      .min(0)
      .max(999999.99)
      .refine((val) => {
        const parts = val.toString().split('.');
        return !parts[1] || parts[1].length <= 2;
      }, 'La capacidad de estanque permite hasta 2 decimales')
      .optional(),
    equipoHidrojet: z.boolean().optional(),
    equipoVacio: z.boolean().optional(),
    observaciones: z.string().max(1000).nullable().optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe proporcionar al menos un campo para actualizar.'
  });

export type EditarEquipoInput = z.infer<typeof EditarEquipoSchema>;

export const CambiarEstadoSchema = z.discriminatedUnion('estado', [
  z
    .object({
      estado: z.literal(EstadoEquipo.HABILITADO)
    })
    .strict(),
  z
    .object({
      estado: z.literal(EstadoEquipo.DESHABILITADO),
      motivo: z
        .string({ required_error: 'El motivo es obligatorio al deshabilitar un equipo' })
        .trim()
        .min(5, 'El motivo debe tener al menos 5 caracteres')
        .max(500, 'El motivo no puede exceder 500 caracteres'),
      vehiculoDestinoId: z.string().uuid('ID de vehículo de reemplazo inválido').optional()
    })
    .strict()
]);

export type CambiarEstadoInput = z.infer<typeof CambiarEstadoSchema>;

export const TransferirJornadasSchema = z
  .object({
    vehiculoDestinoId: z.string({ required_error: 'vehiculoDestinoId es requerido' }).uuid('ID de vehículo destino inválido'),
    jornadaIds: z
      .array(z.string().uuid('ID de jornada inválido'))
      .min(1, 'Si se proporciona jornadaIds debe contener al menos un identificador')
      .optional()
  })
  .strict();

export type TransferirJornadasInput = z.infer<typeof TransferirJornadasSchema>;

export const ListarFlotaQuerySchema = z
  .object({
    tipoEquipo: z.nativeEnum(TipoEquipo).optional(),
    estado: z.nativeEnum(EstadoEquipo).optional(),
    busqueda: z.string().trim().optional()
  })
  .strict();

export type ListarFlotaQuery = z.infer<typeof ListarFlotaQuerySchema>;

export const UUIDParamSchema = z
  .object({
    id: z.string().uuid('Identificador inválido (se requiere UUID)')
  })
  .strict();
