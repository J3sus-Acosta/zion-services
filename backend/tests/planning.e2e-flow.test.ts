import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import app from '../src/index.js';
import { seedDemoData } from '../prisma/seed.js';
import { TokenService } from '../src/services/token.service.js';
import { RolUsuario, EstadoAtencionProgramada, EstadoOrdenServicio } from '@prisma/client';
import { prisma } from '../src/utils/prisma.js';

describe('E2E Flow: Flujo Integral de Planificación, Conflictos, Notificaciones y Auditoría', () => {
  let server: http.Server;
  let baseUrl: string;

  let jefeOpsToken: string;
  let clienteToken: string;
  let adminToken: string;

  let empresaClienteId: string;
  let sucursalFaenaId: string;
  let servicioCatalogoId: string;
  let vehiculoId: string;
  let conductor1UserId: string;
  let conductor2UserId: string;
  let jefeOpsUserId: string;

  // Variables para trazabilidad entre pasos del flujo E2E
  let solicitudId: string;
  let solicitudFolio: string;
  let atencion1Id: string;
  let atencion2Id: string;
  let ordenServicio1Id: string;
  let ordenServicio2Id: string;

  beforeAll(async () => {
    // 1. Sembrar datos demo
    await seedDemoData();

    // 2. Iniciar servidor HTTP en puerto dinámico
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 3. Crear o asegurar entidades persistentes de prueba
    const empresaUuid = 'e2e00000-0000-4000-a000-000000000001';
    const sucursalUuid = 'e2e00000-0000-4000-a000-000000000002';
    const vehiculoUuid = 'e2e00000-0000-4000-a000-000000000003';
    const conductor1Uuid = 'e2e00000-0000-4000-a000-000000000004';
    const conductor2Uuid = 'e2e00000-0000-4000-a000-000000000005';
    jefeOpsUserId = 'usr-jefe-ops-01';

    // Limpieza de corridas anteriores si existen
    await prisma.atencionProgramada.updateMany({
      where: { sucursalFaena: { empresaCliente: { rut: '77.888.999-1' } } },
      data: { ordenServicioId: null }
    });
    await prisma.atencionServicioItem.deleteMany({
      where: { atencionProgramada: { sucursalFaena: { empresaCliente: { rut: '77.888.999-1' } } } }
    });
    await prisma.atencionProgramada.deleteMany({
      where: { sucursalFaena: { empresaCliente: { rut: '77.888.999-1' } } }
    });

    const testOrders = await prisma.ordenServicio.findMany({
      where: { solicitudServicio: { empresaCliente: { rut: '77.888.999-1' } } },
      select: { id: true }
    });
    const orderIds = testOrders.map((o) => o.id);
    if (orderIds.length > 0) {
      await prisma.cicloTransporte.deleteMany({ where: { ordenServicioId: { in: orderIds } } });
      await prisma.expedienteDocumental.deleteMany({ where: { ordenServicioId: { in: orderIds } } });
      await prisma.visitaDestino.deleteMany({ where: { ordenServicioId: { in: orderIds } } });
      await prisma.tramoRuta.deleteMany({ where: { ordenServicioId: { in: orderIds } } });
      await prisma.registroTelemetriaGPS.deleteMany({ where: { ordenServicioId: { in: orderIds } } });
      await prisma.ordenServicio.deleteMany({ where: { id: { in: orderIds } } });
    }

    await prisma.solicitudServicio.deleteMany({
      where: { empresaCliente: { rut: '77.888.999-1' } }
    });
    await prisma.sucursalFaena.deleteMany({
      where: { empresaCliente: { rut: '77.888.999-1' } }
    });
    await prisma.empresaCliente.deleteMany({
      where: { rut: '77.888.999-1' }
    });
    await prisma.notificacionConductor.deleteMany({
      where: { conductor: { email: { in: ['conductor1.e2eflow@zion.cl', 'conductor2.e2eflow@zion.cl'] } } }
    });
    await prisma.conductor.deleteMany({
      where: { usuario: { email: { in: ['conductor1.e2eflow@zion.cl', 'conductor2.e2eflow@zion.cl'] } } }
    });
    await prisma.usuario.deleteMany({
      where: { email: { in: ['conductor1.e2eflow@zion.cl', 'conductor2.e2eflow@zion.cl'] } }
    });
    await prisma.vehiculo.deleteMany({
      where: { patente: 'FLOW-88' }
    });

    const empresa = await prisma.empresaCliente.create({
      data: {
        id: empresaUuid,
        rut: '77.888.999-1',
        razonSocial: 'Industrias Químicas E2E S.A.',
        nombreFantasia: 'E2E Chemicals',
        giro: 'Tratamiento Químico',
        activo: true
      }
    });
    empresaClienteId = empresa.id;

    const sucursal = await prisma.sucursalFaena.create({
      data: {
        id: sucursalUuid,
        empresaClienteId,
        nombre: 'Planta Lampa E2E',
        direccion: 'Av. Panamericana Norte Km 25',
        comuna: 'Lampa',
        ciudad: 'Santiago',
        region: 'Metropolitana',
        contactoEmail: 'operaciones@e2echem.cl'
      }
    });
    sucursalFaenaId = sucursal.id;

    const serv = await prisma.servicioCatalogo.findFirst({ where: { activo: true } });
    if (!serv) throw new Error('Servicio de catálogo activo no encontrado');
    servicioCatalogoId = serv.id;

    const veh = await prisma.vehiculo.upsert({
      where: { patente: 'FLOW-88' },
      update: {},
      create: {
        id: vehiculoUuid,
        patente: 'FLOW-88',
        marca: 'Scania',
        modelo: 'P410',
        anio: 2025,
        capacidadEstanqueM3: 25.0,
        equipoHidrojet: true
      }
    });
    vehiculoId = veh.id;

    // Conductor 1
    const cond1 = await prisma.usuario.upsert({
      where: { email: 'conductor1.e2eflow@zion.cl' },
      update: {},
      create: {
        id: conductor1Uuid,
        email: 'conductor1.e2eflow@zion.cl',
        passwordHash: 'hash',
        nombre: 'Esteban',
        apellido: 'Pavez',
        rut: '99.111.222-1',
        rol: RolUsuario.CONDUCTOR,
        activo: true
      }
    });
    conductor1UserId = cond1.id;

    await prisma.conductor.upsert({
      where: { usuarioId: conductor1UserId },
      update: {},
      create: {
        id: 'cond-e2e-01',
        usuarioId: conductor1UserId,
        licenciaNumero: 'E2E-LIC-01',
        licenciaClase: 'A4/A5',
        licenciaVencimiento: new Date('2028-12-31')
      }
    });

    // Conductor 2
    const cond2 = await prisma.usuario.upsert({
      where: { email: 'conductor2.e2eflow@zion.cl' },
      update: {},
      create: {
        id: conductor2Uuid,
        email: 'conductor2.e2eflow@zion.cl',
        passwordHash: 'hash',
        nombre: 'Mauricio',
        apellido: 'Isla',
        rut: '99.222.333-2',
        rol: RolUsuario.CONDUCTOR,
        activo: true
      }
    });
    conductor2UserId = cond2.id;

    await prisma.conductor.upsert({
      where: { usuarioId: conductor2UserId },
      update: {},
      create: {
        id: 'cond-e2e-02',
        usuarioId: conductor2UserId,
        licenciaNumero: 'E2E-LIC-02',
        licenciaClase: 'A4/A5',
        licenciaVencimiento: new Date('2028-12-31')
      }
    });

    // Limpiar atenciones previas en la sucursal
    await prisma.atencionServicioItem.deleteMany({
      where: { atencionProgramada: { sucursalFaenaId } }
    });
    await prisma.atencionProgramada.deleteMany({
      where: { sucursalFaenaId }
    });

    // Tokens JWT
    clienteToken = TokenService.generateAccessToken({
      userId: 'usr-cliente-e2e',
      email: 'contacto@e2echem.cl',
      rol: RolUsuario.CLIENTE,
      empresaClienteId
    });

    jefeOpsToken = TokenService.generateAccessToken({
      userId: jefeOpsUserId,
      email: 'operaciones@zion.cl',
      rol: RolUsuario.JEFE_OPERACIONES
    });

    adminToken = TokenService.generateAccessToken({
      userId: 'usr-admin-01',
      email: 'admin@zion.cl',
      rol: RolUsuario.ADMIN
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // -------------------------------------------------------------
  // PASO 1: Creación de Solicitud Multi-Atención
  // -------------------------------------------------------------
  it('1. Cliente crea solicitud multi-atención con 2 fechas de servicio', async () => {
    const payload = {
      empresaClienteId,
      sucursalFaenaId,
      tipoResiduo: 'RILes Orgánicos y Grasas',
      descripcion: 'Mantenimiento preventivo decantadores Lampa',
      cantidadEstimada: 40,
      unidadEstimada: 'M3',
      atenciones: [
        {
          fechaHoraInicio: '2026-12-10T08:00:00.000Z',
          duracionEstimadaMinutos: 120, // 08:00 - 10:00
          servicios: [{ servicioCatalogoId, cantidad: 1 }]
        },
        {
          fechaHoraInicio: '2026-12-10T14:00:00.000Z',
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
    expect(json.data.atenciones).toHaveLength(2);

    solicitudId = json.data.solicitudId;
    solicitudFolio = json.data.solicitudFolio;
    atencion1Id = json.data.atenciones[0].id;
    atencion2Id = json.data.atenciones[1].id;

    expect(json.data.atenciones[0].estado).toBe(EstadoAtencionProgramada.PENDIENTE_CONFIRMACION);
    expect(json.data.atenciones[1].estado).toBe(EstadoAtencionProgramada.PENDIENTE_CONFIRMACION);
  });

  // -------------------------------------------------------------
  // PASO 2: Consulta en Calendario / Agenda
  // -------------------------------------------------------------
  it('2. Jefe de Operaciones consulta calendario (/api/planning/agenda) y visualiza las atenciones creadas', async () => {
    const res = await fetch(
      `${baseUrl}/api/planning/agenda?fechaDesde=2026-12-01T00:00:00.000Z&fechaHasta=2026-12-31T23:59:59.000Z`,
      {
        headers: { Authorization: `Bearer ${jefeOpsToken}` }
      }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);

    const ids = json.data.map((item: any) => item.id);
    expect(ids).toContain(atencion1Id);
    expect(ids).toContain(atencion2Id);

    const encontrada1 = json.data.find((item: any) => item.id === atencion1Id);
    expect(encontrada1.estado).toBe(EstadoAtencionProgramada.PENDIENTE_CONFIRMACION);
    expect(encontrada1.sucursalFaena.nombre).toBe('Planta Lampa E2E');
  });

  // -------------------------------------------------------------
  // PASO 3: Asignación Operativa Primera Atención (Genera OS 1:1)
  // -------------------------------------------------------------
  it('3. Jefe de Operaciones asigna camión y conductor titular a Atención 1 generando Orden de Servicio 1:1', async () => {
    const payload = {
      vehiculoId,
      conductorId: conductor1UserId,
      fechaHoraInicio: '2026-12-10T08:00:00.000Z',
      duracionEstimadaMinutos: 120, // Termina a las 10:00
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
    expect(json.data.ordenServicioGenerada.id).toBeDefined();
    expect(json.data.ordenServicioGenerada.folio).toContain('OS-');
    expect(json.data.notificacionConductorId).toBeDefined();

    ordenServicio1Id = json.data.ordenServicioGenerada.id;

    // Verificar en BD la persistencia 1:1 de OrdenServicio
    const atencion1BD = await prisma.atencionProgramada.findUnique({
      where: { id: atencion1Id },
      include: { ordenServicio: true }
    });
    expect(atencion1BD?.ordenServicioId).toBe(ordenServicio1Id);
    expect(atencion1BD?.ordenServicio?.estado).toBe(EstadoOrdenServicio.PLANIFICADA);
    expect(atencion1BD?.vehiculoId).toBe(vehiculoId);
    expect(atencion1BD?.conductorId).toBe(conductor1UserId);
  });

  // -------------------------------------------------------------
  // PASO 4: Bloqueo Categórico por Solapamiento Duro (Hard Conflict)
  // -------------------------------------------------------------
  it('4. Bloquea con HTTP 409 ERROR_SOLAPAMIENTO_HORARIO ante colisión directa (09:00 colisiona con 08:00-10:00)', async () => {
    const payloadColision = {
      vehiculoId,
      conductorId: conductor1UserId,
      fechaHoraInicio: '2026-12-10T09:00:00.000Z', // Se solapa con atención 1 (08:00 - 10:00)
      duracionEstimadaMinutos: 120,
      forzarConJustificacion: true, // Aun con forzado y justificación DEBE bloquear
      justificacionForzado: 'Urgencia operativa mayor solicitada por planta'
    };

    const res = await fetch(`${baseUrl}/api/planning/atenciones/${atencion2Id}/asignar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jefeOpsToken}`
      },
      body: JSON.stringify(payloadColision)
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('ERROR_SOLAPAMIENTO_HORARIO');
    expect(Array.isArray(json.conflictos)).toBe(true);
    expect(json.conflictos.length).toBeGreaterThan(0);

    // Verificar que la atención 2 siga PENDIENTE_CONFIRMACION en la base de datos
    const atencion2BD = await prisma.atencionProgramada.findUnique({
      where: { id: atencion2Id }
    });
    expect(atencion2BD?.estado).toBe(EstadoAtencionProgramada.PENDIENTE_CONFIRMACION);
  });

  // -------------------------------------------------------------
  // PASO 5: Advertencia de Margen de Traslado (< 4 horas sin forzar)
  // -------------------------------------------------------------
  it('5. Responde HTTP 409 WARNING_INTERVALO_TRASLADO si el intervalo entre faenas es < 4h (11:00 vs fin a 10:00)', async () => {
    // Atención 1 termina a las 10:00. Si se intenta fijar Atención 2 a las 11:30, margen = 90 min (< 240 min)
    const payloadAdvertencia = {
      vehiculoId,
      conductorId: conductor1UserId,
      fechaHoraInicio: '2026-12-10T11:30:00.000Z',
      duracionEstimadaMinutos: 120,
      forzarConJustificacion: false
    };

    const res = await fetch(`${baseUrl}/api/planning/atenciones/${atencion2Id}/asignar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jefeOpsToken}`
      },
      body: JSON.stringify(payloadAdvertencia)
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('WARNING_INTERVALO_TRASLADO');
    expect(json.detalles).toBeDefined();
    expect(json.detalles.margenMinutos).toBe(90);
    expect(json.detalles.margenMinutos).toBeLessThan(240);
  });

  // -------------------------------------------------------------
  // PASO 6: Forzado de Traslado con Justificación Válida
  // -------------------------------------------------------------
  it('6. Autoriza con HTTP 200 el forzado de traslado al enviar justificación >= 10 caracteres', async () => {
    const justificacion = 'Faenas contiguas en zona norte Lampa autorizadas por Jefatura Operativa';
    const payloadForzado = {
      vehiculoId,
      conductorId: conductor1UserId,
      fechaHoraInicio: '2026-12-10T11:30:00.000Z',
      duracionEstimadaMinutos: 120,
      forzarConJustificacion: true,
      justificacionForzado: justificacion
    };

    const res = await fetch(`${baseUrl}/api/planning/atenciones/${atencion2Id}/asignar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jefeOpsToken}`
      },
      body: JSON.stringify(payloadForzado)
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.estado).toBe(EstadoAtencionProgramada.PROGRAMADA);
    expect(json.data.ordenServicioGenerada.folio).toContain('OS-');

    ordenServicio2Id = json.data.ordenServicioGenerada.id;

    // Verificar persistencia de justificación en BD
    const atencion2BD = await prisma.atencionProgramada.findUnique({
      where: { id: atencion2Id }
    });
    expect(atencion2BD?.justificacionForzado).toBe(justificacion);
    expect(atencion2BD?.estado).toBe(EstadoAtencionProgramada.PROGRAMADA);
  });

  // -------------------------------------------------------------
  // PASO 7: Reasignación Operativa a Nuevo Conductor y Horario
  // -------------------------------------------------------------
  it('7. Reasigna Atención 2 a Conductor 2 con horario reprogramado y motivo de cambio válido', async () => {
    const payloadReasignar = {
      nuevoConductorId: conductor2UserId,
      nuevaFechaHoraInicio: '2026-12-10T16:00:00.000Z',
      motivoReasignacion: 'Relevo programado de turno para cumplir jornada máxima de conducción'
    };

    const res = await fetch(`${baseUrl}/api/planning/atenciones/${atencion2Id}/reasignar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jefeOpsToken}`
      },
      body: JSON.stringify(payloadReasignar)
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain('reasignada exitosamente');

    // Verificar que en BD ahora está asignado conductor 2
    const atencion2BD = await prisma.atencionProgramada.findUnique({
      where: { id: atencion2Id }
    });
    expect(atencion2BD?.conductorId).toBe(conductor2UserId);
    expect(atencion2BD?.fechaHoraInicio.toISOString()).toBe('2026-12-10T16:00:00.000Z');
  });

  // -------------------------------------------------------------
  // VALIDACIÓN TAREA 6.2: PERSISTENCIA EN notificaciones_conductor Y auditoria_eventos
  // -------------------------------------------------------------
  describe('6.2 Verificación de Notificaciones In-App y Auditoría de Eventos', () => {
    it('notificaciones_conductor: verifica inserción de notificaciones con metadata adecuada', async () => {
      // 1. Notificación inicial de asignación a conductor 1 para atención 1
      const notifAsignacion1 = await prisma.notificacionConductor.findFirst({
        where: {
          conductorId: conductor1UserId,
          tipo: 'ASIGNACION_SERVICIO'
        },
        orderBy: { createdAt: 'asc' }
      });
      expect(notifAsignacion1).not.toBeNull();
      expect(notifAsignacion1?.titulo).toContain('Nuevo servicio asignado');
      expect(notifAsignacion1?.mensaje).toContain('Planta Lampa E2E');
      expect(notifAsignacion1?.leida).toBe(false);
      const meta1 = notifAsignacion1?.metadata as any;
      expect(meta1?.atencionId).toBe(atencion1Id);

      // 2. Notificación de desasignación a conductor 1 para atención 2 tras reasignación
      const notifDesasignacion = await prisma.notificacionConductor.findFirst({
        where: {
          conductorId: conductor1UserId,
          tipo: 'DESASIGNACION_SERVICIO'
        },
        orderBy: { createdAt: 'desc' }
      });
      expect(notifDesasignacion).not.toBeNull();
      expect(notifDesasignacion?.titulo).toContain('Servicio reasignado');
      expect(notifDesasignacion?.mensaje).toContain('Relevo programado de turno');
      const metaDesasig = notifDesasignacion?.metadata as any;
      expect(metaDesasig?.atencionId).toBe(atencion2Id);

      // 3. Notificación de asignación a conductor 2 para atención 2
      const notifAsignacionCond2 = await prisma.notificacionConductor.findFirst({
        where: {
          conductorId: conductor2UserId,
          tipo: 'ASIGNACION_SERVICIO'
        },
        orderBy: { createdAt: 'desc' }
      });
      expect(notifAsignacionCond2).not.toBeNull();
      expect(notifAsignacionCond2?.titulo).toContain('Servicio reasignado a su cargo');
      expect(notifAsignacionCond2?.mensaje).toContain('Planta Lampa E2E');
      const metaAsigCond2 = notifAsignacionCond2?.metadata as any;
      expect(metaAsigCond2?.atencionId).toBe(atencion2Id);
    });

    it('auditoria_eventos: verifica registro inmutable con usuario, acción y detalles JSON', async () => {
      // 1. Auditoría de creación de solicitud multi-atención
      const auditCreacion = await prisma.auditoriaEvento.findFirst({
        where: {
          recurso: 'SolicitudServicio',
          recursoId: solicitudId,
          accion: 'CREAR_SOLICITUD_MULTI_ATENCION'
        }
      });
      expect(auditCreacion).not.toBeNull();
      const detallesCreacion = auditCreacion?.detallesJson as any;
      expect(detallesCreacion?.solicitudFolio).toBe(solicitudFolio);
      expect(detallesCreacion?.totalAtenciones).toBe(2);

      // 2. Auditoría de asignación normal (Atención 1)
      const auditAsignacion = await prisma.auditoriaEvento.findFirst({
        where: {
          recurso: 'AtencionProgramada',
          recursoId: atencion1Id,
          accion: 'ASIGNACION_SERVICIO'
        }
      });
      expect(auditAsignacion).not.toBeNull();
      expect(auditAsignacion?.usuarioId).toBe(jefeOpsUserId);
      const detallesAsig = auditAsignacion?.detallesJson as any;
      expect(detallesAsig?.vehiculoId).toBe(vehiculoId);
      expect(detallesAsig?.conductorId).toBe(conductor1UserId);
      expect(detallesAsig?.ordenServicioId).toBe(ordenServicio1Id);

      // 3. Auditoría de forzado de traslado con justificación (Atención 2)
      const auditForzado = await prisma.auditoriaEvento.findFirst({
        where: {
          recurso: 'AtencionProgramada',
          recursoId: atencion2Id,
          accion: 'PLANIFICACION_FORZADA_TRASLADO'
        }
      });
      expect(auditForzado).not.toBeNull();
      expect(auditForzado?.usuarioId).toBe(jefeOpsUserId);
      const detallesForzado = auditForzado?.detallesJson as any;
      expect(detallesForzado?.justificacionForzado).toContain('Faenas contiguas en zona norte');
      expect(detallesForzado?.ordenServicioId).toBe(ordenServicio2Id);

      // 4. Auditoría de reasignación operativa (Atención 2)
      const auditReasignacion = await prisma.auditoriaEvento.findFirst({
        where: {
          recurso: 'AtencionProgramada',
          recursoId: atencion2Id,
          accion: 'REASIGNACION_SERVICIO'
        }
      });
      expect(auditReasignacion).not.toBeNull();
      expect(auditReasignacion?.usuarioId).toBe(jefeOpsUserId);
      const detallesReasig = auditReasignacion?.detallesJson as any;
      expect(detallesReasig?.motivoReasignacion).toContain('Relevo programado de turno');
      expect(detallesReasig?.valoresPrevios?.conductorId).toBe(conductor1UserId);
      expect(detallesReasig?.valoresNuevos?.conductorId).toBe(conductor2UserId);
    });
  });
});
