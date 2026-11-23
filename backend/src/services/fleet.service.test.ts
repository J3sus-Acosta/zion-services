import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../utils/prisma.js';
import {
  FleetService,
  FleetError,
  ROLES_GESTION_FLOTA,
  ROLES_LEVANTAN_BLOQUEO_CHECKLIST
} from './fleet.service.js';
import {
  RolUsuario,
  TipoEquipo,
  EstadoEquipo,
  OrigenBloqueo,
  EstadoJornada,
  ModalidadJornada
} from '@prisma/client';

describe('FleetService (Pruebas Unitarias y de Integración de Negocio)', () => {
  let superadminActor = { userId: 'usr-superadmin-01', rol: RolUsuario.SUPERADMIN, ip: '127.0.0.1' };
  let jefeActor = { userId: 'usr-jefe-ops-01', rol: RolUsuario.JEFE_OPERACIONES, ip: '127.0.0.1' };
  let testConductorUserId = 'usr-conductor-01';

  beforeAll(async () => {
    // Asegurar usuario y conductor para pruebas
    const conductor = await prisma.conductor.findFirst({
      include: { usuario: true }
    });
    if (conductor) {
      testConductorUserId = conductor.usuario.id;
    }
  });

  it('1. crear: registra un nuevo equipo en HABILITADO y genera auditoría FLOTA_CREAR', async () => {
    const patenteTest = `TEST-${Date.now().toString().slice(-4)}`;
    const nuevo = await FleetService.crear(
      {
        patente: patenteTest,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Scania',
        modelo: 'R500',
        anio: 2023,
        capacidadEstanqueM3: 32,
        equipoHidrojet: true,
        equipoVacio: true
      },
      superadminActor
    );

    expect(nuevo.id).toBeDefined();
    expect(nuevo.patente).toBe(patenteTest);
    expect(nuevo.estado).toBe(EstadoEquipo.HABILITADO);
    expect(nuevo.motivoEstado).toBeNull();
    expect(nuevo.origenBloqueo).toBeNull();

    // Invariante: ausencia de métodos de eliminación física en FleetService
    expect((FleetService as any).eliminar).toBeUndefined();
    expect((FleetService as any).delete).toBeUndefined();
    expect((FleetService as any).borrar).toBeUndefined();

    // Verificar auditoría
    const audit = await prisma.auditoriaEvento.findFirst({
      where: {
        recursoId: nuevo.id,
        accion: 'FLOTA_CREAR'
      }
    });
    expect(audit).toBeDefined();
    expect(audit?.accion).toBe('FLOTA_CREAR');
  });

  it('2. crear y editar: rechaza patentes duplicadas con 409 FLEET_PLATE_DUPLICATE', async () => {
    const patenteTest = `DUP-${Date.now().toString().slice(-4)}`;
    const equipo = await FleetService.crear(
      {
        patente: patenteTest,
        tipoEquipo: TipoEquipo.CAMIONETA,
        marca: 'Toyota',
        modelo: 'Hilux',
        anio: 2021,
        capacidadEstanqueM3: 0
      },
      superadminActor
    );

    await expect(
      FleetService.crear(
        {
          patente: patenteTest.toLowerCase(), // Normaliza a mayúsculas y detecta colisión
          tipoEquipo: TipoEquipo.CAMIONETA,
          marca: 'Nissan',
          modelo: 'Navara',
          anio: 2022,
          capacidadEstanqueM3: 0
        },
        superadminActor
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 409,
        code: 'FLEET_PLATE_DUPLICATE'
      })
    );

    // Intentar editar otra unidad asignándole la patente ya existente
    const otro = await FleetService.crear(
      {
        patente: `OTR-${Date.now().toString().slice(-4)}`,
        tipoEquipo: TipoEquipo.CAMIONETA,
        marca: 'Ford',
        modelo: 'Ranger',
        anio: 2022,
        capacidadEstanqueM3: 0
      },
      superadminActor
    );

    await expect(
      FleetService.editar(otro.id, { patente: patenteTest }, superadminActor)
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 409,
        code: 'FLEET_PLATE_DUPLICATE'
      })
    );
  });

  it('3. editar y obtener: permite modificar características, audita diferencias y rechaza IDs inexistentes con 404', async () => {
    const patenteTest = `ED-${Date.now().toString().slice(-4)}`;
    const equipo = await FleetService.crear(
      {
        patente: patenteTest,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'MAN',
        modelo: 'TGX',
        anio: 2020,
        capacidadEstanqueM3: 20
      },
      superadminActor
    );

    const editado = await FleetService.editar(
      equipo.id,
      {
        marca: 'MAN Truck & Bus',
        capacidadEstanqueM3: 25.5,
        observaciones: 'Instalada válvula de alivio adicional'
      },
      superadminActor
    );

    expect(editado.marca).toBe('MAN Truck & Bus');
    expect(Number(editado.capacidadEstanqueM3)).toBe(25.5);
    expect(editado.observaciones).toBe('Instalada válvula de alivio adicional');

    const audit = await prisma.auditoriaEvento.findFirst({
      where: {
        recursoId: equipo.id,
        accion: 'FLOTA_EDITAR'
      },
      orderBy: { fechaHora: 'desc' }
    });
    expect(audit).toBeDefined();
    const detalles: any = audit?.detallesJson;
    expect(detalles.nuevos.marca).toBe('MAN Truck & Bus');
    expect(detalles.previos.marca).toBe('MAN');

    // 404 en editar equipo no existente
    await expect(
      FleetService.editar('c1000000-0000-0000-0000-000000000000', { marca: 'Scania' }, superadminActor)
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 404,
        code: 'FLEET_NOT_FOUND'
      })
    );

    // 404 en obtener equipo no existente
    await expect(
      FleetService.obtener('c1000000-0000-0000-0000-000000000000')
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 404,
        code: 'FLEET_NOT_FOUND'
      })
    );
  });

  it('4. cambiarEstado: detecta conflicto de estado al solicitar el estado actual (409 FLEET_STATE_CONFLICT)', async () => {
    const patenteTest = `CONF-${Date.now().toString().slice(-4)}`;
    const equipo = await FleetService.crear(
      {
        patente: patenteTest,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Volvo',
        modelo: 'VM',
        anio: 2021,
        capacidadEstanqueM3: 15
      },
      superadminActor
    );

    // 4a. Intentar habilitar lo que ya está HABILITADO
    await expect(
      FleetService.cambiarEstado(
        equipo.id,
        { estado: EstadoEquipo.HABILITADO },
        superadminActor
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 409,
        code: 'FLEET_STATE_CONFLICT'
      })
    );

    // Deshabilitar válidamente
    await FleetService.cambiarEstado(
      equipo.id,
      { estado: EstadoEquipo.DESHABILITADO, motivo: 'Mantenimiento preventivo general' },
      superadminActor
    );

    // 4b. Intentar deshabilitar lo que ya está DESHABILITADO
    await expect(
      FleetService.cambiarEstado(
        equipo.id,
        { estado: EstadoEquipo.DESHABILITADO, motivo: 'Reintento de deshabilitación' },
        superadminActor
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 409,
        code: 'FLEET_STATE_CONFLICT'
      })
    );
  });

  it('5. cambiarEstado: deshabilitar sin motivo es rechazado con 400 VALIDATION_ERROR', async () => {
    const patenteTest = `NOMOT-${Date.now().toString().slice(-4)}`;
    const equipo = await FleetService.crear(
      {
        patente: patenteTest,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Volvo',
        modelo: 'VM',
        anio: 2021,
        capacidadEstanqueM3: 15
      },
      superadminActor
    );

    await expect(
      FleetService.cambiarEstado(
        equipo.id,
        { estado: EstadoEquipo.DESHABILITADO, motivo: '   ' } as any,
        jefeActor
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 400,
        code: 'VALIDATION_ERROR'
      })
    );
  });

  it('5. cambiarEstado: deshabilitar sin jornadas activas actualiza a DESHABILITADO/MANUAL', async () => {
    const patenteTest = `DES-${Date.now().toString().slice(-4)}`;
    const equipo = await FleetService.crear(
      {
        patente: patenteTest,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Volvo',
        modelo: 'VM',
        anio: 2021,
        capacidadEstanqueM3: 15
      },
      superadminActor
    );

    const res = await FleetService.cambiarEstado(
      equipo.id,
      {
        estado: EstadoEquipo.DESHABILITADO,
        motivo: 'Falla menor en compresor de aire'
      },
      jefeActor
    );

    expect(res.equipo.estado).toBe(EstadoEquipo.DESHABILITADO);
    expect(res.equipo.motivoEstado).toBe('Falla menor en compresor de aire');
    expect(res.equipo.origenBloqueo).toBe(OrigenBloqueo.MANUAL);
    expect(res.transferencia).toBeNull();
  });

  it('6. cambiarEstado (R1): JEFE_OPERACIONES NO puede levantar bloqueo CHECKLIST_SEGURIDAD (403 FLEET_UNLOCK_FORBIDDEN)', async () => {
    const patenteTest = `CHK-${Date.now().toString().slice(-4)}`;
    const equipo = await FleetService.crear(
      {
        patente: patenteTest,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Mack',
        modelo: 'Anthem',
        anio: 2022,
        capacidadEstanqueM3: 30
      },
      superadminActor
    );

    // Simular bloqueo originado por checklist de seguridad
    await FleetService.bloquearPorChecklist(
      equipo.id,
      'Falla crítica: Frenos con fuga de líquido hidráulico',
      { userId: testConductorUserId }
    );

    // Intento de desbloqueo por JEFE_OPERACIONES debe fallar (R1)
    await expect(
      FleetService.cambiarEstado(
        equipo.id,
        { estado: EstadoEquipo.HABILITADO },
        jefeActor
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 403,
        code: 'FLEET_UNLOCK_FORBIDDEN'
      })
    );

    // Desbloqueo por SUPERADMIN o ADMIN debe ser exitoso
    const res = await FleetService.cambiarEstado(
      equipo.id,
      { estado: EstadoEquipo.HABILITADO },
      superadminActor
    );

    expect(res.equipo.estado).toBe(EstadoEquipo.HABILITADO);
    expect(res.equipo.motivoEstado).toBeNull();
    expect(res.equipo.origenBloqueo).toBeNull();
  });

  it('7. cambiarEstado (R7/D12): deshabilitar equipo con jornadas activas sin destino exige transferencia (409 FLEET_TRANSFER_REQUIRED)', async () => {
    const conductor = await prisma.conductor.findFirst();
    if (!conductor) return;

    const origen = await FleetService.crear(
      {
        patente: `ACT-${Date.now().toString().slice(-4)}`,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Volvo',
        modelo: 'FM',
        anio: 2022,
        capacidadEstanqueM3: 25
      },
      superadminActor
    );

    // Crear una jornada PROGRAMADA activa sobre este equipo
    await prisma.jornada.create({
      data: {
        vehiculoId: origen.id,
        conductorId: conductor.id,
        fechaInicio: new Date(),
        modalidad: ModalidadJornada.LOCAL_SANTIAGO,
        estado: EstadoJornada.PROGRAMADA
      }
    });

    await expect(
      FleetService.cambiarEstado(
        origen.id,
        {
          estado: EstadoEquipo.DESHABILITADO,
          motivo: 'Mantenimiento urgente sin equipo destino asignado'
        },
        jefeActor
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 409,
        code: 'FLEET_TRANSFER_REQUIRED'
      })
    );
  });

  it('8. cambiarEstado + transferencia atómica (R2/D12/D13): deshabilitar y transferir jornadas activas con notificación y regla R2', async () => {
    const conductor = await prisma.conductor.findFirst({ include: { usuario: true } });
    if (!conductor) return;

    const origen = await FleetService.crear(
      {
        patente: `TR1-${Date.now().toString().slice(-4)}`,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Volvo',
        modelo: 'FH',
        anio: 2023,
        capacidadEstanqueM3: 30
      },
      superadminActor
    );

    const destino = await FleetService.crear(
      {
        patente: `TR2-${Date.now().toString().slice(-4)}`,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Scania',
        modelo: 'G450',
        anio: 2023,
        capacidadEstanqueM3: 30
      },
      superadminActor
    );

    // Crear inspección de prueba para asociar a la jornada PROGRAMADA
    const insp = await prisma.inspeccionSalida_F_GMT.create({
      data: {
        vehiculoId: origen.id,
        conductorId: conductor.id,
        itemsChecklist: {},
        estado: 'CONFORME'
      }
    });

    // Jornada PROGRAMADA con inspeccionSalidaId (R2: debe desvincularla)
    const jornadaProg = await prisma.jornada.create({
      data: {
        vehiculoId: origen.id,
        conductorId: conductor.id,
        fechaInicio: new Date(Date.now() + 3600000),
        modalidad: ModalidadJornada.LOCAL_SANTIAGO,
        estado: EstadoJornada.PROGRAMADA,
        inspeccionSalidaId: insp.id
      }
    });

    // Deshabilitar origen con destino
    const res = await FleetService.cambiarEstado(
      origen.id,
      {
        estado: EstadoEquipo.DESHABILITADO,
        motivo: 'Falla detectada antes de partir',
        vehiculoDestinoId: destino.id
      },
      jefeActor
    );

    expect(res.equipo.estado).toBe(EstadoEquipo.DESHABILITADO);
    expect(res.transferencia).toBeDefined();
    expect(res.transferencia?.destino.id).toBe(destino.id);
    expect(res.transferencia?.jornadasTransferidas).toContain(jornadaProg.id);

    // Verificar regla R2: la jornada pasó al destino y desvinculó inspeccionSalidaId
    const jornadaActualizada = await prisma.jornada.findUnique({
      where: { id: jornadaProg.id }
    });
    expect(jornadaActualizada?.vehiculoId).toBe(destino.id);
    expect(jornadaActualizada?.inspeccionSalidaId).toBeNull();

    // Verificar notificación al conductor (D13)
    const notif = await prisma.notificacionConductor.findFirst({
      where: {
        conductorId: conductor.usuarioId,
        tipo: 'TRANSFERENCIA_FLOTA'
      },
      orderBy: { createdAt: 'desc' }
    });
    expect(notif).toBeDefined();
    expect(notif?.mensaje).toContain(destino.patente);
  });

  it('9. assertDespachable: lanza 409 FLEET_DISABLED si el vehículo está DESHABILITADO', async () => {
    const equipo = await FleetService.crear(
      {
        patente: `DIS-${Date.now().toString().slice(-4)}`,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Volvo',
        modelo: 'FMX',
        anio: 2021,
        capacidadEstanqueM3: 20
      },
      superadminActor
    );

    // Inicialmente habilitado: assertDespachable no lanza
    await expect(FleetService.assertDespachable(equipo.id)).resolves.not.toThrow();

    // Deshabilitar
    await FleetService.cambiarEstado(
      equipo.id,
      {
        estado: EstadoEquipo.DESHABILITADO,
        motivo: 'Mantenimiento mayor'
      },
      jefeActor
    );

    // Ahora debe lanzar 409
    await expect(FleetService.assertDespachable(equipo.id)).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 409,
        code: 'FLEET_DISABLED'
      })
    );

    // assertDespachable con ID inexistente lanza 404
    await expect(
      FleetService.assertDespachable('c2000000-0000-0000-0000-000000000000')
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 404,
        code: 'FLEET_NOT_FOUND'
      })
    );
  });

  it('10. cambiarEstado (R1): JEFE_OPERACIONES SÍ puede levantar bloqueo con origen MANUAL', async () => {
    const patenteTest = `MAN-${Date.now().toString().slice(-4)}`;
    const equipo = await FleetService.crear(
      {
        patente: patenteTest,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Volvo',
        modelo: 'FM',
        anio: 2021,
        capacidadEstanqueM3: 20
      },
      superadminActor
    );

    // Deshabilitar manualmente por JEFE
    await FleetService.cambiarEstado(
      equipo.id,
      {
        estado: EstadoEquipo.DESHABILITADO,
        motivo: 'Mantenimiento en taller central'
      },
      jefeActor
    );

    // JEFE_OPERACIONES levanta el bloqueo MANUAL
    const res = await FleetService.cambiarEstado(
      equipo.id,
      { estado: EstadoEquipo.HABILITADO },
      jefeActor
    );

    expect(res.equipo.estado).toBe(EstadoEquipo.HABILITADO);
    expect(res.equipo.motivoEstado).toBeNull();
    expect(res.equipo.origenBloqueo).toBeNull();

    const audit = await prisma.auditoriaEvento.findFirst({
      where: { recursoId: equipo.id, accion: 'FLOTA_HABILITAR' },
      orderBy: { fechaHora: 'desc' }
    });
    expect(audit).toBeDefined();
    const det: any = audit?.detallesJson;
    expect(det.origenPrevio).toBe(OrigenBloqueo.MANUAL);
    expect(det.motivoPrevio).toBe('Mantenimiento en taller central');
  });

  it('11. transferencia: rechazo con 409 FLEET_TRANSFER_INVALID_TARGET y rollback atómico ante destino inválido o en conflicto', async () => {
    const conductor = await prisma.conductor.findFirst();
    if (!conductor) return;

    const origen = await FleetService.crear(
      {
        patente: `ORIG-${Date.now().toString().slice(-4)}`,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Mercedes-Benz',
        modelo: 'Actros',
        anio: 2022,
        capacidadEstanqueM3: 28
      },
      superadminActor
    );

    const jornadaActiva = await prisma.jornada.create({
      data: {
        vehiculoId: origen.id,
        conductorId: conductor.id,
        fechaInicio: new Date(),
        modalidad: ModalidadJornada.LOCAL_SANTIAGO,
        estado: EstadoJornada.PROGRAMADA
      }
    });

    // 11a. Destino inexistente
    await expect(
      FleetService.cambiarEstado(
        origen.id,
        {
          estado: EstadoEquipo.DESHABILITADO,
          motivo: 'Falla urgente',
          vehiculoDestinoId: 'c3000000-0000-0000-0000-000000000000'
        },
        jefeActor
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 409,
        code: 'FLEET_TRANSFER_INVALID_TARGET'
      })
    );

    // 11b. Destino igual al origen
    await expect(
      FleetService.cambiarEstado(
        origen.id,
        {
          estado: EstadoEquipo.DESHABILITADO,
          motivo: 'Falla urgente',
          vehiculoDestinoId: origen.id
        },
        jefeActor
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 409,
        code: 'FLEET_TRANSFER_INVALID_TARGET'
      })
    );

    // 11c. Destino DESHABILITADO
    const destinoDeshabilitado = await FleetService.crear(
      {
        patente: `DDES-${Date.now().toString().slice(-4)}`,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Scania',
        modelo: 'R450',
        anio: 2020,
        capacidadEstanqueM3: 28
      },
      superadminActor
    );
    await FleetService.cambiarEstado(
      destinoDeshabilitado.id,
      { estado: EstadoEquipo.DESHABILITADO, motivo: 'En panne' },
      superadminActor
    );

    await expect(
      FleetService.cambiarEstado(
        origen.id,
        {
          estado: EstadoEquipo.DESHABILITADO,
          motivo: 'Falla urgente',
          vehiculoDestinoId: destinoDeshabilitado.id
        },
        jefeActor
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 409,
        code: 'FLEET_TRANSFER_INVALID_TARGET'
      })
    );

    // 11d. Destino con solapamiento temporal de jornada activa
    const destinoConConflicto = await FleetService.crear(
      {
        patente: `DCNF-${Date.now().toString().slice(-4)}`,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Volvo',
        modelo: 'FH',
        anio: 2022,
        capacidadEstanqueM3: 28
      },
      superadminActor
    );
    await prisma.jornada.create({
      data: {
        vehiculoId: destinoConConflicto.id,
        conductorId: conductor.id,
        fechaInicio: new Date(),
        modalidad: ModalidadJornada.LOCAL_SANTIAGO,
        estado: EstadoJornada.EN_CURSO
      }
    });

    await expect(
      FleetService.cambiarEstado(
        origen.id,
        {
          estado: EstadoEquipo.DESHABILITADO,
          motivo: 'Falla urgente',
          vehiculoDestinoId: destinoConConflicto.id
        },
        jefeActor
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 409,
        code: 'FLEET_TRANSFER_INVALID_TARGET'
      })
    );

    // 11e. Rollback atómico: verificar que el origen sigue HABILITADO y la jornada intacta
    const origenPostRollback = await prisma.vehiculo.findUnique({ where: { id: origen.id } });
    expect(origenPostRollback?.estado).toBe(EstadoEquipo.HABILITADO);

    const jornadaPostRollback = await prisma.jornada.findUnique({ where: { id: jornadaActiva.id } });
    expect(jornadaPostRollback?.vehiculoId).toBe(origen.id);
  });

  it('12. tratamiento de inspecciones (R2/D11): jornada EN_CURSO conserva inspeccionSalidaId y se anota en auditoría', async () => {
    const conductor = await prisma.conductor.findFirst({ include: { usuario: true } });
    if (!conductor) return;

    const origen = await FleetService.crear(
      {
        patente: `ENC-${Date.now().toString().slice(-4)}`,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Volvo',
        modelo: 'FH-16',
        anio: 2023,
        capacidadEstanqueM3: 35
      },
      superadminActor
    );

    const destino = await FleetService.crear(
      {
        patente: `DST-${Date.now().toString().slice(-4)}`,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Scania',
        modelo: 'G500',
        anio: 2023,
        capacidadEstanqueM3: 35
      },
      superadminActor
    );

    // Inspección de salida realizada
    const insp = await prisma.inspeccionSalida_F_GMT.create({
      data: {
        vehiculoId: origen.id,
        conductorId: conductor.id,
        itemsChecklist: {},
        estado: 'CONFORME'
      }
    });

    // Jornada EN_CURSO iniciada con la inspección
    const jornadaEnCurso = await prisma.jornada.create({
      data: {
        vehiculoId: origen.id,
        conductorId: conductor.id,
        fechaInicio: new Date(Date.now() - 3600000), // Hace 1 hora
        modalidad: ModalidadJornada.LOCAL_SANTIAGO,
        estado: EstadoJornada.EN_CURSO,
        inspeccionSalidaId: insp.id
      }
    });

    // Transferir por deshabilitación
    const res = await FleetService.cambiarEstado(
      origen.id,
      {
        estado: EstadoEquipo.DESHABILITADO,
        motivo: 'Pinchazo masivo en ruta, reemplazo de camión',
        vehiculoDestinoId: destino.id
      },
      jefeActor
    );

    expect(res.equipo.estado).toBe(EstadoEquipo.DESHABILITADO);

    // Regla R2 para EN_CURSO: la inspección de salida original SE CONSERVA
    const jornadaActualizada = await prisma.jornada.findUnique({
      where: { id: jornadaEnCurso.id }
    });
    expect(jornadaActualizada?.vehiculoId).toBe(destino.id);
    expect(jornadaActualizada?.inspeccionSalidaId).toBe(insp.id);

    // Verificar en auditoría que quedó registrado en inspeccionesConservadas
    const audit = await prisma.auditoriaEvento.findFirst({
      where: { recursoId: origen.id, accion: 'FLOTA_TRANSFERIR' },
      orderBy: { fechaHora: 'desc' }
    });
    expect(audit).toBeDefined();
    const detalles: any = audit?.detallesJson;
    expect(detalles.inspeccionesConservadas).toBeDefined();
    expect(
      detalles.inspeccionesConservadas.some(
        (ic: any) => ic.jornadaId === jornadaEnCurso.id && ic.inspeccionSalidaId === insp.id
      )
    ).toBe(true);
  });

  it('13. transferir: reasigna jornadas de un equipo ya DESHABILITADO sin alterar su estado y valida ausencia de operaciones', async () => {
    const conductor = await prisma.conductor.findFirst({ include: { usuario: true } });
    if (!conductor) return;

    const origenBloqueado = await FleetService.crear(
      {
        patente: `BLQ-${Date.now().toString().slice(-4)}`,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Mack',
        modelo: 'Granite',
        anio: 2021,
        capacidadEstanqueM3: 24
      },
      superadminActor
    );

    // Simular bloqueo automático por checklist con jornada activa ya asignada
    await FleetService.bloquearPorChecklist(
      origenBloqueado.id,
      'Falla crítica detectada durante inspección de salida',
      { userId: testConductorUserId }
    );

    const jornada = await prisma.jornada.create({
      data: {
        vehiculoId: origenBloqueado.id,
        conductorId: conductor.id,
        fechaInicio: new Date(),
        modalidad: ModalidadJornada.LOCAL_SANTIAGO,
        estado: EstadoJornada.PROGRAMADA
      }
    });

    const destino = await FleetService.crear(
      {
        patente: `DES2-${Date.now().toString().slice(-4)}`,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Volvo',
        modelo: 'FMX',
        anio: 2022,
        capacidadEstanqueM3: 24
      },
      superadminActor
    );

    // Reasignar operaciones mediante transferir (POST /transferir)
    const { transferencia } = await FleetService.transferir(
      origenBloqueado.id,
      { vehiculoDestinoId: destino.id },
      jefeActor
    );

    expect(transferencia.jornadasTransferidas).toContain(jornada.id);

    // Origen sigue DESHABILITADO con su motivo y origenBloqueo intactos
    const origenRecargado = await prisma.vehiculo.findUnique({ where: { id: origenBloqueado.id } });
    expect(origenRecargado?.estado).toBe(EstadoEquipo.DESHABILITADO);
    expect(origenRecargado?.origenBloqueo).toBe(OrigenBloqueo.CHECKLIST_SEGURIDAD);

    // Jornada ahora pertenece al destino
    const jornadaActualizada = await prisma.jornada.findUnique({ where: { id: jornada.id } });
    expect(jornadaActualizada?.vehiculoId).toBe(destino.id);

    // 13b. Si no quedan operaciones activas, transferir debe responder 409 FLEET_NO_ACTIVE_OPERATIONS
    await expect(
      FleetService.transferir(
        origenBloqueado.id,
        { vehiculoDestinoId: destino.id },
        jefeActor
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 409,
        code: 'FLEET_NO_ACTIVE_OPERATIONS'
      })
    );

    // 13c. Si se envía jornadaIds con un ID que no pertenece al origen o inactivo -> 409 FLEET_TRANSFER_INVALID_TARGET
    await expect(
      FleetService.transferir(
        destino.id,
        {
          vehiculoDestinoId: origenBloqueado.id,
          jornadaIds: ['c4000000-0000-0000-0000-000000000000']
        },
        jefeActor
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 409,
        code: 'FLEET_TRANSFER_INVALID_TARGET'
      })
    );
  });

  it('14. bloquearPorChecklist: no sobrescribe motivo ni origen MANUAL si el equipo ya estaba DESHABILITADO', async () => {
    const patenteTest = `PREV-${Date.now().toString().slice(-4)}`;
    const equipo = await FleetService.crear(
      {
        patente: patenteTest,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Volvo',
        modelo: 'VM',
        anio: 2021,
        capacidadEstanqueM3: 20
      },
      superadminActor
    );

    // Deshabilitación manual previa
    await FleetService.cambiarEstado(
      equipo.id,
      {
        estado: EstadoEquipo.DESHABILITADO,
        motivo: 'Retirado por mantenimiento preventivo mayor'
      },
      jefeActor
    );

    // Intento posterior de bloqueo por checklist
    await FleetService.bloquearPorChecklist(
      equipo.id,
      'Falla crítica: Luces de freno defectuosas',
      { userId: testConductorUserId }
    );

    const reconsultado = await prisma.vehiculo.findUnique({ where: { id: equipo.id } });
    expect(reconsultado?.estado).toBe(EstadoEquipo.DESHABILITADO);
    expect(reconsultado?.origenBloqueo).toBe(OrigenBloqueo.MANUAL); // No sobrescribe MANUAL
    expect(reconsultado?.motivoEstado).toBe('Retirado por mantenimiento preventivo mayor');

    // Sin embargo, se genera el evento de auditoría del intento de checklist
    const audit = await prisma.auditoriaEvento.findFirst({
      where: { recursoId: equipo.id, accion: 'FLOTA_BLOQUEO_CHECKLIST' },
      orderBy: { fechaHora: 'desc' }
    });
    expect(audit).toBeDefined();
    const det: any = audit?.detallesJson;
    expect(det.motivo).toContain('Luces de freno defectuosas');
  });

  it('15. Auditoría de Flota: registra eventos con campos esperados y sin PII en detallesJson', async () => {
    const eventos = await prisma.auditoriaEvento.findMany({
      where: {
        recurso: 'Vehiculo',
        accion: { in: ['FLOTA_CREAR', 'FLOTA_EDITAR', 'FLOTA_DESHABILITAR', 'FLOTA_HABILITAR', 'FLOTA_TRANSFERIR', 'FLOTA_BLOQUEO_CHECKLIST'] }
      },
      take: 20
    });

    expect(eventos.length).toBeGreaterThan(0);

    for (const ev of eventos) {
      expect(ev.recurso).toBe('Vehiculo');
      expect(ev.recursoId).toBeDefined();
      expect(ev.detallesJson).toBeDefined();

      const jsonStr = JSON.stringify(ev.detallesJson).toLowerCase();
      // Verificación de ausencia de PII y credenciales
      expect(jsonStr).not.toContain('password');
      expect(jsonStr).not.toContain('hash');
      expect(jsonStr).not.toContain('token');
      expect(jsonStr).not.toContain('jwt');
      expect(jsonStr).not.toContain('secret');
    }
  });
});
