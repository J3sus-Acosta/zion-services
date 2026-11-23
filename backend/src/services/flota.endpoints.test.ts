import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import app from '../index.js';
import { TokenService } from './token.service.js';
import { RolUsuario, TipoEquipo, EstadoEquipo, OrigenBloqueo } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

describe('Endpoints de Flota y Notificaciones de Conductor (REST & RBAC)', () => {
  let server: http.Server;
  let baseUrl: string;

  let superadminToken: string;
  let adminToken: string;
  let jefeOpsToken: string;
  let operacionesToken: string;
  let comercialToken: string;
  let conductorToken: string;
  let clienteToken: string;
  let conductorUserId: string;

  beforeAll(async () => {
    // 1. Levantar servidor en puerto efímero
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 2. Localizar o asegurar conductor y usuarios
    const conductor = await prisma.conductor.findFirst({
      include: { usuario: true }
    });
    conductorUserId = conductor ? conductor.usuario.id : 'usr-conductor-01';

    // 3. Generar tokens JWT
    superadminToken = TokenService.generateAccessToken({
      userId: 'usr-superadmin-01',
      email: 'superadmin@zion.cl',
      rol: RolUsuario.SUPERADMIN
    });

    adminToken = TokenService.generateAccessToken({
      userId: 'usr-admin-01',
      email: 'admin@zion.cl',
      rol: RolUsuario.ADMIN
    });

    jefeOpsToken = TokenService.generateAccessToken({
      userId: 'usr-jefe-ops-01',
      email: 'jefe@zion.cl',
      rol: RolUsuario.JEFE_OPERACIONES
    });

    operacionesToken = TokenService.generateAccessToken({
      userId: 'usr-ops-01',
      email: 'operaciones@zion.cl',
      rol: RolUsuario.OPERACIONES
    });

    comercialToken = TokenService.generateAccessToken({
      userId: 'usr-comercial-01',
      email: 'comercial@zion.cl',
      rol: RolUsuario.COMERCIAL
    });

    conductorToken = TokenService.generateAccessToken({
      userId: conductorUserId,
      email: 'conductor@zion.cl',
      rol: RolUsuario.CONDUCTOR,
      conductorId: conductor ? conductor.id : 'cond-01'
    });

    clienteToken = TokenService.generateAccessToken({
      userId: 'usr-cliente-01',
      email: 'cliente@zion.cl',
      rol: RolUsuario.CLIENTE
    });

    // Asegurar usuario para prueba de Rate Limiting
    await prisma.usuario.upsert({
      where: { id: 'usr-ratelimit-admin' },
      update: {},
      create: {
        id: 'usr-ratelimit-admin',
        email: 'ratelimit@zion.cl',
        passwordHash: 'hash-demo',
        nombre: 'Rate',
        apellido: 'Limit',
        rut: '99.999.999-9',
        rol: RolUsuario.ADMIN,
        activo: true
      }
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('Control de Acceso (RBAC) en /api/flota', () => {
    it('debe rechazar solicitudes sin token con 401 UNAUTHORIZED', async () => {
      const res = await fetch(`${baseUrl}/api/flota`);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('debe denegar acceso a roles OPERACIONES, COMERCIAL, CONDUCTOR y CLIENTE con 403 FORBIDDEN', async () => {
      const resOperaciones = await fetch(`${baseUrl}/api/flota`, {
        headers: { Authorization: `Bearer ${operacionesToken}` }
      });
      expect(resOperaciones.status).toBe(403);
      const jsonOps = await resOperaciones.json();
      expect(jsonOps.error.code).toBe('FORBIDDEN');

      const resComercial = await fetch(`${baseUrl}/api/flota`, {
        headers: { Authorization: `Bearer ${comercialToken}` }
      });
      expect(resComercial.status).toBe(403);
      const jsonCom = await resComercial.json();
      expect(jsonCom.error.code).toBe('FORBIDDEN');

      const resConductor = await fetch(`${baseUrl}/api/flota`, {
        headers: { Authorization: `Bearer ${conductorToken}` }
      });
      expect(resConductor.status).toBe(403);
      const jsonCond = await resConductor.json();
      expect(jsonCond.error.code).toBe('FORBIDDEN');

      const resCliente = await fetch(`${baseUrl}/api/flota`, {
        headers: { Authorization: `Bearer ${clienteToken}` }
      });
      expect(resCliente.status).toBe(403);
    });

    it('debe permitir acceso de lectura y escritura a SUPERADMIN, ADMIN y JEFE_OPERACIONES', async () => {
      const resSuper = await fetch(`${baseUrl}/api/flota`, {
        headers: { Authorization: `Bearer ${superadminToken}` }
      });
      expect(resSuper.status).toBe(200);

      const resAdmin = await fetch(`${baseUrl}/api/flota`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(resAdmin.status).toBe(200);

      const resJefe = await fetch(`${baseUrl}/api/flota`, {
        headers: { Authorization: `Bearer ${jefeOpsToken}` }
      });
      expect(resJefe.status).toBe(200);
    });
  });

  describe('CRUD y operaciones sobre /api/flota', () => {
    let vehiculoTestId: string;
    const testPatente = `FL-${Date.now().toString().slice(-4)}`;

    it('POST /api/flota: crea un nuevo equipo', async () => {
      const res = await fetch(`${baseUrl}/api/flota`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jefeOpsToken}`
        },
        body: JSON.stringify({
          patente: testPatente,
          tipoEquipo: TipoEquipo.CAMION,
          marca: 'Scania',
          modelo: 'P410',
          anio: 2022,
          capacidadEstanqueM3: 20,
          equipoHidrojet: true,
          equipoVacio: false
        })
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.equipo.patente).toBe(testPatente);
      expect(json.data.equipo.estado).toBe(EstadoEquipo.HABILITADO);
      vehiculoTestId = json.data.equipo.id;
    });

    it('GET /api/flota/:id: obtiene el detalle de un equipo', async () => {
      const res = await fetch(`${baseUrl}/api/flota/${vehiculoTestId}`, {
        headers: { Authorization: `Bearer ${jefeOpsToken}` }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.equipo.id).toBe(vehiculoTestId);
      expect(json.data.equipo.patente).toBe(testPatente);
    });

    it('PATCH /api/flota/:id: actualiza características (no admite estado)', async () => {
      const res = await fetch(`${baseUrl}/api/flota/${vehiculoTestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jefeOpsToken}`
        },
        body: JSON.stringify({
          observaciones: 'Inspección técnica anual aprobada'
        })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.equipo.observaciones).toBe('Inspección técnica anual aprobada');

      // Intentar enviar estado en este endpoint debe ser rechazado con 400 por Zod .strict()
      const resEstadoProhibido = await fetch(`${baseUrl}/api/flota/${vehiculoTestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jefeOpsToken}`
        },
        body: JSON.stringify({
          estado: 'DESHABILITADO'
        })
      });
      expect(resEstadoProhibido.status).toBe(400);
    });

    it('DELETE /api/flota/:id y PUT /api/flota/:id: deben responder 405 Method Not Allowed', async () => {
      const resDel = await fetch(`${baseUrl}/api/flota/${vehiculoTestId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superadminToken}` }
      });
      expect(resDel.status).toBe(405);

      const resPut = await fetch(`${baseUrl}/api/flota/${vehiculoTestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminToken}`
        },
        body: JSON.stringify({})
      });
      expect(resPut.status).toBe(405);
    });

    it('GET /api/flota/:id/operaciones-afectadas: retorna jornadas y candidatos', async () => {
      const res = await fetch(`${baseUrl}/api/flota/${vehiculoTestId}/operaciones-afectadas`, {
        headers: { Authorization: `Bearer ${jefeOpsToken}` }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.jornadas).toBeDefined();
      expect(json.data.candidatos).toBeDefined();
      expect(Array.isArray(json.data.candidatos)).toBe(true);
    });

    it('PATCH /api/flota/:id/estado: deshabilitar y luego habilitar', async () => {
      // 1. Deshabilitar
      const resDes = await fetch(`${baseUrl}/api/flota/${vehiculoTestId}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jefeOpsToken}`
        },
        body: JSON.stringify({
          estado: 'DESHABILITADO',
          motivo: 'Mantenimiento correctivo de frenos'
        })
      });

      expect(resDes.status).toBe(200);
      const jsonDes = await resDes.json();
      expect(jsonDes.data.equipo.estado).toBe('DESHABILITADO');
      expect(jsonDes.data.equipo.motivoEstado).toBe('Mantenimiento correctivo de frenos');
      expect(jsonDes.data.equipo.origenBloqueo).toBe('MANUAL');

      // 2. Habilitar
      const resHab = await fetch(`${baseUrl}/api/flota/${vehiculoTestId}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jefeOpsToken}`
        },
        body: JSON.stringify({
          estado: 'HABILITADO'
        })
      });

      expect(resHab.status).toBe(200);
      const jsonHab = await resHab.json();
      expect(jsonHab.data.equipo.estado).toBe('HABILITADO');
      expect(jsonHab.data.equipo.motivoEstado).toBeNull();
      expect(jsonHab.data.equipo.origenBloqueo).toBeNull();
    });

    it('PATCH /api/flota/:id/estado: detecta conflicto de estado si ya está en el estado solicitado (409 FLEET_STATE_CONFLICT)', async () => {
      // El equipo ya se encuentra HABILITADO
      const res = await fetch(`${baseUrl}/api/flota/${vehiculoTestId}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jefeOpsToken}`
        },
        body: JSON.stringify({
          estado: 'HABILITADO'
        })
      });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe('FLEET_STATE_CONFLICT');
    });

    it('PATCH /api/flota/:id/estado: deshabilitar con jornadas activas sin destino responde 409 FLEET_TRANSFER_REQUIRED', async () => {
      const conductor = await prisma.conductor.findFirst();
      if (!conductor) return;

      // Crear jornada sobre el equipo
      await prisma.jornada.create({
        data: {
          vehiculoId: vehiculoTestId,
          conductorId: conductor.id,
          fechaInicio: new Date(),
          modalidad: 'LOCAL_SANTIAGO',
          estado: 'PROGRAMADA'
        }
      });

      const res = await fetch(`${baseUrl}/api/flota/${vehiculoTestId}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jefeOpsToken}`
        },
        body: JSON.stringify({
          estado: 'DESHABILITADO',
          motivo: 'Falla técnica súbita'
        })
      });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe('FLEET_TRANSFER_REQUIRED');
    });

    it('PATCH /api/flota/:id/estado (Regla R1): JEFE_OPERACIONES recibe 403 FLEET_UNLOCK_FORBIDDEN ante CHECKLIST_SEGURIDAD y ADMIN lo levanta', async () => {
      const equipoBloqueado = await prisma.vehiculo.create({
        data: {
          patente: `R1-${Date.now().toString().slice(-4)}`,
          tipoEquipo: TipoEquipo.CAMION,
          marca: 'Volvo',
          modelo: 'FM',
          anio: 2021,
          capacidadEstanqueM3: 20,
          estado: EstadoEquipo.DESHABILITADO,
          motivoEstado: 'Falla crítica en dirección',
          origenBloqueo: OrigenBloqueo.CHECKLIST_SEGURIDAD
        }
      });

      // 1. Intento por JEFE_OPERACIONES -> 403 FLEET_UNLOCK_FORBIDDEN
      const resJefe = await fetch(`${baseUrl}/api/flota/${equipoBloqueado.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jefeOpsToken}`
        },
        body: JSON.stringify({
          estado: 'HABILITADO'
        })
      });

      expect(resJefe.status).toBe(403);
      const jsonJefe = await resJefe.json();
      expect(jsonJefe.error.code).toBe('FLEET_UNLOCK_FORBIDDEN');

      // 2. Desbloqueo por ADMIN -> 200 OK
      const resAdmin = await fetch(`${baseUrl}/api/flota/${equipoBloqueado.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          estado: 'HABILITADO'
        })
      });

      expect(resAdmin.status).toBe(200);
      const jsonAdmin = await resAdmin.json();
      expect(jsonAdmin.data.equipo.estado).toBe('HABILITADO');
    });

    it('POST /api/flota/:id/transferir: reasigna jornadas sin alterar estado del origen y 409 si no hay jornadas', async () => {
      const conductor = await prisma.conductor.findFirst();
      if (!conductor) return;

      const origen = await prisma.vehiculo.create({
        data: {
          patente: `TX1-${Date.now().toString().slice(-4)}`,
          tipoEquipo: TipoEquipo.CAMION,
          marca: 'Volvo',
          modelo: 'FM',
          anio: 2021,
          capacidadEstanqueM3: 20,
          estado: EstadoEquipo.DESHABILITADO,
          motivoEstado: 'Bloqueado por seguridad',
          origenBloqueo: OrigenBloqueo.CHECKLIST_SEGURIDAD
        }
      });

      const destino = await prisma.vehiculo.create({
        data: {
          patente: `TX2-${Date.now().toString().slice(-4)}`,
          tipoEquipo: TipoEquipo.CAMION,
          marca: 'Scania',
          modelo: 'G450',
          anio: 2022,
          capacidadEstanqueM3: 20,
          estado: EstadoEquipo.HABILITADO
        }
      });

      const jActiva = await prisma.jornada.create({
        data: {
          vehiculoId: origen.id,
          conductorId: conductor.id,
          fechaInicio: new Date(),
          modalidad: 'LOCAL_SANTIAGO',
          estado: 'PROGRAMADA'
        }
      });

      // Transferir vía endpoint
      const res = await fetch(`${baseUrl}/api/flota/${origen.id}/transferir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jefeOpsToken}`
        },
        body: JSON.stringify({
          vehiculoDestinoId: destino.id
        })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.transferencia.jornadasTransferidas).toContain(jActiva.id);

      // Origen sigue DESHABILITADO
      const origenBD = await prisma.vehiculo.findUnique({ where: { id: origen.id } });
      expect(origenBD?.estado).toBe(EstadoEquipo.DESHABILITADO);

      // Si se intenta transferir nuevamente cuando ya no hay operaciones activas -> 409 FLEET_NO_ACTIVE_OPERATIONS
      const resVacio = await fetch(`${baseUrl}/api/flota/${origen.id}/transferir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jefeOpsToken}`
        },
        body: JSON.stringify({
          vehiculoDestinoId: destino.id
        })
      });

      expect(resVacio.status).toBe(409);
      const jsonVacio = await resVacio.json();
      expect(jsonVacio.error.code).toBe('FLEET_NO_ACTIVE_OPERATIONS');
    });
  });

  describe('Rate Limiting en /api/flota (D14)', () => {
    it('debe responder 429 con Retry-After y código RATE_LIMITED si se superan 30 mutaciones en un minuto', async () => {
      // Generar token específico para aislar el contador de rate limit
      const rateLimitUserToken = TokenService.generateAccessToken({
        userId: 'usr-ratelimit-admin',
        email: 'ratelimit@zion.cl',
        rol: RolUsuario.ADMIN
      });

      // Realizar 30 solicitudes de mutación válidas/rápidas
      const promesas = [];
      for (let i = 0; i < 30; i++) {
        promesas.push(
          fetch(`${baseUrl}/api/flota`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${rateLimitUserToken}`
            },
            body: JSON.stringify({
              patente: `RL-${Date.now().toString().slice(-4)}-${i}`,
              tipoEquipo: TipoEquipo.CAMIONETA,
              marca: 'Toyota',
              modelo: 'Hilux',
              anio: 2022,
              capacidadEstanqueM3: 0
            })
          })
        );
      }
      await Promise.all(promesas);

      // La solicitud 31 debe ser bloqueada por rate limiting
      const resExcedida = await fetch(`${baseUrl}/api/flota`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rateLimitUserToken}`
        },
        body: JSON.stringify({
          patente: `RL-EX-${Date.now().toString().slice(-4)}`,
          tipoEquipo: TipoEquipo.CAMIONETA,
          marca: 'Toyota',
          modelo: 'Hilux',
          anio: 2022,
          capacidadEstanqueM3: 0
        })
      });

      expect(resExcedida.status).toBe(429);
      expect(resExcedida.headers.get('Retry-After')).toBeDefined();
      const json = await resExcedida.json();
      expect(json.error.code).toBe('RATE_LIMITED');
      expect(json.error.message).toContain('Límite de operaciones sobre flota superado');
    });
  });

  describe('Notificaciones de Conductor (/api/conductores/notificaciones)', () => {
    let notifId: string;

    beforeAll(async () => {
      // Crear notificación in-app para el conductor de pruebas
      const notif = await prisma.notificacionConductor.create({
        data: {
          conductorId: conductorUserId,
          tipo: 'TRANSFERENCIA_FLOTA',
          titulo: 'Equipo Reasignado',
          mensaje: 'Se le ha asignado un nuevo equipo para su jornada.',
          leida: false
        }
      });
      notifId = notif.id;
    });

    it('GET /api/conductores/notificaciones: conductor consulta sus notificaciones', async () => {
      const res = await fetch(`${baseUrl}/api/conductores/notificaciones`, {
        headers: { Authorization: `Bearer ${conductorToken}` }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data.notificaciones)).toBe(true);
      expect(json.data.notificaciones.some((n: any) => n.id === notifId)).toBe(true);
    });

    it('PATCH /api/conductores/notificaciones/:id/leida: conductor marca como leída', async () => {
      const res = await fetch(`${baseUrl}/api/conductores/notificaciones/${notifId}/leida`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${conductorToken}` }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.notificacion.leida).toBe(true);
    });
  });

  describe('Integración Checklist F-GMT con Flota (/api/inspecciones/salida)', () => {
    it('debe rechazar inspección con 409 FLEET_DISABLED si el vehículo está DESHABILITADO', async () => {
      // Crear un equipo deshabilitado
      const equipoDes = await prisma.vehiculo.create({
        data: {
          patente: `BLQ-${Date.now().toString().slice(-4)}`,
          tipoEquipo: TipoEquipo.CAMION,
          marca: 'Volvo',
          modelo: 'FM',
          anio: 2021,
          capacidadEstanqueM3: 20,
          estado: EstadoEquipo.DESHABILITADO,
          motivoEstado: 'Falla crítica reportada en taller',
          origenBloqueo: OrigenBloqueo.MANUAL
        }
      });

      const res = await fetch(`${baseUrl}/api/inspecciones/salida`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify({
          vehiculoId: equipoDes.id,
          conductorId: conductorUserId,
          kilometraje: 100000,
          items: [
            {
              categoria: 'MECANICA',
              numero: 1,
              nombre: 'Frenos principales',
              estado: 'BUENO',
              esCritico: true
            }
          ],
          fotos360: [
            { tipo: 'FRONTAL', archivoUrl: 'http://foto.cl/1.jpg' },
            { tipo: 'LATERAL_IZQUIERDA', archivoUrl: 'http://foto.cl/2.jpg' },
            { tipo: 'TRASERA', archivoUrl: 'http://foto.cl/3.jpg' },
            { tipo: 'LATERAL_DERECHA', archivoUrl: 'http://foto.cl/4.jpg' }
          ]
        })
      });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe('FLEET_DISABLED');
      expect(json.error.message).toContain('Falla crítica reportada en taller');
    });

    it('debe persistir DESHABILITADO y CHECKLIST_SEGURIDAD cuando hay fallas críticas en el checklist', async () => {
      // Crear un equipo habilitado
      const equipoHab = await prisma.vehiculo.create({
        data: {
          patente: `SEG-${Date.now().toString().slice(-4)}`,
          tipoEquipo: TipoEquipo.CAMION,
          marca: 'Volvo',
          modelo: 'FM',
          anio: 2021,
          capacidadEstanqueM3: 20,
          estado: EstadoEquipo.HABILITADO
        }
      });

      const res = await fetch(`${baseUrl}/api/inspecciones/salida`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conductorToken}`
        },
        body: JSON.stringify({
          vehiculoId: equipoHab.id,
          conductorId: conductorUserId,
          kilometraje: 100000,
          items: [
            {
              categoria: 'MECANICA',
              numero: 1,
              nombre: 'Freno de servicio',
              estado: 'MALO', // Falla crítica
              esCritico: true
            }
          ],
          fotos360: [
            { tipo: 'FRONTAL', archivoUrl: 'http://foto.cl/1.jpg' },
            { tipo: 'LATERAL_IZQUIERDA', archivoUrl: 'http://foto.cl/2.jpg' },
            { tipo: 'TRASERA', archivoUrl: 'http://foto.cl/3.jpg' },
            { tipo: 'LATERAL_DERECHA', archivoUrl: 'http://foto.cl/4.jpg' }
          ]
        })
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.bloqueado).toBe(true);
      expect(json.data.motivoBloqueo).toContain('Freno de servicio');

      // Verificar que el equipo en base de datos quedó en DESHABILITADO con origen CHECKLIST_SEGURIDAD
      const equipoActualizado = await prisma.vehiculo.findUnique({
        where: { id: equipoHab.id }
      });
      expect(equipoActualizado?.estado).toBe(EstadoEquipo.DESHABILITADO);
      expect(equipoActualizado?.origenBloqueo).toBe(OrigenBloqueo.CHECKLIST_SEGURIDAD);
      expect(equipoActualizado?.motivoEstado).toContain('Freno de servicio');

      // Verificar auditoría
      const audit = await prisma.auditoriaEvento.findFirst({
        where: {
          recursoId: equipoHab.id,
          accion: 'FLOTA_BLOQUEO_CHECKLIST'
        }
      });
      expect(audit).toBeDefined();
    });
  });
});
