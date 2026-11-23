import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../../src/app.js';
import { TokenService } from '../../src/services/token.service.js';
import { RolUsuario } from '@prisma/client';
import { prisma } from '../../src/utils/prisma.js';
import { seedDemoData } from '../../prisma/seed.js';

describe('Pruebas de Integración REST: Empresas Clientes y Sucursales', () => {
  let server: http.Server;
  let baseUrl: string;
  let adminToken: string;
  let superadminToken: string;
  let conductorToken: string;
  let clienteToken: string;
  let cliente2Token: string;

  beforeAll(async () => {
    await seedDemoData();

    // Limpieza de datos de prueba previos para garantizar idempotencia
    await prisma.sucursalFaena.deleteMany({
      where: {
        nombre: { in: ['Planta Procesadora Talca', 'Faena Fantasma'] }
      }
    });
    await prisma.empresaCliente.deleteMany({
      where: {
        rut: { in: ['76.222.333-3', '76.333.444-4'] }
      }
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    adminToken = TokenService.generateAccessToken({
      userId: 'usr-admin-test',
      email: 'admin.cliente.test@zion.cl',
      rol: RolUsuario.ADMIN
    });

    superadminToken = TokenService.generateAccessToken({
      userId: 'usr-superadmin-test',
      email: 'superadmin.test@zion.cl',
      rol: RolUsuario.SUPERADMIN
    });

    conductorToken = TokenService.generateAccessToken({
      userId: 'usr-cond-test',
      email: 'cond.test@zion.cl',
      rol: RolUsuario.CONDUCTOR
    });

    clienteToken = TokenService.generateAccessToken({
      userId: 'usr-cli-horse',
      email: 'horse.client@horse.cl',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-horse'
    });

    cliente2Token = TokenService.generateAccessToken({
      userId: 'usr-cli-acme',
      email: 'acme.client@acme.cl',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-acme'
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // -------------------------------------------------------------
  // 1. AUTENTICACIÓN Y CONTROL DE ACCESO (RBAC)
  // -------------------------------------------------------------

  describe('Seguridad y RBAC en rutas de Empresas Clientes y Sucursales', () => {
    it('debe rechazar solicitudes no autenticadas con 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/empresas-clientes`);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('debe denegar creación de empresas a rol CONDUCTOR con 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/empresas-clientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify({
          rut: '76.111.222-8',
          razonSocial: 'Prueba no permitida'
        })
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('debe aplicar Tenant Isolation: cliente no puede ver detalles de otra empresa cliente', async () => {
      // clienteToken pertenece a 'empresa-horse', intenta ver 'empresa-acme'
      const res = await fetch(`${baseUrl}/api/empresas-clientes/empresa-acme`, {
        headers: {
          Authorization: `Bearer ${clienteToken}`
        }
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });

    it('debe permitir a un cliente ver los detalles de su propia empresa cliente', async () => {
      const res = await fetch(`${baseUrl}/api/empresas-clientes/empresa-horse`, {
        headers: {
          Authorization: `Bearer ${clienteToken}`
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('empresa-horse');
    });
  });

  // -------------------------------------------------------------
  // 2. CRUD EMPRESAS CLIENTES
  // -------------------------------------------------------------

  describe('CRUD de Empresas Clientes (/api/empresas-clientes)', () => {
    let createdEmpresaId: string;
    // Usamos un RUT válido de prueba (76.222.333-3 tiene DV calculado = 3)
    const testRut = '76.222.333-3';

    it('POST /api/empresas-clientes: rechaza creación con RUT inválido según Módulo 11 (400)', async () => {
      const res = await fetch(`${baseUrl}/api/empresas-clientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          rut: '76.222.333-9', // DV erróneo
          razonSocial: 'Empresa Invalida SpA'
        })
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('algoritmo Módulo 11');
    });

    it('POST /api/empresas-clientes: crea exitosamente una empresa cliente válida (201)', async () => {
      const res = await fetch(`${baseUrl}/api/empresas-clientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          rut: testRut,
          razonSocial: 'Industrias del Biobío SpA',
          nombreFantasia: 'Biobío Industrial',
          giro: 'Tratamiento de Residuos Industriales',
          direccionMatriz: 'Camino a Coronel 4500',
          comuna: 'San Pedro de la Paz',
          region: 'Biobío',
          telefono: '+56412998877',
          email: 'contacto@biobio.cl',
          tipo: 'CONTRACTUAL',
          activo: true
        })
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBeDefined();
      expect(json.data.rut).toBe(testRut);
      expect(json.data.razonSocial).toBe('Industrias del Biobío SpA');
      createdEmpresaId = json.data.id;
    });

    it('POST /api/empresas-clientes: rechaza empresa duplicada con el mismo RUT (409 Conflict)', async () => {
      const res = await fetch(`${baseUrl}/api/empresas-clientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          rut: testRut,
          razonSocial: 'Otra Empresa Con Mismo RUT SpA'
        })
      });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe('RUT_ALREADY_EXISTS');
    });

    it('GET /api/empresas-clientes: lista empresas con paginación, filtros y conteo de sucursales (200)', async () => {
      const res = await fetch(`${baseUrl}/api/empresas-clientes?page=1&limit=5&search=Biobío`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
      expect(json.meta.total).toBeGreaterThanOrEqual(1);
      expect(json.data[0]._count).toBeDefined();
      expect(json.data[0]._count.sucursales).toBeDefined();
    });

    it('GET /api/empresas-clientes/:id: obtiene el detalle con sucursales activas (200)', async () => {
      const res = await fetch(`${baseUrl}/api/empresas-clientes/${createdEmpresaId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(createdEmpresaId);
      expect(Array.isArray(json.data.sucursales)).toBe(true);
    });

    it('PUT /api/empresas-clientes/:id: actualiza campos de la empresa (200)', async () => {
      const res = await fetch(`${baseUrl}/api/empresas-clientes/${createdEmpresaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          nombreFantasia: 'Biobío Industrial Renovado',
          giro: 'Economía Circular y Valorización'
        })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.nombreFantasia).toBe('Biobío Industrial Renovado');
      expect(json.data.giro).toBe('Economía Circular y Valorización');
    });

    it('DELETE /api/empresas-clientes/:id: desactiva (soft-delete) la empresa (200)', async () => {
      const res = await fetch(`${baseUrl}/api/empresas-clientes/${createdEmpresaId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${superadminToken}`
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.activo).toBe(false);

      // Verificar en BD que activo es false
      const enBd = await prisma.empresaCliente.findUnique({ where: { id: createdEmpresaId } });
      expect(enBd?.activo).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // 3. CRUD SUCURSALES / FAENAS
  // -------------------------------------------------------------

  describe('CRUD de Sucursales / Faenas (/api/sucursales)', () => {
    let createdSucursalId: string;
    let empresaTestId: string;

    beforeAll(async () => {
      // Obtenemos o creamos una empresa con UUID
      const emp = await prisma.empresaCliente.upsert({
        where: { rut: '76.333.444-4' },
        update: {},
        create: {
          rut: '76.333.444-4',
          razonSocial: 'Faenas del Maule SpA',
          tipo: 'CONTRACTUAL',
          activo: true
        }
      });
      empresaTestId = emp.id;
    });

    it('POST /api/sucursales: rechaza creación si la empresaClienteId no existe (404)', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await fetch(`${baseUrl}/api/sucursales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          empresaClienteId: nonExistentUuid,
          nombre: 'Faena Fantasma',
          direccion: 'Calle Falsa 123',
          comuna: 'Talca',
          region: 'Maule'
        })
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('EMPRESA_NOT_FOUND');
    });

    it('POST /api/sucursales: crea exitosamente una nueva sucursal para la empresa (201)', async () => {
      const res = await fetch(`${baseUrl}/api/sucursales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          empresaClienteId: empresaTestId,
          nombre: 'Planta Procesadora Talca',
          direccion: 'Ruta 5 Sur Km 250',
          comuna: 'Talca',
          region: 'Maule',
          contactoNombre: 'Mariana López',
          contactoTelefono: '+56971234567',
          contactoEmail: 'mariana.lopez@faenasdelmaule.cl',
          latitud: -35.4264,
          longitud: -71.6554,
          activo: true
        })
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBeDefined();
      expect(json.data.nombre).toBe('Planta Procesadora Talca');
      expect(json.data.ciudad).toBe('Talca'); // Default a comuna
      expect(json.data.empresaCliente).toBeDefined();
      createdSucursalId = json.data.id;
    });

    it('GET /api/sucursales: lista sucursales con filtro por empresaClienteId (200)', async () => {
      const res = await fetch(`${baseUrl}/api/sucursales?empresaClienteId=${empresaTestId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
      expect(json.data[0].empresaClienteId).toBe(empresaTestId);
    });

    it('GET /api/sucursales/:id: obtiene el detalle de la sucursal (200)', async () => {
      const res = await fetch(`${baseUrl}/api/sucursales/${createdSucursalId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(createdSucursalId);
      expect(json.data.nombre).toBe('Planta Procesadora Talca');
    });

    it('PUT /api/sucursales/:id: actualiza datos de contacto de la sucursal (200)', async () => {
      const res = await fetch(`${baseUrl}/api/sucursales/${createdSucursalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          contactoNombre: 'Roberto Silva',
          contactoTelefono: '+56988887777'
        })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.contactoNombre).toBe('Roberto Silva');
      expect(json.data.contactoTelefono).toBe('+56988887777');
    });

    it('DELETE /api/sucursales/:id: desactiva (soft-delete) la sucursal (200)', async () => {
      const res = await fetch(`${baseUrl}/api/sucursales/${createdSucursalId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${superadminToken}`
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.activo).toBe(false);

      const enBd = await prisma.sucursalFaena.findUnique({ where: { id: createdSucursalId } });
      expect(enBd?.activo).toBe(false);
    });
  });
});
