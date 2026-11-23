import { describe, it, expect } from 'vitest';
import {
  validateRut,
  cleanRut,
  formatRut,
  createEmpresaClienteSchema,
  updateEmpresaClienteSchema,
  createSucursalSchema,
  updateSucursalSchema,
  clientePaginationQuerySchema
} from '../../src/validators/cliente.validator.js';
import { TipoCliente } from '@prisma/client';

describe('Validador de RUT Chileno (Módulo 11)', () => {
  it('debe validar exitosamente RUTs chilenos válidos con y sin formato', () => {
    // Casos con puntos y guión
    expect(validateRut('76.111.222-8')).toBe(true);
    expect(validateRut('76.432.109-K')).toBe(true);
    expect(validateRut('12.345.678-5')).toBe(true);
    expect(validateRut('77.333.444-7')).toBe(true);
    expect(validateRut('78.555.666-6')).toBe(true);
    expect(validateRut('77.987.654-3')).toBe(true);
    expect(validateRut('11.111.111-1')).toBe(true);

    // Casos sin puntos pero con guión
    expect(validateRut('76111222-8')).toBe(true);
    expect(validateRut('76432109-K')).toBe(true);
    expect(validateRut('12345678-5')).toBe(true);

    // Casos sin puntos ni guión
    expect(validateRut('761112228')).toBe(true);
    expect(validateRut('76432109K')).toBe(true);
    expect(validateRut('123456785')).toBe(true);

    // Caso con minúscula en dígito verificador 'k'
    expect(validateRut('76.432.109-k')).toBe(true);
    expect(validateRut('76432109k')).toBe(true);

    // Casos de personas naturales con 7 dígitos de cuerpo
    expect(validateRut('5.555.555-9')).toBe(true);
    expect(validateRut('55555559')).toBe(true);
    expect(validateRut('1.000.000-9')).toBe(true);
  });

  it('debe rechazar RUTs con dígito verificador erróneo', () => {
    expect(validateRut('76.111.222-9')).toBe(false);
    expect(validateRut('76.111.222-0')).toBe(false);
    expect(validateRut('76.432.109-9')).toBe(false);
    expect(validateRut('12.345.678-4')).toBe(false);
    expect(validateRut('12.345.678-K')).toBe(false);
  });

  it('debe rechazar formatos inválidos, cadenas vacías y caracteres no permitidos', () => {
    expect(validateRut('')).toBe(false);
    expect(validateRut('abc')).toBe(false);
    expect(validateRut('12345')).toBe(false);
    expect(validateRut('1234567890123')).toBe(false);
    expect(validateRut('76.111.222-Z')).toBe(false);
    expect(validateRut('AA.BBB.CCC-D')).toBe(false);
    expect(validateRut(null as unknown as string)).toBe(false);
    expect(validateRut(undefined as unknown as string)).toBe(false);
  });

  it('cleanRut: debe normalizar a formato CUERPO-DV sin puntos', () => {
    expect(cleanRut('76.111.222-8')).toBe('76111222-8');
    expect(cleanRut('76432109k')).toBe('76432109-K');
    expect(cleanRut('123456785')).toBe('12345678-5');
  });

  it('formatRut: debe formatear al estándar chileno con puntos y guión', () => {
    expect(formatRut('761112228')).toBe('76.111.222-8');
    expect(formatRut('76432109-K')).toBe('76.432.109-K');
    expect(formatRut('123456785')).toBe('12.345.678-5');
  });
});

describe('createEmpresaClienteSchema', () => {
  const validData = {
    rut: '76.111.222-8',
    razonSocial: 'Empresa Test SpA',
    nombreFantasia: 'Empresa Test',
    giro: 'Gestión Ambiental y Transporte',
    direccionMatriz: 'Av. Las Industrias 456',
    comuna: 'Pudahuel',
    region: 'Metropolitana',
    telefono: '+56912345678',
    email: 'contacto@empresatest.cl',
    tipo: TipoCliente.CONTRACTUAL,
    activo: true
  };

  it('debe validar exitosamente un objeto completo de empresa cliente', () => {
    const result = createEmpresaClienteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('debe permitir campos opcionales omitidos y usar valores por defecto', () => {
    const minimalData = {
      rut: '76.432.109-K',
      razonSocial: 'Minera Los Andes SpA'
    };
    const result = createEmpresaClienteSchema.safeParse(minimalData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tipo).toBe(TipoCliente.SPOT);
      expect(result.data.activo).toBe(true);
    }
  });

  it('debe rechazar si el RUT es inválido', () => {
    const invalidRut = { ...validData, rut: '76.111.222-0' };
    const result = createEmpresaClienteSchema.safeParse(invalidRut);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('algoritmo Módulo 11');
    }
  });

  it('debe rechazar razón social menor a 2 caracteres', () => {
    const shortName = { ...validData, razonSocial: 'A' };
    const result = createEmpresaClienteSchema.safeParse(shortName);
    expect(result.success).toBe(false);
  });

  it('debe rechazar email con formato incorrecto cuando se provee', () => {
    const badEmail = { ...validData, email: 'no-es-correo' };
    const result = createEmpresaClienteSchema.safeParse(badEmail);
    expect(result.success).toBe(false);
  });
});

describe('updateEmpresaClienteSchema', () => {
  it('debe permitir actualizaciones parciales', () => {
    const partialUpdate = {
      nombreFantasia: 'Nuevo Nombre Fantasía',
      activo: false
    };
    const result = updateEmpresaClienteSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it('debe validar RUT si viene en la actualización', () => {
    const invalidUpdate = {
      rut: '12.345.678-9' // DV incorrecto
    };
    const result = updateEmpresaClienteSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);

    const validUpdate = {
      rut: '12.345.678-5'
    };
    expect(updateEmpresaClienteSchema.safeParse(validUpdate).success).toBe(true);
  });
});

describe('createSucursalSchema y updateSucursalSchema', () => {
  const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const validSucursal = {
    empresaClienteId: validUUID,
    nombre: 'Faena Planta Maipú',
    direccion: 'Camino Melipilla 9876',
    comuna: 'Maipú',
    region: 'Metropolitana',
    contactoNombre: 'Carlos Martínez',
    contactoTelefono: '+56987654321',
    contactoEmail: 'carlos.martinez@cliente.cl',
    latitud: -33.5123,
    longitud: -70.7543,
    activo: true
  };

  it('debe validar exitosamente una sucursal con todos sus campos', () => {
    const result = createSucursalSchema.safeParse(validSucursal);
    expect(result.success).toBe(true);
  });

  it('debe rechazar empresaClienteId si no es UUID', () => {
    const invalidId = { ...validSucursal, empresaClienteId: 'empresa-no-uuid' };
    const result = createSucursalSchema.safeParse(invalidId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('UUID válido');
    }
  });

  it('debe rechazar nombres o direcciones con menos caracteres del mínimo', () => {
    const shortAddress = { ...validSucursal, direccion: 'Av' };
    expect(createSucursalSchema.safeParse(shortAddress).success).toBe(false);

    const shortName = { ...validSucursal, nombre: 'A' };
    expect(createSucursalSchema.safeParse(shortName).success).toBe(false);
  });

  it('updateSucursalSchema: permite actualizaciones parciales y valida tipos', () => {
    const partial = {
      contactoTelefono: '+56999998888',
      activo: false
    };
    const result = updateSucursalSchema.safeParse(partial);
    expect(result.success).toBe(true);
  });
});

describe('clientePaginationQuerySchema', () => {
  it('debe asignar valores por defecto a page y limit', () => {
    const parsed = clientePaginationQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
  });

  it('debe coercer cadenas numéricas y booleanos en query params', () => {
    const parsed = clientePaginationQuerySchema.parse({
      page: '3',
      limit: '25',
      search: 'Horse',
      activo: 'true'
    });
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(25);
    expect(parsed.search).toBe('Horse');
    expect(parsed.activo).toBe(true);
  });
});
