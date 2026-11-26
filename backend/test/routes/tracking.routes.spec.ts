import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { RolUsuario, EstadoCicloTransporte, EstadoOrdenServicio } from '@prisma/client';
import { TokenService } from '../../src/services/token.service.js';

// Base de datos simulada en memoria representando la capa relacional MySQL
const db = {
  ordenes: new Map<string, any>(),
  telemetrias: [] as any[],
  jornadas: new Map<string, any>(),
  expedientes: new Map<string, any>(),
  documentos: [] as any[],
  fotosFaena: [] as any[]
};

// Mock de Prisma conectado a la base de datos simulada
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
        if (include?.cicloTransporte) {
          res.cicloTransporte = found.cicloTransporte;
          if (include.cicloTransporte.include?.fotosFaenaEPP) {
            res.cicloTransporte.fotosFaenaEPP = db.fotosFaena.filter(
              (f) => f.cicloTransporteId === found.cicloTransporte?.id
            );
          }
        }
        if (include?.atencionProgramada) {
          res.atencionProgramada = found.atencionProgramada;
        }
        if (include?.expediente) {
          const exp = db.expedientes.get(found.id);
          if (exp) {
            res.expediente = {
              ...exp,
              documentos: db.documentos.filter((d) => d.expedienteDocumentalId === exp.id)
            };
          }
        }
        return res;
      })
    },
    jornada: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return db.jornadas.get(where.id) || null;
      }),
      findMany: vi.fn(async ({ where }: { where: any }) => {
        const result: any[] = [];
        for (const j of db.jornadas.values()) {
          if (where?.estado && j.estado !== where.estado) continue;
          const telemetriasJornada = db.telemetrias
            .filter((t) => t.jornadaId === j.id)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          result.push({
            ...j,
            registrosTelemetria: telemetriasJornada.slice(0, 1),
            atencionesProgramadas: j.atencionesProgramadas || []
          });
        }
        return result;
      })
    },
    registroTelemetriaGPS: {
      create: vi.fn(async ({ data }: { data: any }) => {
        const record = {
          id: `gps-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ...data,
          timestamp: data.timestamp || new Date()
        };
        db.telemetrias.push(record);
        return record;
      }),
      findFirst: vi.fn(async ({ where, orderBy }: { where: any; orderBy?: any }) => {
        let matching = db.telemetrias.filter((t) => {
          if (where.ordenServicioId && t.ordenServicioId === where.ordenServicioId) return true;
          if (where.jornadaId && t.jornadaId === where.jornadaId) return true;
          if (where.OR) {
            for (const cond of where.OR) {
              if (cond.ordenServicioId && t.ordenServicioId === cond.ordenServicioId) return true;
              if (cond.jornadaId && t.jornadaId === cond.jornadaId) return true;
            }
          }
          return false;
        });

        if (orderBy?.timestamp === 'desc') {
          matching = matching.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        }
        return matching[0] || null;
      })
    }
  };

  return { prisma: client };
});

import { app } from '../../src/app.js';

describe('Pruebas de Integración REST: Módulo Tracking Relacional y Evidencias (/api/clientes/ordenes, /api/jornadas)', () => {
  let server: http.Server;
  let baseUrl: string;

  let clienteHorseToken: string;
  let clienteAcmeToken: string;
  let conductorToken: string;
  let jefeOperacionesToken: string;

  const ordenHorseId = 'os-horse-track-01';
  const ordenAcmeId = 'os-acme-track-02';
  const jornadaId = 'jornada-track-01';
  const cicloHorseId = 'ciclo-horse-01';

  beforeAll(async () => {
    // 1. Configurar datos relacionales en MySQL simulado
    db.ordenes.set(ordenHorseId, {
      id: ordenHorseId,
      folio: 'OS-HORSE-001',
      solicitudServicio: {
        id: 'sol-horse-01',
        empresaClienteId: 'empresa-horse',
        empresaCliente: { razonSocial: 'Horse Motors Chile S.A.' }
      },
      cicloTransporte: {
        id: cicloHorseId,
        estado: EstadoCicloTransporte.EN_RUTA_CLIENTE
      },
      atencionProgramada: {
        jornadaId,
        vehiculo: { patente: 'RVFL-92' },
        conductor: { usuario: { nombre: 'Carlos', apellido: 'Sánchez' } }
      }
    });

    db.ordenes.set(ordenAcmeId, {
      id: ordenAcmeId,
      folio: 'OS-ACME-002',
      solicitudServicio: {
        id: 'sol-acme-02',
        empresaClienteId: 'empresa-acme',
        empresaCliente: { razonSocial: 'Acme Corporation SpA' }
      },
      cicloTransporte: {
        id: 'ciclo-acme-02',
        estado: EstadoCicloTransporte.EN_RUTA_CLIENTE
      },
      atencionProgramada: {
        jornadaId: 'jornada-track-02',
        vehiculo: { patente: 'GHJK-12' },
        conductor: { usuario: { nombre: 'Esteban', apellido: 'Paredes' } }
      }
    });

    db.jornadas.set(jornadaId, {
      id: jornadaId,
      vehiculoId: 'veh-01',
      conductorId: 'cond-01',
      estado: 'EN_CURSO',
      vehiculo: { patente: 'RVFL-92' },
      conductor: { usuario: { nombre: 'Carlos', apellido: 'Sánchez' } },
      atencionesProgramadas: [
        {
          estado: 'EN_CURSO',
          ordenServicio: db.ordenes.get(ordenHorseId)
        }
      ]
    });

    db.expedientes.set(ordenHorseId, {
      id: 'exp-horse-01',
      ordenServicioId: ordenHorseId,
      completo: false
    });

    db.documentos.push({
      id: 'doc-1',
      expedienteDocumentalId: 'exp-horse-01',
      categoria: 'FOTO_CAMION_SALIDA',
      nombreArchivo: 'salida_frontal.jpg',
      rutaAlmacenamiento: '/uploads/inspecciones/salida/frontal.jpg',
      visibleParaCliente: true,
      fechaCarga: new Date(Date.now() - 3600000)
    });

    // 2. Generar tokens JWT
    clienteHorseToken = TokenService.generateAccessToken({
      userId: 'usr-horse-01',
      email: 'operaciones@horse.cl',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-horse'
    });

    clienteAcmeToken = TokenService.generateAccessToken({
      userId: 'usr-acme-01',
      email: 'admin@acme.cl',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-acme'
    });

    conductorToken = TokenService.generateAccessToken({
      userId: 'usr-cond-01',
      email: 'conductor@zion.cl',
      rol: RolUsuario.CONDUCTOR
    });

    jefeOperacionesToken = TokenService.generateAccessToken({
      userId: 'usr-ops-01',
      email: 'ops@zion.cl',
      rol: RolUsuario.JEFE_OPERACIONES
    });

    // 3. Iniciar servidor
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe('1. Ingesta y Consulta Relacional de Telemetría GPS', () => {
    it('persiste punto de telemetría en MySQL vía POST /api/jornadas/:id/geolocalizacion', async () => {
      const payload = {
        latitud: -33.4372,
        longitud: -70.6506,
        precisionMts: 6.5,
        velocidadKmh: 52.0,
        rumbo: 180.0,
        ordenServicioId: ordenHorseId
      };

      const res = await fetch(`${baseUrl}/api/jornadas/${jornadaId}/geolocalizacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.message).toBe('Coordenadas GPS registradas correctamente.');
      expect(json.data.timestamp).toBeDefined();

      // Verificar persistencia en base de datos
      expect(db.telemetrias.length).toBe(1);
      const row = db.telemetrias[0];
      expect(row.latitud).toBe(-33.4372);
      expect(row.longitud).toBe(-70.6506);
      expect(row.ordenServicioId).toBe(ordenHorseId);
    });

    it('consulta última posición GPS persistida vía GET /api/clientes/ordenes/:id/tracking', async () => {
      const res = await fetch(`${baseUrl}/api/clientes/ordenes/${ordenHorseId}/tracking`, {
        headers: {
          Authorization: `Bearer ${clienteHorseToken}`
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.trackingDisponible).toBe(true);
      expect(json.data.patente).toBe('RVFL-92');
      expect(json.data.coordenadas.latitud).toBe(-33.4372);
      expect(json.data.coordenadas.longitud).toBe(-70.6506);
      expect(json.data.coordenadas.precisionMts).toBe(6.5);
    });

    it('aplica Tenant Isolation estricto bloqueando a un cliente de ver tracking ajeno (HTTP 403)', async () => {
      // Cliente ACME intenta consultar orden de Cliente HORSE
      const res = await fetch(`${baseUrl}/api/clientes/ordenes/${ordenHorseId}/tracking`, {
        headers: {
          Authorization: `Bearer ${clienteAcmeToken}`
        }
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });
  });

  describe('2. Expediente en Vivo y Evidencias Relacionales', () => {
    it('consulta evidencias reales vía GET /api/clientes/ordenes/:id/expediente-en-vivo', async () => {
      const res = await fetch(`${baseUrl}/api/clientes/ordenes/${ordenHorseId}/expediente-en-vivo`, {
        headers: {
          Authorization: `Bearer ${clienteHorseToken}`
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.ordenServicioId).toBe(ordenHorseId);
      expect(json.data.totalEvidenciasCargadas).toBeGreaterThan(0);
      expect(json.data.evidencias[0].archivoUrl).toBe('/uploads/inspecciones/salida/frontal.jpg');
    });

    it('bloquea acceso a expediente en vivo de otra empresa (HTTP 403)', async () => {
      const res = await fetch(`${baseUrl}/api/clientes/ordenes/${ordenHorseId}/expediente-en-vivo`, {
        headers: {
          Authorization: `Bearer ${clienteAcmeToken}`
        }
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });
  });

  describe('3. Flota en Vivo Operacional y Simulación de Reinicio', () => {
    it('consulta flota en vivo para operaciones vía GET /api/operaciones/flota-en-vivo', async () => {
      const res = await fetch(`${baseUrl}/api/operaciones/flota-en-vivo`, {
        headers: {
          Authorization: `Bearer ${jefeOperacionesToken}`
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.totalUnidadesActivas).toBeGreaterThan(0);
      expect(json.data.unidades[0].patente).toBe('RVFL-92');
    });

    it('simula reinicio del servidor sin pérdida de datos en MySQL', async () => {
      // 1. Cerrar servidor
      await new Promise<void>((resolve) => server.close(() => resolve()));

      // 2. Levantar nuevo servidor en otro puerto
      await new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const port = (server.address() as AddressInfo).port;
          baseUrl = `http://127.0.0.1:${port}`;
          resolve();
        });
      });

      // 3. Consultar tracking inmediatamente después de reiniciar
      const res = await fetch(`${baseUrl}/api/clientes/ordenes/${ordenHorseId}/tracking`, {
        headers: {
          Authorization: `Bearer ${clienteHorseToken}`
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.trackingDisponible).toBe(true);
      expect(json.data.coordenadas.latitud).toBe(-33.4372);
      expect(json.data.coordenadas.longitud).toBe(-70.6506);
    });
  });
});
