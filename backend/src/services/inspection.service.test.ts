import { describe, it, expect, beforeAll } from 'vitest';
import { InspectionService, InspeccionSalidaInput } from './inspection.service.js';
import { FleetService, FleetError } from './fleet.service.js';
import { prisma } from '../utils/prisma.js';
import {
  TipoEquipo,
  EstadoEquipo,
  OrigenBloqueo,
  TipoFotoInspeccion,
  EstadoInspeccion,
  RolUsuario
} from '@prisma/client';

describe('InspectionService & Integración Checklist F-GMT', () => {
  let conductorUserId: string;
  const superadminActor = { userId: 'usr-superadmin-01', rol: RolUsuario.SUPERADMIN, ip: '127.0.0.1' };

  const fotosValidas = [
    { tipo: TipoFotoInspeccion.FRONTAL, archivoUrl: 'http://cdn.zion.cl/f1.jpg' },
    { tipo: TipoFotoInspeccion.LATERAL_IZQUIERDA, archivoUrl: 'http://cdn.zion.cl/f2.jpg' },
    { tipo: TipoFotoInspeccion.TRASERA, archivoUrl: 'http://cdn.zion.cl/f3.jpg' },
    { tipo: TipoFotoInspeccion.LATERAL_DERECHA, archivoUrl: 'http://cdn.zion.cl/f4.jpg' }
  ];

  beforeAll(async () => {
    const conductor = await prisma.conductor.findFirst({
      include: { usuario: true }
    });
    conductorUserId = conductor ? conductor.usuario.id : 'usr-conductor-01';
  });

  it('1. evaluarInspeccionSalida: se mantiene pura y no muta la base de datos', () => {
    const inputConforme: InspeccionSalidaInput = {
      vehiculoId: 'veh-pure-test',
      conductorId: conductorUserId,
      fotos360: fotosValidas,
      items: [
        {
          categoria: 'MECANICA',
          numero: 1,
          nombre: 'Freno de estacionamiento',
          estado: 'BUENO',
          esCritico: true
        }
      ]
    };

    const resultado = InspectionService.evaluarInspeccionSalida(inputConforme);
    expect(resultado.estado).toBe(EstadoInspeccion.CONFORME);
    expect(resultado.bloqueado).toBe(false);
    expect(resultado.motivoBloqueo).toBeUndefined();
  });

  it('2. evaluarInspeccionSalida: falla crítica genera bloqueado = true y motivo descriptivo', () => {
    const inputCritico: InspeccionSalidaInput = {
      vehiculoId: 'veh-crit-test',
      conductorId: conductorUserId,
      fotos360: fotosValidas,
      items: [
        {
          categoria: 'MECANICA',
          numero: 4,
          nombre: 'Dirección hidráulica',
          estado: 'MALO',
          esCritico: true
        }
      ]
    };

    const resultado = InspectionService.evaluarInspeccionSalida(inputCritico);
    expect(resultado.estado).toBe(EstadoInspeccion.NO_CONFORME);
    expect(resultado.bloqueado).toBe(true);
    expect(resultado.motivoBloqueo).toContain('Dirección hidráulica');
  });

  it('3. aplicarBloqueoSeguridad: persiste estado DESHABILITADO con origen CHECKLIST_SEGURIDAD y audita', async () => {
    const equipo = await FleetService.crear(
      {
        patente: `CHK-${Date.now().toString().slice(-4)}`,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Volvo',
        modelo: 'FM',
        anio: 2022,
        capacidadEstanqueM3: 20
      },
      superadminActor
    );

    const resultadoEvaluacion = {
      bloqueado: true,
      motivoBloqueo: 'Bloqueo automático de seguridad: Fuga severa en válvula de descarga'
    };

    await InspectionService.aplicarBloqueoSeguridad(
      equipo.id,
      resultadoEvaluacion,
      { userId: conductorUserId, ip: '127.0.0.1' }
    );

    const equipoActualizado = await prisma.vehiculo.findUnique({ where: { id: equipo.id } });
    expect(equipoActualizado?.estado).toBe(EstadoEquipo.DESHABILITADO);
    expect(equipoActualizado?.origenBloqueo).toBe(OrigenBloqueo.CHECKLIST_SEGURIDAD);
    expect(equipoActualizado?.motivoEstado).toBe('Bloqueo automático de seguridad: Fuga severa en válvula de descarga');

    // Verificar auditoría FLOTA_BLOQUEO_CHECKLIST
    const audit = await prisma.auditoriaEvento.findFirst({
      where: { recursoId: equipo.id, accion: 'FLOTA_BLOQUEO_CHECKLIST' },
      orderBy: { fechaHora: 'desc' }
    });
    expect(audit).toBeDefined();
    expect(audit?.accion).toBe('FLOTA_BLOQUEO_CHECKLIST');
    expect(audit?.usuarioId).toBe(conductorUserId);
  });

  it('4. aplicarBloqueoSeguridad: si el resultado no está bloqueado, no altera el estado del vehículo', async () => {
    const equipo = await FleetService.crear(
      {
        patente: `OK-${Date.now().toString().slice(-4)}`,
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Scania',
        modelo: 'R500',
        anio: 2023,
        capacidadEstanqueM3: 30
      },
      superadminActor
    );

    await InspectionService.aplicarBloqueoSeguridad(
      equipo.id,
      { bloqueado: false },
      { userId: conductorUserId }
    );

    const equipoVerificado = await prisma.vehiculo.findUnique({ where: { id: equipo.id } });
    expect(equipoVerificado?.estado).toBe(EstadoEquipo.HABILITADO);
    expect(equipoVerificado?.origenBloqueo).toBeNull();
  });
});
