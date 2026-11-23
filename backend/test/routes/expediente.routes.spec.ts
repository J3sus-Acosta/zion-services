import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../../src/app.js';
import { TokenService } from '../../src/services/token.service.js';
import { prisma } from '../../src/utils/prisma.js';
import { seedDemoData } from '../../prisma/seed.js';
import { RolUsuario, EstadoOrdenServicio, EstadoSolicitud, CategoriaDocumento } from '@prisma/client';
import fs from 'fs';
import path from 'path';

describe('Pruebas de Integración REST: Expedientes y Descargas Limpias (/api/expedientes)', () => {
  let server: http.Server;
  let baseUrl: string;
  let adminToken: string;
  let clienteHorseToken: string;
  let clienteAcmeToken: string;
  let ordenHorseId: string;
  let ordenHorseFolio: string;
  let docFisicoId: string;
  let docInexistenteFisicoId: string;
  let testFilePath: string;

  beforeAll(async () => {
    await seedDemoData();

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    adminToken = TokenService.generateAccessToken({
      userId: 'usr-admin-exp',
      email: 'admin.exp@zion.cl',
      rol: RolUsuario.ADMIN
    });

    clienteHorseToken = TokenService.generateAccessToken({
      userId: 'usr-cli-horse-exp',
      email: 'horse.exp@horse.cl',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-horse'
    });

    clienteAcmeToken = TokenService.generateAccessToken({
      userId: 'usr-cli-acme-exp',
      email: 'acme.exp@acme.cl',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-acme'
    });

    // Crear archivo físico real en uploads/test-docs/
    const testDir = path.resolve(process.cwd(), 'uploads/test-docs');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    testFilePath = path.join(testDir, `test-doc-${Date.now()}.pdf`);
    fs.writeFileSync(testFilePath, '%PDF-1.4 Mock Document Content Real');

    // Obtener sucursal de empresa-horse
    const sucursal = await prisma.sucursalFaena.findFirst({
      where: { empresaClienteId: 'empresa-horse' }
    });

    const solicitud = await prisma.solicitudServicio.create({
      data: {
        folio: `SOL-EXP-${Date.now().toString().slice(-4)}`,
        empresaClienteId: 'empresa-horse',
        sucursalFaenaId: sucursal!.id,
        tipoResiduo: 'RILES Industriales',
        fechaPreferente: new Date(),
        estado: EstadoSolicitud.APROBADA
      }
    });

    ordenHorseFolio = `OS-EXP-${Date.now().toString().slice(-4)}`;
    const orden = await prisma.ordenServicio.create({
      data: {
        folio: ordenHorseFolio,
        solicitudServicioId: solicitud.id,
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

    // 1. Documento con archivo físico real en disco
    const docReal = await prisma.documentoExpediente.create({
      data: {
        expedienteDocumentalId: expediente.id,
        categoria: CategoriaDocumento.ORDEN_SERVICIO_PDF,
        nombreArchivo: 'orden-servicio-real.pdf',
        mimeType: 'application/pdf',
        pesoBytes: 1024,
        rutaAlmacenamiento: testFilePath,
        visibleParaCliente: true
      }
    });
    docFisicoId = docReal.id;

    // 2. Documento con ruta inexistente físicamente en disco (para probar 404 estricto)
    const docInexistente = await prisma.documentoExpediente.create({
      data: {
        expedienteDocumentalId: expediente.id,
        categoria: CategoriaDocumento.GUIA_DESPACHO_CLIENTE,
        nombreArchivo: 'guia-despacho-fantasma.pdf',
        mimeType: 'application/pdf',
        pesoBytes: 2048,
        rutaAlmacenamiento: 'uploads/fantasmas/no-existe.pdf',
        visibleParaCliente: true
      }
    });
    docInexistenteFisicoId = docInexistente.id;
  });

  afterAll(async () => {
    if (fs.existsSync(testFilePath)) {
      await fs.promises.unlink(testFilePath).catch(() => {});
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe('GET /api/expedientes/:ordenId/descargar-zip', () => {
    it('debe transmitir un archivo ZIP válido vía streaming', async () => {
      const res = await fetch(`${baseUrl}/api/expedientes/${ordenHorseId}/descargar-zip`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/zip');
      const disposition = res.headers.get('content-disposition');
      expect(disposition).toContain(`Expediente_${ordenHorseFolio}`);

      const buffer = await res.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(100);
    });

    it('debe bloquear descarga ZIP a usuario CLIENTE de otra empresa (Tenant Isolation 403)', async () => {
      const res = await fetch(`${baseUrl}/api/expedientes/${ordenHorseId}/descargar-zip`, {
        headers: {
          Authorization: `Bearer ${clienteAcmeToken}` // Orden es de empresa-horse
        }
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });
  });

  describe('GET /api/expedientes/:ordenId/documentos/:documentoId/descargar', () => {
    it('debe retornar 404 NOT_FOUND si el archivo físico no existe en disco (sin generar .txt mocks)', async () => {
      const res = await fetch(
        `${baseUrl}/api/expedientes/${ordenHorseId}/documentos/${docInexistenteFisicoId}/descargar`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`
          }
        }
      );

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('FILE_NOT_FOUND');
    });

    it('debe descargar exitosamente el archivo cuando sí existe físicamente en el servidor (200)', async () => {
      const res = await fetch(
        `${baseUrl}/api/expedientes/${ordenHorseId}/documentos/${docFisicoId}/descargar`,
        {
          headers: {
            Authorization: `Bearer ${clienteHorseToken}`
          }
        }
      );

      expect(res.status).toBe(200);
      const content = await res.text();
      expect(content).toContain('%PDF-1.4 Mock Document Content Real');
    });

    it('debe rechazar descarga individual con 403 a CLIENTE de otra empresa (Tenant Isolation)', async () => {
      const res = await fetch(
        `${baseUrl}/api/expedientes/${ordenHorseId}/documentos/${docFisicoId}/descargar`,
        {
          headers: {
            Authorization: `Bearer ${clienteAcmeToken}`
          }
        }
      );

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });
  });
});
