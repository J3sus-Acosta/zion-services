import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import fs from 'fs';
import path from 'path';
import { EstadoEquipo, EstadoInspeccion, OrigenBloqueo, RolUsuario, TipoFotoInspeccion } from '@prisma/client';
import { TokenService } from '../../src/services/token.service.js';

// Base de datos simulada en memoria para validar la persistencia relacional
const db = {
  vehiculos: new Map<string, any>(),
  conductores: new Map<string, any>(),
  inspeccionesSalida: [] as any[],
  fotosInspeccion: [] as any[],
  inspeccionesRetorno: [] as any[],
  auditoriaEventos: [] as any[]
};

// Mock transaccional de Prisma
vi.mock('../../src/utils/prisma.js', () => {
  const tx = {
    vehiculo: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; patente?: string } }) => {
        if (where.id) return db.vehiculos.get(where.id) || null;
        for (const v of db.vehiculos.values()) {
          if (v.patente === where.patente) return v;
        }
        return null;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
        const v = db.vehiculos.get(where.id);
        if (!v) throw new Error(`Vehículo ${where.id} no encontrado`);
        const updated = { ...v, ...data };
        db.vehiculos.set(where.id, updated);
        return updated;
      })
    },
    conductor: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; usuarioId?: string } }) => {
        if (where.id) return db.conductores.get(where.id) || null;
        if (where.usuarioId) {
          for (const c of db.conductores.values()) {
            if (c.usuarioId === where.usuarioId) return c;
          }
        }
        return null;
      })
    },
    inspeccionSalida_F_GMT: {
      create: vi.fn(async ({ data }: { data: any }) => {
        const id = `insp-salida-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const fotos: any[] = [];
        if (data.fotos360?.create) {
          for (const f of data.fotos360.create) {
            const fotoRow = {
              id: `foto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              inspeccionSalidaId: id,
              tipo: f.tipo,
              archivoUrl: f.archivoUrl,
              fechaHora: new Date()
            };
            db.fotosInspeccion.push(fotoRow);
            fotos.push(fotoRow);
          }
        }
        const record = {
          id,
          vehiculoId: data.vehiculoId,
          conductorId: data.conductorId,
          kilometraje: data.kilometraje,
          horometro: data.horometro,
          estado: data.estado,
          observaciones: data.observaciones,
          itemsChecklist: data.itemsChecklist,
          aprobadoPor: data.aprobadoPor,
          fechaHora: new Date(),
          fotos360: fotos
        };
        db.inspeccionesSalida.push(record);
        return record;
      })
    },
    fotoInspeccion: {
      create: vi.fn(async ({ data }: { data: any }) => {
        const record = {
          id: `foto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          inspeccionSalidaId: data.inspeccionSalidaId || null,
          inspeccionRetornoId: data.inspeccionRetornoId || null,
          tipo: data.tipo,
          archivoUrl: data.archivoUrl,
          fechaHora: new Date()
        };
        db.fotosInspeccion.push(record);
        return record;
      })
    },
    inspeccionRetornoPlanta: {
      create: vi.fn(async ({ data }: { data: any }) => {
        const id = `insp-retorno-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const fotos: any[] = [];
        if (data.fotos360Retorno?.create) {
          for (const f of data.fotos360Retorno.create) {
            const fotoRow = {
              id: `foto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              inspeccionRetornoId: id,
              tipo: f.tipo,
              archivoUrl: f.archivoUrl,
              fechaHora: new Date()
            };
            db.fotosInspeccion.push(fotoRow);
            fotos.push(fotoRow);
          }
        }
        const record = {
          id,
          vehiculoId: data.vehiculoId,
          conductorId: data.conductorId,
          kilometrajeFinal: data.kilometrajeFinal,
          horometroFinal: data.horometroFinal,
          estadoGeneral: data.estadoGeneral,
          danosDetectados: data.danosDetectados,
          herramientasOK: data.herramientasOK,
          observaciones: data.observaciones,
          fechaHora: new Date(),
          fotos360Retorno: fotos
        };
        db.inspeccionesRetorno.push(record);
        return record;
      })
    },
    auditoriaEvento: {
      create: vi.fn(async ({ data }: { data: any }) => {
        const record = {
          id: `audit-${Date.now()}`,
          ...data,
          fechaHora: new Date()
        };
        db.auditoriaEventos.push(record);
        return record;
      })
    }
  };

  const client = {
    ...tx,
    $transaction: vi.fn(async (cb: (prismaTx: any) => Promise<any>) => cb(tx))
  };

  return { prisma: client };
});

// Importar app luego del mock
import { app } from '../../src/app.js';

describe('Pruebas de Integración REST: Módulo Inspección de Flota (/api/inspecciones)', () => {
  let server: http.Server;
  let baseUrl: string;
  let conductorToken: string;

  const vehiculoHabilitadoId = 'veh-test-01';
  const vehiculoCriticoId = 'veh-test-02';
  const conductorId = 'cond-test-01';
  const conductorUserId = 'usr-cond-test-01';

  // 1x1 PNG en Base64 para simular fotos de tablet de terreno
  const VALID_PNG_BASE64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const archivosCreadosEnDisco: string[] = [];

  beforeAll(async () => {
    // 1. Inicializar entidades en mock DB
    db.vehiculos.set(vehiculoHabilitadoId, {
      id: vehiculoHabilitadoId,
      patente: 'JJ-AA-11',
      marca: 'Volvo',
      modelo: 'FM440',
      estado: EstadoEquipo.HABILITADO,
      activo: true
    });

    db.vehiculos.set(vehiculoCriticoId, {
      id: vehiculoCriticoId,
      patente: 'KK-BB-22',
      marca: 'Mercedes-Benz',
      modelo: 'Actros',
      estado: EstadoEquipo.HABILITADO,
      activo: true
    });

    db.conductores.set(conductorId, {
      id: conductorId,
      usuarioId: conductorUserId,
      licenciaNumero: '12345678-9',
      licenciaClase: 'A4'
    });

    // 2. Levantar servidor HTTP
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 3. Generar token de conductor
    conductorToken = TokenService.generateAccessToken({
      userId: conductorUserId,
      email: 'conductor.test@zion.cl',
      rol: RolUsuario.CONDUCTOR,
      conductorId
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    // Limpieza de archivos físicos generados durante el test
    for (const urlRelativa of archivosCreadosEnDisco) {
      const rutaRelativa = urlRelativa.replace(/^\/uploads\//, '');
      const storageBase = process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads');
      const rutaAbsoluta = path.join(storageBase, rutaRelativa);
      if (fs.existsSync(rutaAbsoluta)) {
        try {
          fs.unlinkSync(rutaAbsoluta);
        } catch {}
      }
    }
  });

  beforeEach(() => {
    db.inspeccionesSalida.length = 0;
    db.fotosInspeccion.length = 0;
    db.inspeccionesRetorno.length = 0;
    db.auditoriaEventos.length = 0;
  });

  describe('1. POST /api/inspecciones/salida (F-GMT-MAN-004 y Fotos 360°)', () => {
    it('persiste inspección conforme, guarda 4 fotos en disco y almacena URLs cortas (< 80 chars)', async () => {
      const payload = {
        vehiculoId: vehiculoHabilitadoId,
        conductorId,
        kilometraje: 154200,
        horometro: 3450,
        items: [
          {
            categoria: 'MECANICA',
            numero: 1,
            nombre: 'Freno de Servicio',
            estado: 'BUENO',
            esCritico: true
          },
          {
            categoria: 'CABINA',
            numero: 2,
            nombre: 'Espejos Retrovisores',
            estado: 'BUENO',
            esCritico: false
          }
        ],
        fotos360: [
          { tipo: TipoFotoInspeccion.FRONTAL, archivoUrl: VALID_PNG_BASE64 },
          { tipo: TipoFotoInspeccion.LATERAL_IZQUIERDA, archivoUrl: VALID_PNG_BASE64 },
          { tipo: TipoFotoInspeccion.TRASERA, archivoUrl: VALID_PNG_BASE64 },
          { tipo: TipoFotoInspeccion.LATERAL_DERECHA, archivoUrl: VALID_PNG_BASE64 }
        ],
        observaciones: 'Vehículo en óptimas condiciones mecánicas.'
      };

      const res = await fetch(`${baseUrl}/api/inspecciones/salida`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.id).toBeDefined();
      expect(json.data.estado).toBe(EstadoInspeccion.CONFORME);
      expect(json.data.bloqueado).toBe(false);
      expect(json.data.fotosRecibidas).toBe(4);

      // Verificación en base de datos MySQL (mock relacional)
      expect(db.inspeccionesSalida.length).toBe(1);
      const rowInsp = db.inspeccionesSalida[0];
      expect(rowInsp.vehiculoId).toBe(vehiculoHabilitadoId);
      expect(rowInsp.kilometraje).toBe(154200);
      expect(rowInsp.itemsChecklist).toBeDefined();

      // Verificación de fotos en disco y longitud de URL
      expect(db.fotosInspeccion.length).toBe(4);
      const storageBase = process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads');

      for (const foto of db.fotosInspeccion) {
        expect(foto.archivoUrl.startsWith('/uploads/inspecciones/salida/')).toBe(true);
        expect(foto.archivoUrl.length).toBeLessThan(80);
        expect(foto.archivoUrl.length).toBeLessThan(191); // Cumple límite VARCHAR(191)

        archivosCreadosEnDisco.push(foto.archivoUrl);

        // Verificar existencia física en disco
        const rutaRelativa = foto.archivoUrl.replace(/^\/uploads\//, '');
        const rutaFisica = path.join(storageBase, rutaRelativa);
        expect(fs.existsSync(rutaFisica)).toBe(true);
        expect(fs.readFileSync(rutaFisica).length).toBeGreaterThan(0);
      }
    });

    it('bloquea el camión (DESHABILITADO) y registra auditoría cuando existe falla crítica', async () => {
      const payloadCritico = {
        vehiculoId: vehiculoCriticoId,
        conductorId,
        kilometraje: 98000,
        items: [
          {
            categoria: 'MECANICA',
            numero: 4,
            nombre: 'Dirección y terminales',
            estado: 'MALO',
            esCritico: true
          }
        ],
        fotos360: [
          { tipo: TipoFotoInspeccion.FRONTAL, archivoUrl: VALID_PNG_BASE64 },
          { tipo: TipoFotoInspeccion.LATERAL_IZQUIERDA, archivoUrl: VALID_PNG_BASE64 },
          { tipo: TipoFotoInspeccion.TRASERA, archivoUrl: VALID_PNG_BASE64 },
          { tipo: TipoFotoInspeccion.LATERAL_DERECHA, archivoUrl: VALID_PNG_BASE64 }
        ]
      };

      const res = await fetch(`${baseUrl}/api/inspecciones/salida`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify(payloadCritico)
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.bloqueado).toBe(true);
      expect(json.data.estado).toBe(EstadoInspeccion.NO_CONFORME);
      expect(json.data.motivoBloqueo).toContain('Dirección y terminales');

      // Verificar que el vehículo en DB cambió a DESHABILITADO con origen CHECKLIST_SEGURIDAD
      const vehiculoDb = db.vehiculos.get(vehiculoCriticoId);
      expect(vehiculoDb.estado).toBe(EstadoEquipo.DESHABILITADO);
      expect(vehiculoDb.origenBloqueo).toBe(OrigenBloqueo.CHECKLIST_SEGURIDAD);
      expect(vehiculoDb.bloqueadoPorSeguridad).toBe(true);

      // Verificar auditoría
      expect(db.auditoriaEventos.length).toBe(1);
      const evento = db.auditoriaEventos[0];
      expect(evento.accion).toBe('BLOQUEO_SEGURIDAD_CHECKLIST');
      expect(evento.recursoId).toBe(vehiculoCriticoId);
    });

    it('rechaza con error 400 si faltan fotos obligatorias del camión', async () => {
      const payloadFaltante = {
        vehiculoId: vehiculoHabilitadoId,
        conductorId,
        items: [
          { categoria: 'MECANICA', numero: 1, nombre: 'Frenos', estado: 'BUENO', esCritico: true }
        ],
        fotos360: [
          { tipo: TipoFotoInspeccion.FRONTAL, archivoUrl: VALID_PNG_BASE64 }
          // Faltan 3 fotos
        ]
      };

      const res = await fetch(`${baseUrl}/api/inspecciones/salida`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify(payloadFaltante)
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.message).toContain('Faltan fotos obligatorias');
    });
  });

  describe('2. POST /api/inspecciones/fotos-360', () => {
    it('persiste lote de fotos perimetrales en disco y guarda registros en FotoInspeccion', async () => {
      const payload = {
        vehiculoId: vehiculoHabilitadoId,
        fotos: [
          { tipo: TipoFotoInspeccion.FRONTAL, archivoUrl: VALID_PNG_BASE64 },
          { tipo: TipoFotoInspeccion.TRASERA, archivoUrl: VALID_PNG_BASE64 }
        ]
      };

      const res = await fetch(`${baseUrl}/api/inspecciones/fotos-360`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.totalFotos).toBe(2);
      expect(json.data.fotos.length).toBe(2);

      for (const f of json.data.fotos) {
        expect(f.archivoUrl.startsWith('/uploads/inspecciones/salida/')).toBe(true);
        expect(f.archivoUrl.length).toBeLessThan(80);
        archivosCreadosEnDisco.push(f.archivoUrl);
      }
    });
  });

  describe('3. POST /api/inspecciones/retorno', () => {
    it('persiste retorno a planta en MySQL y fotos de cierre en disco', async () => {
      const payload = {
        vehiculoId: vehiculoHabilitadoId,
        conductorId,
        kilometrajeRetorno: 154380,
        horometroRetorno: 3458,
        estadoGeneral: 'CONFORME',
        danosDetectados: 'Sin daños observados durante la jornada',
        herramientasOK: true,
        novedades: 'Jornada completada sin incidentes',
        fotosRetorno: [
          { tipo: TipoFotoInspeccion.FRONTAL, archivoUrl: VALID_PNG_BASE64 },
          { tipo: TipoFotoInspeccion.TRASERA, archivoUrl: VALID_PNG_BASE64 }
        ]
      };

      const res = await fetch(`${baseUrl}/api/inspecciones/retorno`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBeDefined();
      expect(json.data.kilometrajeRetorno).toBe(154380);
      expect(json.data.estadoRetorno).toBe('CONFORME');

      // Verificar registro en DB MySQL
      expect(db.inspeccionesRetorno.length).toBe(1);
      const retornoDb = db.inspeccionesRetorno[0];
      expect(retornoDb.kilometrajeFinal).toBe(154380);
      expect(retornoDb.fotos360Retorno.length).toBe(2);

      const storageBase = process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads');
      for (const foto of retornoDb.fotos360Retorno) {
        expect(foto.archivoUrl.startsWith('/uploads/inspecciones/retorno/')).toBe(true);
        expect(foto.archivoUrl.length).toBeLessThan(80);
        archivosCreadosEnDisco.push(foto.archivoUrl);

        // Verificar que físicamente existe el archivo en disco
        const rutaRelativa = foto.archivoUrl.replace(/^\/uploads\//, '');
        const rutaFisica = path.join(storageBase, rutaRelativa);
        expect(fs.existsSync(rutaFisica)).toBe(true);
      }
    });
  });
});
