import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import fs from 'fs';
import path from 'path';
import { app } from '../../src/app.js';
import { TokenService } from '../../src/services/token.service.js';
import { prisma } from '../../src/utils/prisma.js';
import { seedDemoData } from '../../prisma/seed.js';
import { RolUsuario, EstadoOrdenServicio, EstadoSolicitud, CategoriaDocumento, TipoEventoBitacora } from '@prisma/client';
import crypto from 'crypto';

describe('Auditoría de Seguridad y Tenant Isolation Integral (Fase 7.2)', () => {
  let server: http.Server;
  let baseUrl: string;

  // Tokens de prueba
  let clienteHorseToken: string;
  let clienteAcmeToken: string;
  let adminToken: string;

  // IDs y datos para pruebas cruzadas
  let testFilePath: string;
  let ordenHorseId: string;
  let ordenHorseFolio: string;
  let docHorseId: string;
  let docHorseHash: string;

  beforeAll(async () => {
    // 1. Asegurar catálogo base y entidades demo
    await seedDemoData();

    // 2. Iniciar servidor de prueba en puerto efímero
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 3. Generar credenciales JWT para diferentes Tenants
    clienteHorseToken = TokenService.generateAccessToken({
      userId: 'usr-security-client-horse',
      email: 'operaciones@horse.cl',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-horse'
    });

    clienteAcmeToken = TokenService.generateAccessToken({
      userId: 'usr-security-client-acme',
      email: 'logistica@acme.cl',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-acme'
    });

    adminToken = TokenService.generateAccessToken({
      userId: 'usr-security-admin',
      email: 'admin.auditor@zion.cl',
      rol: RolUsuario.ADMIN
    });

    // 4. Crear archivo físico real para pruebas de descarga
    const testDir = path.resolve(process.cwd(), 'uploads/security-audit');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    testFilePath = path.join(testDir, `audit-doc-${Date.now()}.pdf`);
    const fileContent = `%PDF-1.4 Official Certificate Document Content Real Audit - ${Date.now()}`;
    fs.writeFileSync(testFilePath, fileContent);
    docHorseHash = crypto.createHash('sha256').update(fileContent).digest('hex');

    // 5. Crear solicitud, orden, expediente, documento y bitácora para 'empresa-horse'
    const sucursalHorse = await prisma.sucursalFaena.findFirst({
      where: { empresaClienteId: 'empresa-horse' }
    });

    const solicitudHorse = await prisma.solicitudServicio.create({
      data: {
        folio: `SOL-SEC-${Date.now().toString().slice(-4)}`,
        empresaClienteId: 'empresa-horse',
        sucursalFaenaId: sucursalHorse!.id,
        tipoResiduo: 'Residuos Industriales Peligrosos',
        fechaPreferente: new Date(),
        estado: EstadoSolicitud.APROBADA
      }
    });

    ordenHorseFolio = `OS-SEC-${Date.now().toString().slice(-4)}`;
    const orden = await prisma.ordenServicio.create({
      data: {
        folio: ordenHorseFolio,
        solicitudServicioId: solicitudHorse.id,
        estado: EstadoOrdenServicio.FINALIZADA
      }
    });
    ordenHorseId = orden.id;

    const expediente = await prisma.expedienteDocumental.create({
      data: {
        ordenServicioId: orden.id,
        completo: true
      }
    });

    const doc = await prisma.documentoExpediente.create({
      data: {
        expedienteDocumentalId: expediente.id,
        categoria: CategoriaDocumento.ACTA_RECEPCION_FIRMADA,
        nombreArchivo: 'acta-recepcion-oficial-horse.pdf',
        mimeType: 'application/pdf',
        pesoBytes: fileContent.length,
        rutaAlmacenamiento: testFilePath,
        hashSha256: docHorseHash,
        qrUrl: `https://app.zionservices.cl/verificar/${docHorseHash}`,
        visibleParaCliente: true
      }
    });
    docHorseId = doc.id;

    // Crear registro en bitácora para la orden de Horse
    await prisma.bitacoraServicio.create({
      data: {
        ordenServicioId: orden.id,
        tipoEvento: TipoEventoBitacora.OBSERVACION_GENERAL,
        descripcion: 'Conductor arribó a Planta Panamericana Norte de Horse'
      }
    });
  });

  afterAll(async () => {
    if (fs.existsSync(testFilePath)) {
      await fs.promises.unlink(testFilePath).catch(() => {});
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // =========================================================================
  // 1. AUDITORÍA /api/empresas-clientes
  // =========================================================================
  describe('Auditoría Tenant Isolation: /api/empresas-clientes', () => {
    it('debe rechazar con 403 Forbidden si un usuario con rol CLIENTE intenta listar todas las empresas', async () => {
      const res = await fetch(`${baseUrl}/api/empresas-clientes`, {
        headers: { Authorization: `Bearer ${clienteHorseToken}` }
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('debe permitir a CLIENTE de Horse consultar el detalle de su propia empresa (/api/empresas-clientes/empresa-horse) con 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/empresas-clientes/empresa-horse`, {
        headers: { Authorization: `Bearer ${clienteHorseToken}` }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('empresa-horse');
    });

    it('debe bloquear con 403 TENANT_ISOLATION_VIOLATION si CLIENTE de Horse intenta consultar empresa-acme', async () => {
      const res = await fetch(`${baseUrl}/api/empresas-clientes/empresa-acme`, {
        headers: { Authorization: `Bearer ${clienteHorseToken}` }
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });
  });

  // =========================================================================
  // 2. AUDITORÍA /api/sucursales
  // =========================================================================
  describe('Auditoría Tenant Isolation: /api/sucursales', () => {
    it('debe aislar automáticamente el listado para CLIENTE devolviendo solo sucursales de su propia empresa', async () => {
      const res = await fetch(`${baseUrl}/api/sucursales`, {
        headers: { Authorization: `Bearer ${clienteHorseToken}` }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      // Todas las sucursales devueltas deben ser de empresa-horse
      for (const suc of json.data) {
        expect(suc.empresaClienteId).toBe('empresa-horse');
      }
    });

    it('debe neutralizar intentos de inyección de query (?empresaClienteId=empresa-acme) forzando el tenant propio', async () => {
      const res = await fetch(`${baseUrl}/api/sucursales?empresaClienteId=empresa-acme`, {
        headers: { Authorization: `Bearer ${clienteHorseToken}` }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      // No debe contener ninguna sucursal de acme
      for (const suc of json.data) {
        expect(suc.empresaClienteId).toBe('empresa-horse');
      }
    });

    it('debe permitir a CLIENTE de Horse consultar el detalle de su sucursal propia con 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/sucursales/suc-horse-panamericana`, {
        headers: { Authorization: `Bearer ${clienteHorseToken}` }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('suc-horse-panamericana');
    });

    it('debe denegar con 403 TENANT_ISOLATION_VIOLATION si CLIENTE de Horse intenta consultar sucursal de Acme', async () => {
      const res = await fetch(`${baseUrl}/api/sucursales/suc-acme-pudahuel`, {
        headers: { Authorization: `Bearer ${clienteHorseToken}` }
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });
  });

  // =========================================================================
  // 3. AUDITORÍA /api/expedientes/:ordenId/documentos/:documentoId/descargar
  // =========================================================================
  describe('Auditoría Tenant Isolation: Descarga Individual de Documentos', () => {
    it('debe permitir a CLIENTE de Horse descargar documento de su propia orden con 200 OK', async () => {
      const res = await fetch(
        `${baseUrl}/api/expedientes/${ordenHorseId}/documentos/${docHorseId}/descargar`,
        {
          headers: { Authorization: `Bearer ${clienteHorseToken}` }
        }
      );

      expect(res.status).toBe(200);
      const content = await res.text();
      expect(content).toContain('%PDF-1.4 Official Certificate Document Content Real Audit');
    });

    it('debe denegar con 403 TENANT_ISOLATION_VIOLATION si CLIENTE de Acme intenta descargar documento de orden de Horse', async () => {
      const res = await fetch(
        `${baseUrl}/api/expedientes/${ordenHorseId}/documentos/${docHorseId}/descargar`,
        {
          headers: { Authorization: `Bearer ${clienteAcmeToken}` }
        }
      );

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });
  });

  // =========================================================================
  // 4. AUDITORÍA /api/expedientes/:ordenId/descargar-zip
  // =========================================================================
  describe('Auditoría Tenant Isolation: Descarga de ZIP Consolidado', () => {
    it('debe permitir a CLIENTE de Horse descargar ZIP de su propia orden con 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/expedientes/${ordenHorseId}/descargar-zip`, {
        headers: { Authorization: `Bearer ${clienteHorseToken}` }
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/zip');
      const buffer = await res.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(100);
    });

    it('debe denegar con 403 TENANT_ISOLATION_VIOLATION si CLIENTE de Acme intenta descargar el ZIP de orden de Horse', async () => {
      const res = await fetch(`${baseUrl}/api/expedientes/${ordenHorseId}/descargar-zip`, {
        headers: { Authorization: `Bearer ${clienteAcmeToken}` }
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });
  });

  // =========================================================================
  // 5. AUDITORÍA /api/bitacora/:ordenId
  // =========================================================================
  describe('Auditoría Tenant Isolation: Bitácora de Terreno Anti-WhatsApp', () => {
    it('debe permitir a CLIENTE de Horse consultar el timeline de su propia orden con 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/bitacora/${ordenHorseId}`, {
        headers: { Authorization: `Bearer ${clienteHorseToken}` }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.timeline)).toBe(true);
      expect(json.data.timeline.length).toBeGreaterThan(0);
    });

    it('debe denegar con 403 TENANT_ISOLATION_VIOLATION si CLIENTE de Acme intenta consultar la bitácora de orden de Horse', async () => {
      const res = await fetch(`${baseUrl}/api/bitacora/${ordenHorseId}`, {
        headers: { Authorization: `Bearer ${clienteAcmeToken}` }
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });
  });

  // =========================================================================
  // 6. AUDITORÍA /api/documentos/verificar/:hash
  // =========================================================================
  describe('Auditoría de Seguridad: Verificación Pública sin Filtración de Datos Sensibles', () => {
    it('debe ser accesible públicamente sin token de autenticación (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/documentos/verificar/${docHorseHash}`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.valido).toBe(true);
      expect(json.documento.hashSha256).toBe(docHorseHash);
    });

    it('no debe exponer datos confidenciales del cliente ni rutas internas de almacenamiento en disco', async () => {
      const res = await fetch(`${baseUrl}/api/documentos/verificar/${docHorseHash}`);
      expect(res.status).toBe(200);
      const json = await res.json();

      // Verificar que contiene únicamente metadata pública requerida
      expect(json.documento.id).toBe(docHorseId);
      expect(json.documento.tipo).toBe(CategoriaDocumento.ACTA_RECEPCION_FIRMADA);
      expect(json.documento.nombreArchivo).toBe('acta-recepcion-oficial-horse.pdf');
      expect(json.documento.folioOrden).toBe(ordenHorseFolio);
      expect(json.documento.cliente).toBe('Horse Chile S.A.');

      // Verificar estricta ausencia de datos sensibles
      expect(json.documento.rutaAlmacenamiento).toBeUndefined();
      expect(json.documento.rut).toBeUndefined();
      expect(json.documento.telefono).toBeUndefined();
      expect(json.documento.email).toBeUndefined();
      expect(json.documento.direccion).toBeUndefined();
      expect(json.documento.contactos).toBeUndefined();
    });

    it('debe retornar 400 Bad Request si el hash no cumple con longitud exacta de 64 caracteres SHA-256', async () => {
      const res = await fetch(`${baseUrl}/api/documentos/verificar/hash-invalido-corto`);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.valido).toBe(false);
      expect(json.mensaje).toContain('64 caracteres');
    });

    it('debe retornar 404 Not Found si el hash SHA-256 no existe en la base de datos', async () => {
      const nonExistentHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const res = await fetch(`${baseUrl}/api/documentos/verificar/${nonExistentHash}`);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.valido).toBe(false);
      expect(json.mensaje).toContain('no encontrado');
    });
  });
});
