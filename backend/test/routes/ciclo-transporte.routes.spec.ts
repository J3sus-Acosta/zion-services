import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import fs from 'fs';
import path from 'path';
import {
  EstadoCicloTransporte,
  EstadoOrdenServicio,
  RolUsuario,
  TipoRecepcion,
  CategoriaDocumento
} from '@prisma/client';
import { TokenService } from '../../src/services/token.service.js';

// Base de datos simulada en memoria para validar el ciclo de terreno relacional
const db = {
  ciclos: new Map<string, any>(),
  ordenes: new Map<string, any>(),
  expedientes: new Map<string, any>(),
  documentos: [] as any[],
  autorizaciones: new Map<string, any>(),
  fotosFaena: [] as any[],
  actas: new Map<string, any>(),
  telemetria: [] as any[]
};

// Mock de Prisma transaccional
vi.mock('../../src/utils/prisma.js', () => {
  const tx = {
    cicloTransporte: {
      findUnique: vi.fn(async ({ where, include }: { where: { id: string }; include?: any }) => {
        const ciclo = db.ciclos.get(where.id);
        if (!ciclo) return null;
        if (include?.ordenServicio) {
          const orden = db.ordenes.get(ciclo.ordenServicioId);
          let exp = null;
          if (orden && include.ordenServicio.include?.expedienteDocumental) {
            for (const e of db.expedientes.values()) {
              if (e.ordenServicioId === orden.id) {
                exp = e;
                break;
              }
            }
          }
          return {
            ...ciclo,
            ordenServicio: orden ? { ...orden, expedienteDocumental: exp } : null
          };
        }
        return { ...ciclo };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
        const ciclo = db.ciclos.get(where.id);
        if (!ciclo) throw new Error(`Ciclo ${where.id} no encontrado`);
        const updated = { ...ciclo, ...data };
        db.ciclos.set(where.id, updated);
        return updated;
      })
    },
    registroTelemetriaGPS: {
      create: vi.fn(async ({ data }: { data: any }) => {
        const record = {
          id: `gps-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ...data,
          timestamp: new Date()
        };
        db.telemetria.push(record);
        return record;
      })
    },
    autorizacionFaena: {
      upsert: vi.fn(async ({ where, update, create }: { where: { cicloTransporteId: string }; update: any; create: any }) => {
        let auth = db.autorizaciones.get(where.cicloTransporteId);
        if (auth) {
          auth = { ...auth, ...update };
        } else {
          auth = { id: `auth-${Date.now()}`, ...create };
        }
        db.autorizaciones.set(where.cicloTransporteId, auth);
        return auth;
      })
    },
    fotoFaenaEPP: {
      create: vi.fn(async ({ data }: { data: any }) => {
        const record = {
          id: `foto-faena-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ...data,
          fechaHora: new Date()
        };
        db.fotosFaena.push(record);
        return record;
      })
    },
    expedienteDocumental: {
      upsert: vi.fn(async ({ where, create }: { where: { ordenServicioId: string }; create: any }) => {
        let exp = null;
        for (const e of db.expedientes.values()) {
          if (e.ordenServicioId === where.ordenServicioId) {
            exp = e;
            break;
          }
        }
        if (!exp) {
          exp = { id: `exp-${Date.now()}`, ...create };
          db.expedientes.set(exp.id, exp);
        }
        return exp;
      })
    },
    documentoExpediente: {
      create: vi.fn(async ({ data }: { data: any }) => {
        const record = {
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ...data,
          fechaCarga: new Date()
        };
        db.documentos.push(record);
        return record;
      })
    },
    actaRecepcion: {
      upsert: vi.fn(async ({ where, update, create }: { where: { cicloTransporteId: string }; update: any; create: any }) => {
        let acta = db.actas.get(where.cicloTransporteId);
        if (acta) {
          acta = { ...acta, ...update };
        } else {
          acta = { id: `acta-${Date.now()}`, ...create };
        }
        db.actas.set(where.cicloTransporteId, acta);
        return acta;
      })
    },
    ordenServicio: {
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
        const orden = db.ordenes.get(where.id);
        if (!orden) throw new Error(`Orden ${where.id} no encontrada`);
        const updated = { ...orden, ...data };
        db.ordenes.set(where.id, updated);
        return updated;
      })
    }
  };

  const client = {
    ...tx,
    $transaction: vi.fn(async (cb: (prismaTx: any) => Promise<any>) => cb(tx))
  };

  return { prisma: client };
});

import { app } from '../../src/app.js';

describe('Pruebas de Integración REST: Módulo Ciclo de Transporte y Terreno (/api/ciclo-transporte)', () => {
  let server: http.Server;
  let baseUrl: string;
  let conductorToken: string;

  const cicloId = 'ciclo-terreno-01';
  const ordenId = 'os-terreno-01';
  const expedienteId = 'exp-terreno-01';

  // Payloads de firmas e imágenes Base64
  const VALID_PNG_BASE64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const VALID_JPEG_BASE64 =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  const archivosCreadosEnDisco: string[] = [];

  beforeAll(async () => {
    // 1. Configurar entidades en mock DB
    db.ordenes.set(ordenId, {
      id: ordenId,
      folio: 'OS-2026-TERRENO',
      estado: EstadoOrdenServicio.EN_EJECUCION
    });

    db.expedientes.set(expedienteId, {
      id: expedienteId,
      ordenServicioId: ordenId,
      completo: false
    });

    db.ciclos.set(cicloId, {
      id: cicloId,
      ordenServicioId: ordenId,
      estado: EstadoCicloTransporte.PENDIENTE,
      horaLlegadaFaena: null,
      horaSalidaFaena: null
    });

    // 2. Levantar servidor Express
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 3. Generar token de conductor
    conductorToken = TokenService.generateAccessToken({
      userId: 'usr-cond-01',
      email: 'conductor@zion.cl',
      rol: RolUsuario.CONDUCTOR,
      conductorId: 'cond-01'
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    // Limpieza de archivos físicos generados
    const storageBase = process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads');
    for (const urlRelativa of archivosCreadosEnDisco) {
      const rutaRelativa = urlRelativa.replace(/^\/uploads\//, '');
      const rutaAbsoluta = path.join(storageBase, rutaRelativa);
      if (fs.existsSync(rutaAbsoluta)) {
        try {
          fs.unlinkSync(rutaAbsoluta);
        } catch {}
      }
    }
  });

  describe('Flujo Completo del Ciclo de Transporte en Faena', () => {
    it('1. POST /api/ciclo-transporte/llegada: actualiza estado a EN_FAENA y persiste telemetría', async () => {
      const payload = {
        cicloTransporteId: cicloId,
        horaLlegada: '2026-11-26T14:30:00Z',
        coordenadas: { lat: -33.4372, lng: -70.6506 }
      };

      const res = await fetch(`${baseUrl}/api/ciclo-transporte/llegada`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.estado).toBe(EstadoCicloTransporte.EN_FAENA);
      expect(json.data.horaLlegada).toBeDefined();

      // Verificar en BD mock
      const cicloDb = db.ciclos.get(cicloId);
      expect(cicloDb.estado).toBe(EstadoCicloTransporte.EN_FAENA);
      expect(cicloDb.horaLlegadaFaena).toBeDefined();

      // Verificar telemetría
      expect(db.telemetria.length).toBe(1);
      expect(db.telemetria[0].latitud).toBe(-33.4372);
      expect(db.telemetria[0].longitud).toBe(-70.6506);
      expect(db.telemetria[0].ordenServicioId).toBe(ordenId);
    });

    it('2. POST /api/ciclo-transporte/autorizar-faena: decodifica firma en disco, crea AutorizacionFaena y habilita FAENA_AUTORIZADA', async () => {
      const payload = {
        cicloTransporteId: cicloId,
        encargadoNombre: 'Carlos',
        encargadoApellido: 'Valenzuela',
        encargadoRut: '15.678.901-2',
        firmaDataUrl: VALID_PNG_BASE64
      };

      const res = await fetch(`${baseUrl}/api/ciclo-transporte/autorizar-faena`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.estado).toBe(EstadoCicloTransporte.FAENA_AUTORIZADA);
      expect(json.data.fotosFaenaPermitidas).toBe(true);

      const urlFirma = json.data.autorizacionFaena.firmaClienteSvg;
      expect(urlFirma.startsWith('/uploads/ciclo-transporte/firmas/')).toBe(true);
      expect(urlFirma.length).toBeLessThan(80);
      archivosCreadosEnDisco.push(urlFirma);

      // Verificar que el archivo físico existe en disco
      const storageBase = process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads');
      const rutaFisica = path.join(storageBase, urlFirma.replace(/^\/uploads\//, ''));
      expect(fs.existsSync(rutaFisica)).toBe(true);
      expect(fs.readFileSync(rutaFisica).length).toBeGreaterThan(0);

      // Verificar AutorizacionFaena en DB
      const authDb = db.autorizaciones.get(cicloId);
      expect(authDb).toBeDefined();
      expect(authDb.nombreCliente).toBe('Carlos Valenzuela');
      expect(authDb.rutCliente).toBe('15.678.901-2');
      expect(authDb.firmaClienteSvg).toBe(urlFirma);

      // Verificar Ciclo actualizado
      const cicloDb = db.ciclos.get(cicloId);
      expect(cicloDb.estado).toBe(EstadoCicloTransporte.FAENA_AUTORIZADA);
    });

    it('3. POST /api/ciclo-transporte/evidencias: guarda foto en disco, inserta FotoFaenaEPP e indexa en DocumentoExpediente', async () => {
      const payload = {
        cicloTransporteId: cicloId,
        archivoUrl: VALID_JPEG_BASE64,
        descripcion: 'Inspección de Cuadrilla con EPP completo',
        estadoCiclo: EstadoCicloTransporte.FAENA_AUTORIZADA
      };

      const res = await fetch(`${baseUrl}/api/ciclo-transporte/evidencias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.registrado).toBe(true);

      const urlFoto = json.data.archivoUrl;
      expect(urlFoto.startsWith('/uploads/ciclo-transporte/fotos/')).toBe(true);
      expect(urlFoto.length).toBeLessThan(80);
      archivosCreadosEnDisco.push(urlFoto);

      // Verificar existencia física en disco
      const storageBase = process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads');
      const rutaFisica = path.join(storageBase, urlFoto.replace(/^\/uploads\//, ''));
      expect(fs.existsSync(rutaFisica)).toBe(true);

      // Verificar FotoFaenaEPP en DB
      expect(db.fotosFaena.length).toBe(1);
      expect(db.fotosFaena[0].cicloTransporteId).toBe(cicloId);
      expect(db.fotosFaena[0].archivoUrl).toBe(urlFoto);

      // Verificar indexación en DocumentoExpediente
      expect(db.documentos.length).toBe(1);
      const doc = db.documentos[0];
      expect(doc.categoria).toBe(CategoriaDocumento.FOTO_EPP_SEGURIDAD);
      expect(doc.rutaAlmacenamiento).toBe(urlFoto);
      expect(doc.expedienteDocumentalId).toBe(expedienteId);
    });

    it('4. POST /api/ciclo-transporte/recepcion-conforme: firma acta en disco, actualiza Ciclo a RETIRO_COMPLETADO y Orden a EJECUTADA', async () => {
      const payload = {
        cicloTransporteId: cicloId,
        tipoRecepcion: TipoRecepcion.CONFORME,
        nombreFirmante: 'Carlos Valenzuela',
        rutFirmante: '15.678.901-2',
        firmaDataUrl: VALID_PNG_BASE64,
        observaciones: 'Servicio de retiro completado en su totalidad a plena satisfacción.'
      };

      const res = await fetch(`${baseUrl}/api/ciclo-transporte/recepcion-conforme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.estado).toBe(EstadoCicloTransporte.RETIRO_COMPLETADO);
      expect(json.data.actaRecepcion.tipo).toBe(TipoRecepcion.CONFORME);

      const urlFirmaActa = json.data.actaRecepcion.firmaSvg;
      expect(urlFirmaActa.startsWith('/uploads/ciclo-transporte/actas/')).toBe(true);
      expect(urlFirmaActa.length).toBeLessThan(80);
      archivosCreadosEnDisco.push(urlFirmaActa);

      // Verificar existencia física en disco
      const storageBase = process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads');
      const rutaFisica = path.join(storageBase, urlFirmaActa.replace(/^\/uploads\//, ''));
      expect(fs.existsSync(rutaFisica)).toBe(true);

      // Verificar ActaRecepcion en DB
      const actaDb = db.actas.get(cicloId);
      expect(actaDb).toBeDefined();
      expect(actaDb.nombreFirmante).toBe('Carlos Valenzuela');
      expect(actaDb.firmaSvg).toBe(urlFirmaActa);

      // Verificar Ciclo actualizado a RETIRO_COMPLETADO
      const cicloDb = db.ciclos.get(cicloId);
      expect(cicloDb.estado).toBe(EstadoCicloTransporte.RETIRO_COMPLETADO);
      expect(cicloDb.horaSalidaFaena).toBeDefined();

      // Verificar OrdenServicio sincronizada a EJECUTADA
      const ordenDb = db.ordenes.get(ordenId);
      expect(ordenDb.estado).toBe(EstadoOrdenServicio.EJECUTADA);

      // Verificar indexación de acta en DocumentoExpediente
      const docActa = db.documentos.find((d) => d.categoria === CategoriaDocumento.ACTA_RECEPCION_FIRMADA);
      expect(docActa).toBeDefined();
      expect(docActa.rutaAlmacenamiento).toBe(urlFirmaActa);
    });

    it('5. Rechaza autorizar faena sin trazo de firma táctil', async () => {
      const payloadInvalido = {
        cicloTransporteId: cicloId,
        encargadoNombre: 'Carlos',
        encargadoApellido: 'Valenzuela',
        encargadoRut: '15.678.901-2',
        firmaDataUrl: ''
      };

      const res = await fetch(`${baseUrl}/api/ciclo-transporte/autorizar-faena`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify(payloadInvalido)
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('MISSING_SIGNATURE');
    });
  });
});
