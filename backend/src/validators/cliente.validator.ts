import { z } from 'zod';
import { TipoCliente } from '@prisma/client';

/**
 * Validador estricto de RUT chileno mediante el algoritmo Módulo 11.
 * Soporta formatos con o sin puntos y con o sin guión.
 */
export function validateRut(rut: string): boolean {
  if (typeof rut !== 'string') return false;

  // 1. Limpieza de espacios, puntos y guión
  const clean = rut.replace(/[\.\-\s]/g, '').toUpperCase();

  // 2. Validación de longitud: cuerpo de 6 a 8 dígitos + 1 DV (total 7-9 caracteres)
  if (clean.length < 7 || clean.length > 9) return false;

  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);

  // 3. El cuerpo debe ser estrictamente numérico
  if (!/^\d+$/.test(cuerpo)) return false;

  // 4. El DV debe ser 0-9 o K
  if (!/^[\dK]$/.test(dv)) return false;

  // 5. Algoritmo Módulo 11: Suma ponderada con secuencia [2, 3, 4, 5, 6, 7]
  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  let dvCalculado = '0';
  if (resto === 11) {
    dvCalculado = '0';
  } else if (resto === 10) {
    dvCalculado = 'K';
  } else {
    dvCalculado = resto.toString();
  }

  // 6. Comparación estricta del dígito verificador
  return dv === dvCalculado;
}

/**
 * Limpia y normaliza un RUT al formato CUERPO-DV (e.g. 76111222-8)
 */
export function cleanRut(rut: string): string {
  const clean = rut.replace(/[\.\-\s]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return `${cuerpo}-${dv}`;
}

/**
 * Formatea un RUT al formato chileno oficial con puntos y guión (e.g. 76.111.222-8)
 */
export function formatRut(rut: string): string {
  const normalized = cleanRut(rut);
  const [cuerpo, dv] = normalized.split('-');
  if (!dv) return normalized;
  const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpoConPuntos}-${dv}`;
}

// -------------------------------------------------------------
// ESQUEMAS ZOD PARA EMPRESA CLIENTE
// -------------------------------------------------------------

export const createEmpresaClienteSchema = z.object({
  rut: z.string({ required_error: 'El RUT es obligatorio' })
    .min(1, 'El RUT es obligatorio')
    .refine(validateRut, {
      message: 'El RUT ingresado no es válido (algoritmo Módulo 11)'
    }),
  razonSocial: z.string({ required_error: 'La razón social es obligatoria' })
    .min(2, 'La razón social debe tener al menos 2 caracteres'),
  nombreFantasia: z.string().optional().nullable(),
  giro: z.string().optional().nullable(),
  direccionMatriz: z.string().optional().nullable(),
  comuna: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email('Formato de correo electrónico inválido').optional().nullable().or(z.literal('')),
  tipo: z.nativeEnum(TipoCliente).optional().default(TipoCliente.SPOT),
  activo: z.boolean().default(true)
});

export const updateEmpresaClienteSchema = z.object({
  rut: z.string()
    .min(1, 'El RUT no puede estar vacío')
    .refine(validateRut, {
      message: 'El RUT ingresado no es válido (algoritmo Módulo 11)'
    })
    .optional(),
  razonSocial: z.string().min(2, 'La razón social debe tener al menos 2 caracteres').optional(),
  nombreFantasia: z.string().optional().nullable(),
  giro: z.string().optional().nullable(),
  direccionMatriz: z.string().optional().nullable(),
  comuna: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email('Formato de correo electrónico inválido').optional().nullable().or(z.literal('')),
  tipo: z.nativeEnum(TipoCliente).optional(),
  activo: z.boolean().optional()
});

// -------------------------------------------------------------
// ESQUEMAS ZOD PARA SUCURSAL / FAENA
// -------------------------------------------------------------

export const createSucursalSchema = z.object({
  empresaClienteId: z.string({ required_error: 'El ID de la empresa cliente es obligatorio' })
    .uuid({ message: 'El ID de la empresa cliente debe ser un UUID válido' }),
  nombre: z.string({ required_error: 'El nombre es obligatorio' })
    .min(2, 'El nombre debe tener al menos 2 caracteres'),
  direccion: z.string({ required_error: 'La dirección es obligatoria' })
    .min(3, 'La dirección debe tener al menos 3 caracteres'),
  comuna: z.string({ required_error: 'La comuna es obligatoria' })
    .min(2, 'La comuna debe tener al menos 2 caracteres'),
  ciudad: z.string().min(2).optional(),
  region: z.string({ required_error: 'La región es obligatoria' })
    .min(2, 'La región debe tener al menos 2 caracteres'),
  contactoNombre: z.string().optional().nullable(),
  contactoTelefono: z.string().optional().nullable(),
  contactoEmail: z.string().email('Formato de correo de contacto inválido').optional().nullable().or(z.literal('')),
  latitud: z.number().optional().nullable(),
  longitud: z.number().optional().nullable(),
  activo: z.boolean().default(true)
});

export const updateSucursalSchema = z.object({
  empresaClienteId: z.string().uuid({ message: 'El ID de la empresa cliente debe ser un UUID válido' }).optional(),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  direccion: z.string().min(3, 'La dirección debe tener al menos 3 caracteres').optional(),
  comuna: z.string().min(2, 'La comuna debe tener al menos 2 caracteres').optional(),
  ciudad: z.string().min(2).optional(),
  region: z.string().min(2, 'La región debe tener al menos 2 caracteres').optional(),
  contactoNombre: z.string().optional().nullable(),
  contactoTelefono: z.string().optional().nullable(),
  contactoEmail: z.string().email('Formato de correo de contacto inválido').optional().nullable().or(z.literal('')),
  latitud: z.number().optional().nullable(),
  longitud: z.number().optional().nullable(),
  activo: z.boolean().optional()
});

// -------------------------------------------------------------
// ESQUEMA DE PAGINACIÓN Y FILTROS
// -------------------------------------------------------------

export const clientePaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  activo: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
  empresaClienteId: z.string().optional()
});

export type CreateEmpresaClienteInput = z.infer<typeof createEmpresaClienteSchema>;
export type UpdateEmpresaClienteInput = z.infer<typeof updateEmpresaClienteSchema>;
export type CreateSucursalInput = z.infer<typeof createSucursalSchema>;
export type UpdateSucursalInput = z.infer<typeof updateSucursalSchema>;
export type ClientePaginationQueryInput = z.infer<typeof clientePaginationQuerySchema>;
