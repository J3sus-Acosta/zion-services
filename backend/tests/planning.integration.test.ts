import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import app from '../src/index.js';
import { seedDemoData } from '../prisma/seed.js';
import { TokenService } from '../src/services/token.service.js';
import { RolUsuario, EstadoAtencionProgramada } from '@prisma/client';
import { prisma } from '../src/utils/prisma.js';

describe('Pruebas de Integración REST: Módulo Planning y Catálogos (/api/planning)', () => {
  let server: http.Server;
  let baseUrl: string;

  let comercialToken: string;
  let adminToken: string;
  let jefeOpsToken: string;
  let operacionesToken: string;
  let clienteToken: string;
  let clienteOtroToken: string;
  let conductorToken: string;

  let empresaClienteId: string;
  let otraEmpresaUuid: string;
  let sucursalFaenaId: string;
  let servicioCatalogoId: string;
  let vehiculoId: string;
  let conductorUserId: string;

  beforeAll(async () => {
    // 1. Sembrar datos base
    await seedDemoData();

    // 2. Levantar servidor en puerto aleatorio
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 3. Crear o verificar entidades de prueba con IDs tipo UUID
    const empresaUuid = 'c0a80101-0000-4000-a000-000000000001';
    const sucursalUuid = 'c0a80101-0000-4000-a000-000000000002';
    const vehiculoUuid = 'c0a80101-0000-4000-a000-000000000003';
    const conductorUuid = 'c0a80101-0000-4000-a000-000000000004';
    otraEmpresaUuid = 'c0a80101-0000-4000-a000-000000000099';

    const empresa = await prisma.empresaCliente.upsert({
      where: { id: empresaUuid },
      update: {},
      create: {
        id: empresaUuid,
        rut: '76.999.111-2',
        razonSocial: 'Empresa Test Planning UUID S.A.',
        nombreFantasia: 'Planning UUID',
        giro: 'Industrial',
        activo: true
      }
    });
    empresaClienteId = empresa.id;

    await prisma.empresaCliente.upsert({
      where: { id: otraEmpresaUuid },
      update: {},
      create: {
        id: otraEmpresaUuid,
        rut: '76.999.222-3',
        razonSocial: 'Segunda Empresa Test S.A.',
        nombreFantasia: 'Segunda Empresa',
        giro: 'Minería',
        activo: true
      }
    });

    const sucursal = await prisma.sucursalFaena.upsert({
      where: { id: sucursalUuid },
      update: {},
      create: {
        id: sucursalUuid,
        empresaClienteId,
        nombre: 'Sucursal Test Quilicura',
        direccion: 'Calle Los Metalúrgicos 100',
        comuna: 'Quilicura',
        ciudad: 'Santiago',
        region: 'Metropolitana',
        contactoEmail: 'planning.test@empresa.cl'
      }
    });
    sucursalFaenaId = sucursal.id;

    const serv = await prisma.servicioCatalogo.findFirst({ where: { activo: true } });
    servicioCatalogoId = serv!.id;

    const veh = await prisma.vehiculo.upsert({
      where: { id: vehiculoUuid },
      update: {},
      create: {
        id: vehiculoUuid,
        patente: 'PLAN-99',
        marca: 'Volvo',
        modelo: 'FM 440',
        anio: 2024,
        capacidadEstanqueM3: 20.0,
        equipoHidrojet: true
      }
    });
    vehiculoId = veh.id;

    const cond = await prisma.usuario.upsert({
      where: { id: conductorUuid },
      update: {},
      create: {
        id: conductorUuid,
        email: 'conductor.planning.uuid@zion.cl',
        passwordHash: 'hash',
        nombre: 'Roberto',
        apellido: 'Bravo',
        rut: '12.888.777-6',
        rol: RolUsuario.CONDUCTOR,
        activo: true
      }
    });
    conductorUserId = cond.id;

    // Limpiar atenciones previas en la sucursal de pruebas
    await prisma.atencionServicioItem.deleteMany({
      where: { atencionProgramada: { sucursalFaenaId } }
    });
    await prisma.atencionProgramada.deleteMany({
      where: { sucursalFaenaId }
    });

    // 4. Generar tokens JWT para diferentes perfiles RBAC
    comercialToken = TokenService.generateAccessToken({
      userId: 'usr-comercial-01',
      email: 'comercial@zion.cl',
      rol: RolUsuario.COMERCIAL
    });

    adminToken = TokenService.generateAccessToken({
      userId: 'usr-admin-01',
      email: 'admin@zion.cl',
      rol: RolUsuario.ADMIN
    });

    jefeOpsToken = TokenService.generateAccessToken({
      userId: 'usr-jefe-01',
      email: 'jefe@zion.cl',
      rol: RolUsuario.JEFE_OPERACIONES
    });

    operacionesToken = TokenService.generateAccessToken({
      userId: 'usr-operaciones-01',
      email: 'operaciones@zion.cl',
      rol: RolUsuario.OPERACIONES
    });

    clienteToken = TokenService.generateAccessToken({
      userId: 'usr-cliente-01',
      email: 'cliente@horse.cl',
      rol: RolUsuario.CLIENTE,
      empresaClienteId
    });

    clienteOtroToken = TokenService.generateAccessToken({
      userId: 'usr-cliente-otro',
      email: 'otro@bravo.cl',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: otraEmpresaUuid
    });

    conductorToken = TokenService.generateAccessToken({
      userId: conductorUserId,
      email: 'conductor@zion.cl',
      rol: RolUsuario.CONDUCTOR
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // -------------------------------------------------------------
  // 1. CATÁLOGOS (/api/planning/catalogo-servicios & plantas-destino)
  // -------------------------------------------------------------
  describe('Endpoints de Catálogos', () => {
    it('GET /api/planning/catalogo-servicios: retorna 200 con listado de servicios activos', async () => {
      const res = await fetch(`${baseUrl}/api/planning/catalogo-servicios`, {
        headers: { Authorization: `Bearer ${comercialToken}` }
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0]).toHaveProperty('id');
      expect(json.data[0]).toHaveProperty('codigo');
      expect(json.data[0]).toHaveProperty('nombre');
      expect(json.data[0]).toHaveProperty('duracionEstimadaMinutos');
    });

    it('GET /api/planning/plantas-destino: retorna 200 con listado de plantas autorizadas activas', async () => {
      const res = await fetch(`${baseUrl}/api/planning/plantas-destino`, {
        headers: { Authorization: `Bearer ${comercialToken}` }
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0]).toHaveProperty('id');
      expect(json.data[0]).toHaveProperty('nombre');
      expect(json.data[0]).toHaveProperty('comuna');
      expect(json.data[0]).toHaveProperty('autorizadaRiles');
    });

    it('Rechaza con 401 si no se envía token de autenticación', async () => {
      const res = await fetch(`${baseUrl}/api/planning/catalogo-servicios`);
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------
  // 2. AGENDA (/api/planning/agenda)
  // -------------------------------------------------------------
  describe('GET /api/planning/agenda', () => {
    it('retorna 200 OK con array de atenciones programadas en el rango', async () => {
      const res = await fetch(
        `${baseUrl}/api/planning/agenda?fechaDesde=2026-11-01T00:00:00.000Z&fechaHasta=2026-12-31T23:59:59.000Z`,
        { headers: { Authorization: `Bearer ${comercialToken}` } }
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('retorna 400 Bad Request si fechaDesde o fechaHasta no tienen formato ISO válido', async () => {
      const res = await fetch(`${baseUrl}/api/planning/agenda?fechaDesde=invalida&fechaHasta=2026-12-31`, {
        headers: { Authorization: `Bearer ${comercialToken}` }
      });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('retorna 403 Forbidden para rol CLIENTE o CONDUCTOR', async () => {
      const resCliente = await fetch(
        `${baseUrl}/api/planning/agenda?fechaDesde=2026-11-01T00:00:00.000Z&fechaHasta=2026-12-31T23:59:59.000Z`,
        { headers: { Authorization: `Bearer ${clienteToken}` } }
      );
      expect(resCliente.status).toBe(403);

      const resConductor = await fetch(
        `${baseUrl}/api/planning/agenda?fechaDesde=2026-11-01T00:00:00.000Z&fechaHasta=2026-12-31T23:59:59.000Z`,
        { headers: { Authorization: `Bearer ${conductorToken}` } }
      );
      expect(resConductor.status).toBe(403);
    });

    it('retorna 403 Forbidden para rol OPERACIONES (SEC-06 RBAC estricto en Agenda)', async () => {
      const resOperaciones = await fetch(
        `${baseUrl}/api/planning/agenda?fechaDesde=2026-11-01T00:00:00.000Z&fechaHasta=2026-12-31T23:59:59.000Z`,
        { headers: { Authorization: `Bearer ${operacionesToken}` } }
      );
      expect(resOperaciones.status).toBe(403);
    });
  });

  // -------------------------------------------------------------
  // 3. SOLICITUD MULTI-ATENCIÓN (POST /api/planning/solicitudes-multi)
  // -------------------------------------------------------------
  describe('POST /api/planning/solicitudes-multi', () => {
    it('crea exitosamente una solicitud multi-atención con rol CLIENTE', async () => {
      const payload = {
        empresaClienteId,
        sucursalFaenaId,
        tipoResiduo: 'RILes con Hidrocarburos',
        descripcion: 'Retiro programado de lodos decantados',
        cantidadEstimada: 25,
        unidadEstimada: 'M3',
        atenciones: [
          {
            fechaHoraInicio: '2026-12-15T09:00:00.000Z',
            duracionEstimadaMinutos: 120,
            servicios: [{ servicioCatalogoId, cantidad: 1 }]
          },
          {
            fechaHoraInicio: '2026-12-17T09:00:00.000Z',
            duracionEstimadaMinutos: 120,
            servicios: [{ servicioCatalogoId, cantidad: 1 }]
          }
        ]
      };

      const res = await fetch(`${baseUrl}/api/planning/solicitudes-multi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clienteToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.solicitudId).toBeDefined();
      expect(json.data.solicitudFolio).toContain('SOL-');
      expect(json.data.totalAtencionesCreadas).toBe(2);
      expect(json.data.atenciones).toHaveLength(2);
      expect(json.data.atenciones[0].estado).toBe(EstadoAtencionProgramada.PENDIENTE_CONFIRMACION);
    });

    it('bloquea con 403 Forbidden si el rol CLIENTE intenta crear para otra empresa (Tenant Isolation)', async () => {
      const payload = {
        empresaClienteId, // Empresa no perteneciente a clienteOtroToken
        sucursalFaenaId,
        tipoResiduo: 'Lodos',
        atenciones: [
          {
            fechaHoraInicio: '2026-12-15T09:00:00.000Z',
            duracionEstimadaMinutos: 120,
            servicios: [{ servicioCatalogoId, cantidad: 1 }]
          }
        ]
      };

      const res = await fetch(`${baseUrl}/api/planning/solicitudes-multi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clienteOtroToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('retorna 400 Bad Request si el payload no contiene atenciones', async () => {
      const payload = {
        empresaClienteId,
        sucursalFaenaId,
        tipoResiduo: 'Lodos',
        atenciones: []
      };

      const res = await fetch(`${baseUrl}/api/planning/solicitudes-multi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${comercialToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('bloquea con 403 FORBIDDEN_BRANCH_ACCESS si la sucursal base pertenece a otra empresa (SEC-01)', async () => {
      // Creamos o verificamos sucursal de otra empresa
      const sucursalOtra = await prisma.sucursalFaena.upsert({
        where: { id: 'c0a80101-0000-4000-a000-000000000088' },
        update: {},
        create: {
          id: 'c0a80101-0000-4000-a000-000000000088',
          empresaClienteId: otraEmpresaUuid,
          nombre: 'Faena Ajena Quilicura',
          direccion: 'Av. Industrial 555',
          comuna: 'Quilicura',
          ciudad: 'Santiago',
          region: 'Metropolitana'
        }
      });

      const payload = {
        empresaClienteId, // Empresa 1
        sucursalFaenaId: sucursalOtra.id, // Sucursal de Empresa 2
        tipoResiduo: 'Residuos Peligrosos',
        atenciones: [
          {
            fechaHoraInicio: '2026-12-18T10:00:00.000Z',
            duracionEstimadaMinutos: 120,
            servicios: [{ servicioCatalogoId, cantidad: 1 }]
          }
        ]
      };

      const res = await fetch(`${baseUrl}/api/planning/solicitudes-multi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${comercialToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN_BRANCH_ACCESS');
    });

    it('bloquea con 403 FORBIDDEN_BRANCH_ACCESS si una sub-sucursal en atenciones pertenece a otra empresa (SEC-01)', async () => {
      const payload = {
        empresaClienteId, // Empresa 1
        sucursalFaenaId, // Sucursal legítima de Empresa 1
        tipoResiduo: 'Residuos Peligrosos',
        atenciones: [
          {
            fechaHoraInicio: '2026-12-18T10:00:00.000Z',
            duracionEstimadaMinutos: 120,
            sucursalFaenaId: 'c0a80101-0000-4000-a000-000000000088', // Sucursal de Empresa 2
            servicios: [{ servicioCatalogoId, cantidad: 1 }]
          }
        ]
      };

      const res = await fetch(`${baseUrl}/api/planning/solicitudes-multi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${comercialToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN_BRANCH_ACCESS');
    });
  });

  // -------------------------------------------------------------
  // 4. ASIGNACIÓN, SOLAPAMIENTO Y MARGEN DE TRASLADO
  // -------------------------------------------------------------
  describe('PUT /api/planning/atenciones/:id/asignar', () => {
    let atencion1Id: string;
    let atencion2Id: string;

    beforeAll(async () => {
      // Crear solicitud con 2 atenciones para probar conflictos
      const payload = {
        empresaClienteId,
        sucursalFaenaId,
        tipoResiduo: 'Aguas Grasas',
        atenciones: [
          {
            fechaHoraInicio: '2026-12-28T09:00:00.000Z',
            duracionEstimadaMinutos: 120, // Termina 11:00
            servicios: [{ servicioCatalogoId, cantidad: 1 }]
          },
          {
            fechaHoraInicio: '2026-12-28T10:00:00.000Z', // Solapa con la primera (09:00 - 11:00)
            duracionEstimadaMinutos: 120,
            servicios: [{ servicioCatalogoId, cantidad: 1 }]
          }
        ]
      };

      const res = await fetch(`${baseUrl}/api/planning/solicitudes-multi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${comercialToken}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      atencion1Id = json.data.atenciones[0].id;
      atencion2Id = json.data.atenciones[1].id;
    });

    it('asigna exitosamente la primera atención generando OrdenServicio 1:1', async () => {
      const payload = {
        vehiculoId,
        conductorId: conductorUserId,
        fechaHoraInicio: '2026-12-28T09:00:00.000Z',
        duracionEstimadaMinutos: 120,
        forzarConJustificacion: false
      };

      const res = await fetch(`${baseUrl}/api/planning/atenciones/${atencion1Id}/asignar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jefeOpsToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.estado).toBe(EstadoAtencionProgramada.PROGRAMADA);
      expect(json.data.ordenServicioGenerada.folio).toContain('OS-');
      expect(json.data.notificacionConductorId).toBeDefined();
    });

    it('bloquea con HTTP 409 ERROR_SOLAPAMIENTO_HORARIO en colisión directa (no forzable)', async () => {
      // Intentar asignar atención 2 en 10:00 - 12:00 con el mismo vehículo y chofer (colisiona con 09:00 - 11:00)
      const payload = {
        vehiculoId,
        conductorId: conductorUserId,
        fechaHoraInicio: '2026-12-28T10:00:00.000Z',
        duracionEstimadaMinutos: 120,
        forzarConJustificacion: true, // Aun con forzado debe ser categóricamente rechazado
        justificacionForzado: 'Urgencia extrema de gerencia comercial'
      };

      const res = await fetch(`${baseUrl}/api/planning/atenciones/${atencion2Id}/asignar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('ERROR_SOLAPAMIENTO_HORARIO');
      expect(Array.isArray(json.conflictos)).toBe(true);
      expect(json.conflictos.length).toBeGreaterThan(0);
    });

    it('responde HTTP 409 WARNING_INTERVALO_TRASLADO si el margen es menor a 4 horas (240 min) sin forzado', async () => {
      // Atención 1 terminó a las 11:00. Intentar asignar a las 12:30 (margen = 90 min < 240 min)
      const payloadSinForzar = {
        vehiculoId,
        conductorId: conductorUserId,
        fechaHoraInicio: '2026-12-28T12:30:00.000Z',
        duracionEstimadaMinutos: 120,
        forzarConJustificacion: false
      };

      const res = await fetch(`${baseUrl}/api/planning/atenciones/${atencion2Id}/asignar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jefeOpsToken}`
        },
        body: JSON.stringify(payloadSinForzar)
      });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('WARNING_INTERVALO_TRASLADO');
      expect(json.detalles).toBeDefined();
      expect(json.detalles.margenMinutos).toBe(90);
    });

    it('autoriza con HTTP 200 si margen < 4h cuando se envía forzarConJustificacion: true y justificación >= 10 chars', async () => {
      const payloadConForzado = {
        vehiculoId,
        conductorId: conductorUserId,
        fechaHoraInicio: '2026-12-28T12:30:00.000Z',
        duracionEstimadaMinutos: 120,
        forzarConJustificacion: true,
        justificacionForzado: 'Faenas contiguas en el mismo parque industrial autorizadas por Jefatura.'
      };

      const res = await fetch(`${baseUrl}/api/planning/atenciones/${atencion2Id}/asignar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jefeOpsToken}`
        },
        body: JSON.stringify(payloadConForzado)
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.estado).toBe(EstadoAtencionProgramada.PROGRAMADA);
      expect(json.data.ordenServicioGenerada.folio).toContain('OS-');
    });

    it('bloquea con 403 Forbidden si rol CLIENTE intenta asignar recursos', async () => {
      const payload = {
        vehiculoId,
        conductorId: conductorUserId,
        fechaHoraInicio: '2026-12-28T12:30:00.000Z',
        duracionEstimadaMinutos: 120
      };

      const res = await fetch(`${baseUrl}/api/planning/atenciones/${atencion1Id}/asignar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clienteToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(403);
    });

    it('bloquea con 400 VEHICLE_NOT_OPERATIONAL si el vehículo no está habilitado (SEC-04)', async () => {
      const vehiculoInhabilitado = await prisma.vehiculo.upsert({
        where: { id: 'c0a80101-0000-4000-a000-000000000077' },
        update: { estado: 'DESHABILITADO' },
        create: {
          id: 'c0a80101-0000-4000-a000-000000000077',
          patente: 'TALL-99',
          marca: 'Scania',
          modelo: 'P410',
          anio: 2021,
          capacidadEstanqueM3: 15.0,
          estado: 'DESHABILITADO'
        }
      });

      const payload = {
        vehiculoId: vehiculoInhabilitado.id,
        conductorId: conductorUserId,
        fechaHoraInicio: '2026-12-29T10:00:00.000Z',
        duracionEstimadaMinutos: 120
      };

      const res = await fetch(`${baseUrl}/api/planning/atenciones/${atencion2Id}/asignar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VEHICLE_NOT_OPERATIONAL');
    });

    it('bloquea con 400 INVALID_DRIVER si el usuario no tiene rol CONDUCTOR (SEC-04)', async () => {
      // Usar el usuario de perfil comercial
      const usuarioNoConductor = await prisma.usuario.findFirst({
        where: { rol: RolUsuario.COMERCIAL }
      });

      const payload = {
        vehiculoId,
        conductorId: usuarioNoConductor!.id,
        fechaHoraInicio: '2026-12-29T10:00:00.000Z',
        duracionEstimadaMinutos: 120
      };

      const res = await fetch(`${baseUrl}/api/planning/atenciones/${atencion2Id}/asignar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('INVALID_DRIVER');
    });
  });

  // -------------------------------------------------------------
  // 5. REASIGNACIÓN (PUT /api/planning/atenciones/:id/reasignar)
  // -------------------------------------------------------------
  describe('PUT /api/planning/atenciones/:id/reasignar', () => {
    let atencionReasignarId: string;

    beforeAll(async () => {
      const payload = {
        empresaClienteId,
        sucursalFaenaId,
        tipoResiduo: 'Residuo Químico',
        atenciones: [
          {
            fechaHoraInicio: '2026-12-30T09:00:00.000Z',
            duracionEstimadaMinutos: 120,
            servicios: [{ servicioCatalogoId, cantidad: 1 }]
          }
        ]
      };

      const res = await fetch(`${baseUrl}/api/planning/solicitudes-multi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${comercialToken}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      atencionReasignarId = json.data.atenciones[0].id;

      await fetch(`${baseUrl}/api/planning/atenciones/${atencionReasignarId}/asignar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          vehiculoId,
          conductorId: conductorUserId,
          fechaHoraInicio: '2026-12-30T09:00:00.000Z',
          duracionEstimadaMinutos: 120
        })
      });
    });

    it('reasigna exitosamente con motivo de cambio válido', async () => {
      const payload = {
        nuevaFechaHoraInicio: '2026-12-30T16:00:00.000Z',
        motivoReasignacion: 'Solicitud formal del cliente por retraso en planta'
      };

      const res = await fetch(`${baseUrl}/api/planning/atenciones/${atencionReasignarId}/reasignar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain('reasignada exitosamente');
    });

    it('retorna 400 si el motivo de reasignación tiene menos de 5 caracteres', async () => {
      const payload = {
        motivoReasignacion: 'abc'
      };

      const res = await fetch(`${baseUrl}/api/planning/atenciones/${atencionReasignarId}/reasignar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
