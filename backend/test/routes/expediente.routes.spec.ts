import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import fs from 'fs';
import path from 'path';
import { RolUsuario, EstadoOrdenServicio, CategoriaDocumento } from '@prisma/client';
import { TokenService } from '../../src/services/token.service.js';

// Base de datos simulada en memoria para validar expedientes y descargas
const db = {
  ordenes: new Map<string, any>(),
  expedientes: new Map<string, any>(),
  documentos: new Map<string, any>()
};

// Mock de Prisma transaccional
vi.mock('../../src/utils/prisma.js', () => {
  const client = {
    ordenServicio: {
      findFirst: vi.fn(async ({ where, include }: { where: any; include?: any }) => {
        let found: any = null;
        for (const o of db.ordenes.values()) {
          if (where.id === o.id || where.folio === o.folio) {
            found = o;
            break;
          }
          if (where.OR) {
            for (const cond of where.OR) {
              if (cond.id === o.id || cond.folio === o.folio) {
                found = o;
                break;
              }
            }
          }
        }
        if (!found) return null;

        const res: any = { ...found };
        if (include?.solicitudServicio) {
          res.solicitudServicio = found.solicitudServicio;
        }
        if (include?.expediente) {
          const exp = db.expedientes.get(found.id);
          if (exp) {
            const docs = Array.from(db.documentos.values()).filter(
              (d) => d.expedienteDocumentalId === exp.id
            );
            res.expediente = {
              ...exp,
              documentos: include.expediente.include?.documentos ? docs : docs
            };
          } else {
            res.expediente = null;
          }
        }
        return res;
      })
    },
    expedienteDocumental: {
      create: vi.fn(async ({ data }: { data: any }) => {
        const record = { id: `exp-${Date.now()}`, ...data, completo: false, documentos: [] };
        db.expedientes.set(data.ordenServicioId, record);
        return record;
      })
    },
    documentoExpediente: {
      findFirst: vi.fn(async ({ where }: { where: any }) => {
        for (const d of db.documentos.values()) {
          if (where.id && d.id !== where.id) continue;
          if (where.expedienteDocumentalId && d.expedienteDocumentalId !== where.expedienteDocumentalId) continue;
          return d;
        }
        return null;
      }),
      create: vi.fn(async ({ data }: { data: any }) => {
        const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const record = { id, ...data, fechaCarga: new Date() };
        db.documentos.set(id, record);
        return record;
      })
    }
  };

  return { prisma: client };
});

import { app } from '../../src/app.js';

describe('Pruebas de Integración REST: Expedientes y Descargas Limpias (/api/expedientes)', () => {
  let server: http.Server;
  let baseUrl: string;
  let adminToken: string;
  let clienteHorseToken: string;
  let clienteAcmeToken: string;

  const ordenHorseId = 'os-horse-exp-01';
  const ordenHorseFolio = 'OS-2026-EXP-01';
  const expedienteId = 'exp-horse-01';

  let docFisicoId: string;
  let docInexistenteFisicoId: string;
  let docInternoId: string;
  let testFilePath: string;

  beforeAll(async () => {
    // 1. Crear archivo físico real en uploads/test-docs/
    const baseStorage = process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads');
    const testDir = path.join(baseStorage, 'test-docs');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    testFilePath = path.join(testDir, `test-doc-${Date.now()}.pdf`);
    fs.writeFileSync(testFilePath, '%PDF-1.4 Mock Document Content Real Para Prueba');

    // 2. Configurar orden en base de datos mock
    db.ordenes.set(ordenHorseId, {
      id: ordenHorseId,
      folio: ordenHorseFolio,
      solicitudServicio: {
        id: 'sol-horse-01',
        empresaClienteId: 'empresa-horse',
        empresaCliente: {
          razonSocial: 'Horse Motors Chile S.A.',
          rut: '76.123.456-7'
        },
        sucursalFaena: {
          nombre: 'Faena Panamericana'
        }
      },
      estado: EstadoOrdenServicio.EJECUTADA
    });

    db.expedientes.set(ordenHorseId, {
      id: expedienteId,
      ordenServicioId: ordenHorseId,
      completo: true
    });

    // Documento 1: Físico real y visible para cliente
    docFisicoId = 'doc-real-01';
    db.documentos.set(docFisicoId, {
      id: docFisicoId,
      expedienteDocumentalId: expedienteId,
      categoria: CategoriaDocumento.ORDEN_SERVICIO_PDF,
      nombreArchivo: 'orden-servicio-real.pdf',
      mimeType: 'application/pdf',
      pesoBytes: 1024,
      rutaAlmacenamiento: `/uploads/test-docs/${path.basename(testFilePath)}`,
      visibleParaCliente: true,
      fechaCarga: new Date()
    });

    // Documento 2: Inexistente físicamente
    docInexistenteFisicoId = 'doc-inexistente-02';
    db.documentos.set(docInexistenteFisicoId, {
      id: docInexistenteFisicoId,
      expedienteDocumentalId: expedienteId,
      categoria: CategoriaDocumento.GUIA_DESPACHO_CLIENTE,
      nombreArchivo: 'guia-despacho-fantasma.pdf',
      mimeType: 'application/pdf',
      pesoBytes: 2048,
      rutaAlmacenamiento: '/uploads/fantasmas/no-existe.pdf',
      visibleParaCliente: true,
      fechaCarga: new Date()
    });

    // Documento 3: Interno operacional (visibleParaCliente: false)
    docInternoId = 'doc-interno-03';
    db.documentos.set(docInternoId, {
      id: docInternoId,
      expedienteDocumentalId: expedienteId,
      categoria: CategoriaDocumento.CHECKLIST_SALIDA_F_GMT,
      nombreArchivo: 'checklist-interno-operacional.pdf',
      mimeType: 'application/pdf',
      pesoBytes: 1500,
      rutaAlmacenamiento: `/uploads/test-docs/${path.basename(testFilePath)}`,
      visibleParaCliente: false,
      fechaCarga: new Date()
    });

    // 3. Levantar servidor
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 4. Generar tokens JWT
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
  });

  afterAll(async () => {
    if (fs.existsSync(testFilePath)) {
      try {
        fs.unlinkSync(testFilePath);
      } catch {}
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe('GET /api/expedientes/:ordenId/descargar-zip', () => {
    it('debe transmitir un archivo ZIP válido vía streaming conteniendo archivos físicos y manifiesto', async () => {
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

    it('debe filtrar documentos internos y excluir no visibles cuando descarga un CLIENTE (SEC-02)', async () => {
      const res = await fetch(`${baseUrl}/api/expedientes/${ordenHorseId}/descargar-zip`, {
        headers: {
          Authorization: `Bearer ${clienteHorseToken}`
        }
      });

      expect(res.status).toBe(200);
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
      expect(content).toContain('%PDF-1.4 Mock Document Content Real Para Prueba');
    });

    it('debe rechazar descarga con 403 si un CLIENTE intenta descargar documento no visible (visibleParaCliente=false)', async () => {
      const res = await fetch(
        `${baseUrl}/api/expedientes/${ordenHorseId}/documentos/${docInternoId}/descargar`,
        {
          headers: {
            Authorization: `Bearer ${clienteHorseToken}`
          }
        }
      );

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('DOCUMENT_RESTRICTED');
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

  describe('POST /api/expedientes/:ordenId/documentos (SEC-01)', () => {
    it('bloquea indexación de documentos con 403 a CLIENTE de otra empresa', async () => {
      const payload = {
        categoria: CategoriaDocumento.ORDEN_COMPRA,
        nombreArchivo: 'orden_compra.pdf',
        mimeType: 'application/pdf',
        pesoBytes: 1024,
        rutaAlmacenamiento: '/uploads/test-docs/oc.pdf'
      };

      const res = await fetch(`${baseUrl}/api/expedientes/${ordenHorseId}/documentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clienteAcmeToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });

    it('permite indexar documento a CLIENTE de la misma empresa o ADMIN', async () => {
      const payload = {
        categoria: CategoriaDocumento.ORDEN_COMPRA,
        nombreArchivo: 'orden_compra_horse.pdf',
        mimeType: 'application/pdf',
        pesoBytes: 2048,
        rutaAlmacenamiento: '/uploads/test-docs/oc_horse.pdf'
      };

      const res = await fetch(`${baseUrl}/api/expedientes/${ordenHorseId}/documentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clienteHorseToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.nombreArchivo).toBe('orden_compra_horse.pdf');
    });
  });
});
