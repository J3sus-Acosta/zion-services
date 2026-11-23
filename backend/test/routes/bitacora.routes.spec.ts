import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../../src/app.js';
import { TokenService } from '../../src/services/token.service.js';
import { prisma } from '../../src/utils/prisma.js';
import { seedDemoData } from '../../prisma/seed.js';
import { RolUsuario, EstadoOrdenServicio, EstadoSolicitud, TipoEventoBitacora } from '@prisma/client';

describe('Pruebas de Integración REST: Bitácora de Terreno Anti-WhatsApp (/api/bitacora)', () => {
  let server: http.Server;
  let baseUrl: string;
  let conductorToken: string;
  let clienteHorseToken: string;
  let clienteAcmeToken: string;
  let ordenHorseId: string;
  let ordenHorseFolio: string;

  beforeAll(async () => {
    await seedDemoData();

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    conductorToken = TokenService.generateAccessToken({
      userId: 'usr-conductor-01',
      email: 'conductor@zion.cl',
      rol: RolUsuario.CONDUCTOR
    });

    clienteHorseToken = TokenService.generateAccessToken({
      userId: 'usr-cli-horse-bit',
      email: 'horse.bit@horse.cl',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-horse'
    });

    clienteAcmeToken = TokenService.generateAccessToken({
      userId: 'usr-cli-acme-bit',
      email: 'acme.bit@acme.cl',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-acme'
    });

    const sucursal = await prisma.sucursalFaena.findFirst({
      where: { empresaClienteId: 'empresa-horse' }
    });

    const solicitud = await prisma.solicitudServicio.create({
      data: {
        folio: `SOL-BIT-ROUTE-${Date.now().toString().slice(-4)}`,
        empresaClienteId: 'empresa-horse',
        sucursalFaenaId: sucursal!.id,
        tipoResiduo: 'Residuos Químicos y RILES',
        fechaPreferente: new Date(),
        estado: EstadoSolicitud.APROBADA
      }
    });

    ordenHorseFolio = `OS-BIT-R-${Date.now().toString().slice(-4)}`;
    const orden = await prisma.ordenServicio.create({
      data: {
        folio: ordenHorseFolio,
        solicitudServicioId: solicitud.id,
        estado: EstadoOrdenServicio.EN_EJECUCION
      }
    });
    ordenHorseId = orden.id;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe('POST /api/bitacora', () => {
    it('debe rechazar solicitudes no autenticadas con 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/bitacora`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordenServicioId: ordenHorseId,
          tipoEvento: TipoEventoBitacora.TRAFICO,
          descripcion: 'Retención de 30 minutos por trabajos viales'
        })
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('debe rechazar si la descripción es menor a 5 caracteres (400 VALIDATION_ERROR)', async () => {
      const res = await fetch(`${baseUrl}/api/bitacora`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify({
          ordenServicioId: ordenHorseId,
          tipoEvento: TipoEventoBitacora.FALLA_EQUIPO,
          descripcion: 'abc' // Muy corta
        })
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('debe registrar exitosamente una incidencia por parte del conductor (201 Created)', async () => {
      const res = await fetch(`${baseUrl}/api/bitacora`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify({
          ordenServicioId: ordenHorseId,
          tipoEvento: TipoEventoBitacora.VOLUMEN_DISCREPANTE,
          descripcion: 'Volumen en fosa supera en 4 m3 lo estimado por el cliente',
          latitud: -33.4385,
          longitud: -70.6512
        })
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBeDefined();
      expect(json.data.tipoEvento).toBe(TipoEventoBitacora.VOLUMEN_DISCREPANTE);
      expect(json.data.ordenServicioId).toBe(ordenHorseId);
    });

    it('POST /api/bitacora/:ordenId: debe permitir registrar con ordenId en la ruta (201)', async () => {
      const res = await fetch(`${baseUrl}/api/bitacora/${ordenHorseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify({
          tipoEvento: TipoEventoBitacora.TRAFICO,
          descripcion: 'Congestión vehicular severa en acceso a la autopista',
          latitud: -33.4390,
          longitud: -70.6520
        })
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.tipoEvento).toBe(TipoEventoBitacora.TRAFICO);
    });
  });

  describe('GET /api/bitacora/:ordenId', () => {
    it('debe consultar el timeline completo de eventos de la orden (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/bitacora/${ordenHorseId}`, {
        headers: {
          Authorization: `Bearer ${conductorToken}`
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.ordenServicioId).toBe(ordenHorseId);
      expect(Array.isArray(json.data.timeline)).toBe(true);
      expect(json.data.totalEventos).toBeGreaterThanOrEqual(2);
    });

    it('debe permitir a un CLIENTE consultar la bitácora de su propia orden (200)', async () => {
      const res = await fetch(`${baseUrl}/api/bitacora/${ordenHorseId}`, {
        headers: {
          Authorization: `Bearer ${clienteHorseToken}`
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.cliente).toBe('Horse Chile S.A.');
    });

    it('debe bloquear a un CLIENTE si intenta consultar la bitácora de otra empresa (Tenant Isolation 403)', async () => {
      const res = await fetch(`${baseUrl}/api/bitacora/${ordenHorseId}`, {
        headers: {
          Authorization: `Bearer ${clienteAcmeToken}` // Orden es de empresa-horse
        }
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });
  });
});
