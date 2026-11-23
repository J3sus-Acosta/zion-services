import { describe, it, expect, beforeAll, vi } from 'vitest';
import { PlanningService } from '../../src/services/planning.service.js';
import { prisma } from '../../src/utils/prisma.js';
import { EstadoAtencionProgramada, EstadoSolicitud, EstadoOrdenServicio } from '@prisma/client';
import { EmailService } from '../../src/services/email.service.js';

describe('PlanningService: Registro multi-atención, asignación 1:1, reasignación, notificaciones y auditoría', () => {
  let empresaClienteId: string;
  let sucursalFaenaId: string;
  let servicioCatalogoId: string;
  let vehiculoId: string;
  let conductor1UserId: string;
  let conductor2UserId: string;
  let operadorUserId: string;

  beforeAll(async () => {
    // 0. Operador comercial
    const op = await prisma.usuario.upsert({
      where: { email: 'operador.plan.test@zion.cl' },
      update: {},
      create: {
        email: 'operador.plan.test@zion.cl',
        passwordHash: 'hash',
        nombre: 'Admin',
        apellido: 'Comercial',
        rut: '12.345.678-9',
        rol: 'COMERCIAL',
        activo: true
      }
    });
    operadorUserId = op.id;
    // 1. Empresa y Sucursal
    const empresa = await prisma.empresaCliente.upsert({
      where: { rut: '76.999.888-K' },
      update: {},
      create: {
        rut: '76.999.888-K',
        razonSocial: 'Empresa Test Planificación S.A.',
        nombreFantasia: 'Test Plannings',
        giro: 'Industrial',
        activo: true
      }
    });
    empresaClienteId = empresa.id;

    const sucursal = await prisma.sucursalFaena.upsert({
      where: { id: 'suc-test-plan-01' },
      update: {},
      create: {
        id: 'suc-test-plan-01',
        empresaClienteId,
        nombre: 'Faena Planta Maipú Test',
        direccion: 'Av. Pajaritos 5000',
        comuna: 'Maipú',
        ciudad: 'Santiago',
        region: 'Metropolitana',
        contactoEmail: 'operaciones.cliente@test.cl'
      }
    });
    sucursalFaenaId = sucursal.id;

    // 2. Servicio de Catálogo
    const servicio = await prisma.servicioCatalogo.upsert({
      where: { codigo: 'PLAN-TEST-HIDRO-01' },
      update: { activo: true },
      create: {
        codigo: 'PLAN-TEST-HIDRO-01',
        nombre: 'Hidrojet Alta Presión Test',
        duracionEstimadaMinutos: 120,
        activo: true
      }
    });
    servicioCatalogoId = servicio.id;

    // 3. Vehículo
    const vehiculo = await prisma.vehiculo.upsert({
      where: { patente: 'TEST-PL-01' },
      update: {},
      create: {
        patente: 'TEST-PL-01',
        marca: 'Mercedes Benz',
        modelo: 'Actros 2645',
        anio: 2024,
        capacidadEstanqueM3: 15.0,
        equipoHidrojet: true
      }
    });
    vehiculoId = vehiculo.id;

    // 4. Conductores (Usuarios)
    const cond1 = await prisma.usuario.upsert({
      where: { email: 'conductor.test.01@zion.cl' },
      update: {},
      create: {
        email: 'conductor.test.01@zion.cl',
        passwordHash: 'hash',
        nombre: 'Mario',
        apellido: 'Soto',
        rut: '14.111.222-3',
        rol: 'CONDUCTOR',
        activo: true
      }
    });
    conductor1UserId = cond1.id;

    const cond2 = await prisma.usuario.upsert({
      where: { email: 'conductor.test.02@zion.cl' },
      update: {},
      create: {
        email: 'conductor.test.02@zion.cl',
        passwordHash: 'hash',
        nombre: 'Pedro',
        apellido: 'González',
        rut: '15.222.333-4',
        rol: 'CONDUCTOR',
        activo: true
      }
    });
    conductor2UserId = cond2.id;

    // Limpiar atenciones previas de pruebas para evitar solapamientos con ejecuciones anteriores
    await prisma.atencionServicioItem.deleteMany({
      where: { atencionProgramada: { sucursalFaenaId } }
    });
    await prisma.atencionProgramada.deleteMany({
      where: { sucursalFaenaId }
    });
  });

  it('1. crearSolicitudMultiAtencion: crea Solicitud y N Atenciones con folios, items y auditoría', async () => {
    const emailSpy = vi.spyOn(EmailService, 'enviarConfirmacionAtencion');

    const input = {
      empresaClienteId,
      sucursalFaenaId,
      tipoResiduo: 'RILes Tratados',
      descripcion: 'Campaña semanal de extracción',
      cantidadEstimada: 30,
      unidadEstimada: 'M3' as const,
      atenciones: [
        {
          fechaHoraInicio: '2026-12-10T09:00:00.000Z',
          duracionEstimadaMinutos: 120,
          servicios: [{ servicioCatalogoId, cantidad: 1, observaciones: 'Sector A' }]
        },
        {
          fechaHoraInicio: '2026-12-12T09:00:00.000Z',
          duracionEstimadaMinutos: 120,
          servicios: [{ servicioCatalogoId, cantidad: 2, observaciones: 'Sector B' }]
        }
      ]
    };

    const resultado = await PlanningService.crearSolicitudMultiAtencion(
      input,
      { id: operadorUserId, rol: 'COMERCIAL' },
      '192.168.1.50'
    );

    expect(resultado.solicitudId).toBeDefined();
    expect(resultado.solicitudFolio).toContain('SOL-');
    expect(resultado.totalAtencionesCreadas).toBe(2);
    expect(resultado.atenciones).toHaveLength(2);
    expect(resultado.atenciones[0]?.estado).toBe(EstadoAtencionProgramada.PENDIENTE_CONFIRMACION);

    // Verificar en BD
    const solicitudBD = await prisma.solicitudServicio.findUnique({
      where: { id: resultado.solicitudId },
      include: { atenciones: { include: { servicios: true } } }
    });
    expect(solicitudBD).not.toBeNull();
    expect(solicitudBD?.estado).toBe(EstadoSolicitud.ENVIADA);
    expect(solicitudBD?.atenciones).toHaveLength(2);
    expect(solicitudBD?.atenciones[0]?.servicios).toHaveLength(1);

    // Verificar evento de auditoría
    const auditoria = await prisma.auditoriaEvento.findFirst({
      where: {
        recurso: 'SolicitudServicio',
        recursoId: resultado.solicitudId,
        accion: 'CREAR_SOLICITUD_MULTI_ATENCION'
      }
    });
    expect(auditoria).not.toBeNull();
    expect(auditoria?.usuarioId).toBe(operadorUserId);
  });

  it('2. obtenerAgenda: consulta atenciones dentro del rango temporal con todos los DTOs asociados', async () => {
    const agenda = await PlanningService.obtenerAgenda({
      fechaDesde: '2026-12-09T00:00:00.000Z',
      fechaHasta: '2026-12-15T23:59:59.000Z',
      vista: 'mes'
    });

    expect(agenda.length).toBeGreaterThanOrEqual(2);
    const item = agenda.find((a) => a.sucursalFaena.id === sucursalFaenaId);
    expect(item).toBeDefined();
    expect(item?.cliente.razonSocial).toBe('Empresa Test Planificación S.A.');
    expect(item?.servicios.length).toBeGreaterThan(0);
  });

  it('3. asignarAtencion: asigna camión y conductor, genera OrdenServicio 1:1, emite NotificacionConductor y audita', async () => {
    // Crear una atención individual
    const solicitudInput = {
      empresaClienteId,
      sucursalFaenaId,
      tipoResiduo: 'Lodos Deshidratados',
      atenciones: [
        {
          fechaHoraInicio: '2026-12-20T08:00:00.000Z',
          duracionEstimadaMinutos: 180,
          servicios: [{ servicioCatalogoId, cantidad: 1 }]
        }
      ]
    };
    const { atenciones } = await PlanningService.crearSolicitudMultiAtencion(solicitudInput);
    const atencionId = atenciones[0]!.id;

    const asignacion = await PlanningService.asignarAtencion(
      atencionId,
      {
        vehiculoId,
        conductorId: conductor1UserId,
        fechaHoraInicio: '2026-12-20T08:00:00.000Z',
        duracionEstimadaMinutos: 180,
        forzarConJustificacion: false
      },
      { id: operadorUserId, rol: 'JEFE_OPERACIONES' },
      '10.0.0.1'
    );

    expect(asignacion.atencionId).toBe(atencionId);
    expect(asignacion.estado).toBe(EstadoAtencionProgramada.PROGRAMADA);
    expect(asignacion.ordenServicioGenerada.id).toBeDefined();
    expect(asignacion.ordenServicioGenerada.folio).toContain('OS-');
    expect(asignacion.notificacionConductorId).toBeDefined();

    // Comprobar BD: OrdenServicio creada 1:1
    const atencionActualizada = await prisma.atencionProgramada.findUnique({
      where: { id: atencionId },
      include: { ordenServicio: true }
    });
    expect(atencionActualizada?.ordenServicioId).toBe(asignacion.ordenServicioGenerada.id);
    expect(atencionActualizada?.ordenServicio?.estado).toBe(EstadoOrdenServicio.PLANIFICADA);

    // Comprobar NotificacionConductor creada
    const notificacion = await prisma.notificacionConductor.findUnique({
      where: { id: asignacion.notificacionConductorId }
    });
    expect(notificacion).not.toBeNull();
    expect(notificacion?.conductorId).toBe(conductor1UserId);
    expect(notificacion?.tipo).toBe('ASIGNACION_SERVICIO');

    // Comprobar AuditoriaEvento
    const auditoria = await prisma.auditoriaEvento.findFirst({
      where: {
        recurso: 'AtencionProgramada',
        recursoId: atencionId,
        accion: 'ASIGNACION_SERVICIO'
      }
    });
    expect(auditoria).not.toBeNull();
    expect(auditoria?.usuarioId).toBe(operadorUserId);
  });

  it('4. reasignarAtencion: reasigna conductor, notifica a ambos conductores y registra auditoría', async () => {
    // Crear y asignar atención previa
    const { atenciones } = await PlanningService.crearSolicitudMultiAtencion({
      empresaClienteId,
      sucursalFaenaId,
      tipoResiduo: 'Aguas Aceitosas',
      atenciones: [
        {
          fechaHoraInicio: '2026-12-22T10:00:00.000Z',
          duracionEstimadaMinutos: 120,
          servicios: [{ servicioCatalogoId, cantidad: 1 }]
        }
      ]
    });
    const atencionId = atenciones[0]!.id;

    await PlanningService.asignarAtencion(atencionId, {
      vehiculoId,
      conductorId: conductor1UserId,
      fechaHoraInicio: '2026-12-22T10:00:00.000Z',
      duracionEstimadaMinutos: 120
    });

    // Reasignar de conductor 1 a conductor 2
    const reasignacion = await PlanningService.reasignarAtencion(
      atencionId,
      {
        nuevoConductorId: conductor2UserId,
        motivoReasignacion: 'Licencia médica del conductor titular'
      },
      { id: operadorUserId, rol: 'ADMIN' },
      '127.0.0.1'
    );

    expect(reasignacion.atencionId).toBe(atencionId);
    expect(reasignacion.estado).toBe(EstadoAtencionProgramada.PROGRAMADA);

    // Verificar que conductor anterior recibió DESASIGNACION_SERVICIO
    const notifSaliente = await prisma.notificacionConductor.findFirst({
      where: {
        conductorId: conductor1UserId,
        tipo: 'DESASIGNACION_SERVICIO'
      },
      orderBy: { createdAt: 'desc' }
    });
    expect(notifSaliente).not.toBeNull();
    expect(notifSaliente?.mensaje).toContain('Licencia médica');

    // Verificar que nuevo conductor recibió ASIGNACION_SERVICIO
    const notifEntrante = await prisma.notificacionConductor.findFirst({
      where: {
        conductorId: conductor2UserId,
        tipo: 'ASIGNACION_SERVICIO'
      },
      orderBy: { createdAt: 'desc' }
    });
    expect(notifEntrante).not.toBeNull();

    // Verificar AuditoriaEvento con detalle del cambio
    const auditoria = await prisma.auditoriaEvento.findFirst({
      where: {
        recurso: 'AtencionProgramada',
        recursoId: atencionId,
        accion: 'REASIGNACION_SERVICIO'
      },
      orderBy: { fechaHora: 'desc' }
    });
    expect(auditoria).not.toBeNull();
    expect(auditoria?.usuarioId).toBe(operadorUserId);
  });
});
