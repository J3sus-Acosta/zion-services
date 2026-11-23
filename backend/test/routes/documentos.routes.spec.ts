import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../../src/app.js';
import { prisma } from '../../src/utils/prisma.js';
import { seedDemoData } from '../../prisma/seed.js';
import { CategoriaDocumento, EstadoOrdenServicio, EstadoSolicitud } from '@prisma/client';
import crypto from 'crypto';

describe('Pruebas de Integración REST: Verificación Pública de Documentos Oficiales (/api/documentos)', () => {
  let server: http.Server;
  let baseUrl: string;
  let testHashSha256: string;
  let testDocId: string;
  let testFolio: string;

  beforeAll(async () => {
    await seedDemoData();

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    testFolio = `OS-DOC-TEST-${Date.now().toString().slice(-4)}`;
    testHashSha256 = crypto.createHash('sha256').update(`DocumentoOficialTestZion2026-${Date.now()}-${Math.random()}`).digest('hex');

    const sucursal = await prisma.sucursalFaena.findFirst({
      where: { empresaClienteId: 'empresa-horse' }
    });

    // Crear solicitud, orden, expediente y documento de prueba
    const solicitud = await prisma.solicitudServicio.create({
      data: {
        folio: `SOL-TEST-${Date.now().toString().slice(-4)}`,
        empresaClienteId: 'empresa-horse',
        sucursalFaenaId: sucursal!.id,
        tipoResiduo: 'Aceites Usados y RILES',
        descripcion: 'Retiro programado de residuos',
        fechaPreferente: new Date(),
        estado: EstadoSolicitud.APROBADA
      }
    });

    const orden = await prisma.ordenServicio.create({
      data: {
        folio: testFolio,
        solicitudServicioId: solicitud.id,
        estado: EstadoOrdenServicio.FINALIZADA
      }
    });

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
        nombreArchivo: `acta-recepcion-${testFolio}.pdf`,
        mimeType: 'application/pdf',
        pesoBytes: 154200,
        rutaAlmacenamiento: `uploads/expedientes/${orden.id}/acta.pdf`,
        hashSha256: testHashSha256,
        qrUrl: `http://localhost:5173/verificar-doc?hash=${testHashSha256}`
      }
    });

    testDocId = doc.id;
  });

  afterAll(async () => {
    if (testDocId) {
      await prisma.documentoExpediente.deleteMany({ where: { id: testDocId } }).catch(() => {});
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('GET /api/documentos/verificar/:hash: debe ser accesible públicamente sin token JWT', async () => {
    const res = await fetch(`${baseUrl}/api/documentos/verificar/${testHashSha256}`);
    // No debe retornar 401 ni 403
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valido).toBe(true);
  });

  it('debe retornar 400 si el hash provisto no tiene exactamente 64 caracteres hexadecimales', async () => {
    const res = await fetch(`${baseUrl}/api/documentos/verificar/hash-corto-invalido`);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.valido).toBe(false);
    expect(json.mensaje).toContain('64 caracteres');
  });

  it('debe retornar 404 si el documento con ese hash no existe en el sistema Zion Services', async () => {
    const hashInexistente = '0'.repeat(64);
    const res = await fetch(`${baseUrl}/api/documentos/verificar/${hashInexistente}`);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.valido).toBe(false);
    expect(json.mensaje).toContain('no encontrado');
  });

  it('debe retornar 200 con la metadata completa del documento y el cliente para un hash existente', async () => {
    const res = await fetch(`${baseUrl}/api/documentos/verificar/${testHashSha256}`);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.valido).toBe(true);
    expect(json.documento).toBeDefined();
    expect(json.documento.id).toBe(testDocId);
    expect(json.documento.tipo).toBe('ACTA_RECEPCION_FIRMADA');
    expect(json.documento.nombreArchivo).toContain(testFolio);
    expect(json.documento.hashSha256).toBe(testHashSha256);
    expect(json.documento.folioOrden).toBe(testFolio);
    expect(json.documento.cliente).toBe('Horse Chile S.A.');
  });
});
