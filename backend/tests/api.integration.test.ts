import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import app from '../src/index.js';
import { seedDemoData } from '../prisma/seed.js';
import { TokenService } from '../src/services/token.service.js';
import { RolUsuario, TipoFotoInspeccion, TipoRecepcion, CategoriaDocumento } from '@prisma/client';
import { prisma } from '../src/utils/prisma.js';

describe('Pruebas de Integración REST: Inspección, Ciclo de Transporte y Expediente', () => {
  let server: http.Server;
  let baseUrl: string;
  let conductorToken: string;
  let clienteToken: string;
  let superadminToken: string;
  let ordenTestId: string;
  let ordenFolio: string;

  beforeAll(async () => {
    // 1. Inicializar BD con seed
    await seedDemoData();

    // 2. Levantar servidor en puerto aleatorio
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 3. Generar tokens JWT para diferentes roles
    conductorToken = TokenService.generateAccessToken({
      userId: 'usr-conductor-01',
      email: 'conductor@zion.cl',
      rol: RolUsuario.CONDUCTOR,
      conductorId: 'cond-01'
    });

    clienteToken = TokenService.generateAccessToken({
      userId: 'usr-cliente-01',
      email: 'cliente@horse.cl',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-horse'
    });

    superadminToken = TokenService.generateAccessToken({
      userId: 'usr-superadmin-01',
      email: 'superadmin@zion.cl',
      rol: RolUsuario.SUPERADMIN
    });

    // 4. Crear una Solicitud y Orden de Servicio de prueba para el flujo
    await prisma.sucursalFaena.upsert({
      where: { id: 'suc-test-horse' },
      update: {},
      create: {
        id: 'suc-test-horse',
        empresaClienteId: 'empresa-horse',
        nombre: 'Faena Quilicura',
        direccion: 'Av. Industrial 500',
        comuna: 'Quilicura',
        ciudad: 'Santiago',
        region: 'Metropolitana'
      }
    });

    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const solicitud = await prisma.solicitudServicio.create({
      data: {
        folio: `SOL-API-INT-${uniqueSuffix}`,
        empresaClienteId: 'empresa-horse',
        sucursalFaenaId: 'suc-test-horse',
        tipoResiduo: 'Aguas hidrocarburadas',
        fechaPreferente: new Date()
      }
    });

    ordenFolio = `OS-API-INT-${uniqueSuffix}`;
    const orden = await prisma.ordenServicio.create({
      data: {
        folio: ordenFolio,
        solicitudServicioId: solicitud.id,
        cicloTransporte: {
          create: {}
        },
        expediente: {
          create: {}
        }
      },
      include: {
        cicloTransporte: true,
        expediente: true
      }
    });

    ordenTestId = orden.id;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // -------------------------------------------------------------
  // GRUPO 2.1: INSPECCIÓN PREOPERACIONAL Y RETORNO
  // -------------------------------------------------------------
  describe('Endpoints de Inspección (F-GMT-MAN-004 y 360°)', () => {
    it('POST /api/inspecciones/salida: evalúa checklist preoperacional conforme', async () => {
      const payload = {
        vehiculoId: 'veh-01',
        conductorId: 'cond-01',
        kilometraje: 125000,
        horometro: 4500,
        items: [
          { categoria: 'MECANICA', numero: 1, nombre: 'Frenos de servicio', estado: 'BUENO', esCritico: true },
          { categoria: 'CABINA', numero: 2, nombre: 'Luces y señalizadores', estado: 'BUENO', esCritico: false }
        ],
        fotos360: [
          { tipo: TipoFotoInspeccion.FRONTAL, archivoUrl: '/uploads/360/frontal.jpg' },
          { tipo: TipoFotoInspeccion.LATERAL_IZQUIERDA, archivoUrl: '/uploads/360/lat_izq.jpg' },
          { tipo: TipoFotoInspeccion.TRASERA, archivoUrl: '/uploads/360/trasera.jpg' },
          { tipo: TipoFotoInspeccion.LATERAL_DERECHA, archivoUrl: '/uploads/360/lat_der.jpg' }
        ]
      };

      const res = await fetch(`${baseUrl}/api/inspecciones/salida`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${conductorToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.bloqueado).toBe(false);
      expect(json.data.estado).toBe('CONFORME');
      expect(json.data.fotosRecibidas).toBe(4);
    });

    it('POST /api/inspecciones/salida: detecta fallas críticas y bloquea el camión', async () => {
      const payloadFalla = {
        vehiculoId: 'veh-01',
        conductorId: 'cond-01',
        items: [
          { categoria: 'MECANICA', numero: 1, nombre: 'Frenos de servicio', estado: 'MALO', esCritico: true }
        ],
        fotos360: [
          { tipo: TipoFotoInspeccion.FRONTAL, archivoUrl: '/uploads/360/f.jpg' },
          { tipo: TipoFotoInspeccion.LATERAL_IZQUIERDA, archivoUrl: '/uploads/360/li.jpg' },
          { tipo: TipoFotoInspeccion.TRASERA, archivoUrl: '/uploads/360/t.jpg' },
          { tipo: TipoFotoInspeccion.LATERAL_DERECHA, archivoUrl: '/uploads/360/ld.jpg' }
        ]
      };

      const res = await fetch(`${baseUrl}/api/inspecciones/salida`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${conductorToken}`
        },
        body: JSON.stringify(payloadFalla)
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.bloqueado).toBe(true);
      expect(json.data.estado).toBe('NO_CONFORME');
      expect(json.data.motivoBloqueo).toContain('Frenos de servicio');
    });

    it('POST /api/inspecciones/retorno: registra el retorno a planta', async () => {
      const res = await fetch(`${baseUrl}/api/inspecciones/retorno`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${conductorToken}`
        },
        body: JSON.stringify({
          vehiculoId: 'veh-01',
          kilometrajeRetorno: 125150,
          horometroRetorno: 4508,
          nivelCombustible: '1/2'
        })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.estadoRetorno).toBe('CONFORME');
    });
  });

  // -------------------------------------------------------------
  // GRUPO 2.2: CICLO DE TRANSPORTE Y FIRMA TÁCTIL (CU-16, CU-17, CU-18, CU-19)
  // -------------------------------------------------------------
  describe('Endpoints del Ciclo de Transporte y Firma Táctil', () => {
    const cicloId = 'ciclo-test-01';

    it('POST /api/ciclo-transporte/llegada: marca llegada a faena (CU-16)', async () => {
      const res = await fetch(`${baseUrl}/api/ciclo-transporte/llegada`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${conductorToken}`
        },
        body: JSON.stringify({
          cicloTransporteId: cicloId,
          horaLlegada: new Date().toISOString(),
          coordenadas: { lat: -33.35, lng: -70.71 }
        })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.estado).toBe('EN_FAENA');
    });

    it('POST /api/ciclo-transporte/autorizar-faena: valida campos obligatorios de encargado y trazo táctil (CU-17)', async () => {
      // Intento sin RUT ni firma
      const resInvalido = await fetch(`${baseUrl}/api/ciclo-transporte/autorizar-faena`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${conductorToken}`
        },
        body: JSON.stringify({
          cicloTransporteId: cicloId,
          encargadoNombre: 'Juan'
        })
      });

      expect(resInvalido.status).toBe(400);

      // Con todos los datos obligatorios (Nombre, Apellido, RUT, Trazo táctil)
      const resValido = await fetch(`${baseUrl}/api/ciclo-transporte/autorizar-faena`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${conductorToken}`
        },
        body: JSON.stringify({
          cicloTransporteId: cicloId,
          encargadoNombre: 'Juan',
          encargadoApellido: 'Pérez Silva',
          encargadoRut: '15.678.901-2',
          firmaDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        })
      });

      expect(resValido.status).toBe(200);
      const json = await resValido.json();
      expect(json.data.estado).toBe('FAENA_AUTORIZADA');
      expect(json.data.encargado.nombre).toBe('Juan');
      expect(json.data.encargado.apellido).toBe('Pérez Silva');
      expect(json.data.encargado.rut).toBe('15.678.901-2');
      expect(json.data.fotosFaenaPermitidas).toBe(true);
    });

    it('POST /api/ciclo-transporte/evidencias: registra fotografía de faena (CU-18)', async () => {
      const res = await fetch(`${baseUrl}/api/ciclo-transporte/evidencias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${conductorToken}`
        },
        body: JSON.stringify({
          cicloTransporteId: cicloId,
          archivoUrl: '/uploads/faena/succion_estanque_1.jpg',
          descripcion: 'Succión estanque sedimentador 1'
        })
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.registrado).toBe(true);
    });

    it('POST /api/ciclo-transporte/recepcion-conforme: emite acta de recepción conforme (CU-19)', async () => {
      const res = await fetch(`${baseUrl}/api/ciclo-transporte/recepcion-conforme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${conductorToken}`
        },
        body: JSON.stringify({
          cicloTransporteId: cicloId,
          tipoRecepcion: TipoRecepcion.CONFORME,
          nombreFirmante: 'Juan Pérez Silva',
          rutFirmante: '15.678.901-2',
          firmaDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.estado).toBe('RETIRO_COMPLETADO');
    });
  });

  // -------------------------------------------------------------
  // GRUPO 2.3 & 2.4: SOLICITUDES, ÓRDENES Y EXPEDIENTE
  // -------------------------------------------------------------
  describe('Endpoints Comerciales y Expediente Documental (CU-26)', () => {
    it('POST /api/solicitudes: cliente crea solicitud y se aísla por tenant', async () => {
      const res = await fetch(`${baseUrl}/api/solicitudes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clienteToken}`
        },
        body: JSON.stringify({
          tipoResiduo: 'Aceites Usados',
          descripcion: 'Retiro programado de 2 m3 de aceites',
          cantidadEstimada: 2000
        })
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.empresaClienteId).toBe('empresa-horse');
      expect(json.data.tipoResiduo).toBe('Aceites Usados');
    });

    it('POST /api/expedientes/:ordenId/documentos: indexa documento en tiempo real', async () => {
      const res = await fetch(`${baseUrl}/api/expedientes/${ordenTestId}/documentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${conductorToken}`
        },
        body: JSON.stringify({
          categoria: CategoriaDocumento.FOTO_FAENA_PROCESO,
          nombreArchivo: 'evidencia_succion_01.jpg',
          mimeType: 'image/jpeg',
          pesoBytes: 154200,
          rutaAlmacenamiento: '/uploads/faena/evidencia_succion_01.jpg'
        })
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.nombreArchivo).toBe('evidencia_succion_01.jpg');
    });

    it('GET /api/expedientes/:ordenId/en-vivo: devuelve el expediente con fotos centralizadas', async () => {
      const res = await fetch(`${baseUrl}/api/expedientes/${ordenTestId}/en-vivo`, {
        headers: {
          'Authorization': `Bearer ${clienteToken}`
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.folio).toBe(ordenFolio);
      expect(json.data.totalDocumentos).toBeGreaterThanOrEqual(1);
      expect(json.data.secciones.fotografiasEnVivo.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/expedientes/:ordenId/descargar-zip: genera stream ZIP del expediente completo', async () => {
      const res = await fetch(`${baseUrl}/api/expedientes/${ordenTestId}/descargar-zip`, {
        headers: {
          'Authorization': `Bearer ${clienteToken}`
        }
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/zip');
      const arrayBuffer = await res.arrayBuffer();
      expect(arrayBuffer.byteLength).toBeGreaterThan(0);
    });

    it('GET /api/expedientes/:ordenId/en-vivo: bloquea acceso si pertenece a otra empresa (Tenant Isolation)', async () => {
      const otroClienteToken = TokenService.generateAccessToken({
        userId: 'usr-cliente-otro',
        email: 'otro@bravo.cl',
        rol: RolUsuario.CLIENTE,
        empresaClienteId: 'empresa-bravo-energy'
      });

      const res = await fetch(`${baseUrl}/api/expedientes/${ordenTestId}/en-vivo`, {
        headers: {
          'Authorization': `Bearer ${otroClienteToken}`
        }
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });
  });

  describe('Endpoints de Administración de Usuarios y Logout (REST)', () => {
    it('POST /api/auth/logout: limpia cookies de autenticación (zion_auth_token / satem_auth_token) y responde 200', async () => {
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST'
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.message).toContain('Sesión cerrada');
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeDefined();
    });

    it('PATCH /api/usuarios/:id/password: permite cambiar contraseña como SUPERADMIN y valida complejidad', async () => {
      // 1. Error 400 por contraseña muy corta o sin números
      const resInvalido = await fetch(`${baseUrl}/api/usuarios/usr-conductor-01/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${superadminToken}`
        },
        body: JSON.stringify({ password: 'corta' })
      });
      expect(resInvalido.status).toBe(400);

      // 2. Éxito 200 con contraseña válida
      const resValido = await fetch(`${baseUrl}/api/usuarios/usr-conductor-01/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${superadminToken}`
        },
        body: JSON.stringify({ password: 'NuevaPassword2026!' })
      });
      expect(resValido.status).toBe(200);
      const jsonValido = await resValido.json();
      expect(jsonValido.data.usuario.id).toBe('usr-conductor-01');

      // 3. Error 403 si un CONDUCTOR intenta cambiar password administrativa
      const resForbidden = await fetch(`${baseUrl}/api/usuarios/usr-conductor-01/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${conductorToken}`
        },
        body: JSON.stringify({ password: 'IntentoHacking2026!' })
      });
      expect(resForbidden.status).toBe(403);
    });

    it('PATCH /api/usuarios/:id/rol: permite reasignar rol y rechaza roles sin empresa para CLIENTE', async () => {
      // 1. Error 403 para rol no autorizado
      const resForbidden = await fetch(`${baseUrl}/api/usuarios/usr-conductor-01/rol`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${conductorToken}`
        },
        body: JSON.stringify({ rol: 'ADMIN' })
      });
      expect(resForbidden.status).toBe(403);

      // 2. Cambio exitoso a COMERCIAL por SUPERADMIN
      const resComercial = await fetch(`${baseUrl}/api/usuarios/usr-conductor-01/rol`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${superadminToken}`
        },
        body: JSON.stringify({ rol: 'COMERCIAL' })
      });
      expect(resComercial.status).toBe(200);
      const jsonComercial = await resComercial.json();
      expect(jsonComercial.data.usuario.rol).toBe('COMERCIAL');

      // Restaurar rol CONDUCTOR para tests posteriores
      await fetch(`${baseUrl}/api/usuarios/usr-conductor-01/rol`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${superadminToken}`
        },
        body: JSON.stringify({ rol: 'CONDUCTOR' })
      });
    });
  });
});
