import { describe, it, expect, vi } from 'vitest';
import { EstadoCicloTransporte, TipoRecepcion } from '@prisma/client';

const mockCiclo = {
  id: 'ciclo-1',
  ordenServicioId: 'os-1',
  estado: EstadoCicloTransporte.PENDIENTE,
  ordenServicio: {
    id: 'os-1',
    expedienteDocumental: { id: 'exp-1' }
  }
};

vi.mock('../utils/prisma.js', () => {
  const tx = {
    cicloTransporte: {
      findUnique: vi.fn(async () => mockCiclo),
      update: vi.fn(async ({ data }: any) => ({ ...mockCiclo, ...data }))
    },
    registroTelemetriaGPS: {
      create: vi.fn(async ({ data }: any) => data)
    },
    autorizacionFaena: {
      upsert: vi.fn(async ({ create }: any) => create)
    },
    fotoFaenaEPP: {
      create: vi.fn(async ({ data }: any) => ({ id: 'foto-1', ...data }))
    },
    expedienteDocumental: {
      upsert: vi.fn(async () => ({ id: 'exp-1' }))
    },
    documentoExpediente: {
      create: vi.fn(async ({ data }: any) => data)
    },
    actaRecepcion: {
      upsert: vi.fn(async ({ create }: any) => ({ id: 'acta-1', ...create }))
    },
    ordenServicio: {
      update: vi.fn(async () => ({}))
    }
  };

  return {
    prisma: {
      ...tx,
      $transaction: vi.fn(async (cb: any) => cb(tx))
    }
  };
});

import { TransportCycleService } from './transport-cycle.service.js';

describe('Ciclo de Transporte en Terreno (Tablet Android)', () => {
  it('debe registrar hora de llegada y cambiar a EN_FAENA', async () => {
    const llegada = await TransportCycleService.registrarLlegada({
      cicloTransporteId: 'ciclo-1',
      horaLlegada: new Date('2026-11-20T10:15:00Z')
    });

    expect(llegada.estado).toBe(EstadoCicloTransporte.EN_FAENA);
    expect(llegada.horaLlegada).toBeDefined();
  });

  it('debe requerir firma de Orden de Trabajo para autorizar inicio y desbloquear fotos de faena y EPP', async () => {
    const autorizacion = await TransportCycleService.autorizarInicioFaena({
      cicloTransporteId: 'ciclo-1',
      nombreCliente: 'Cristóbal Guzmán',
      rutCliente: '19.783.569-9',
      firmaSvg: '<svg>firma_digital_ot</svg>',
      fechaHora: new Date('2026-11-20T10:20:00Z')
    });

    expect(autorizacion.estado).toBe(EstadoCicloTransporte.FAENA_AUTORIZADA);
    expect(autorizacion.fotosFaenaPermitidas).toBe(true);
  });

  it('debe rechazar fotos de faena si no se ha firmado la Orden de Trabajo', async () => {
    await expect(
      TransportCycleService.registrarFotoFaena(EstadoCicloTransporte.PENDIENTE, {
        cicloTransporteId: 'ciclo-1',
        archivoUrl: '/uploads/faena1.jpg',
        descripcion: 'Succión estanque 1'
      })
    ).rejects.toThrowError(/sin haber firmado previamente la Orden de Trabajo/);
  });

  it('debe permitir recepción con observaciones obligatorias sin firma inventada', async () => {
    const recepcionObservada = await TransportCycleService.finalizarRecepcion({
      cicloTransporteId: 'ciclo-1',
      tipoRecepcion: TipoRecepcion.CON_OBSERVACIONES,
      observaciones: 'Encargado ausente por reunión, personal de seguridad autoriza salida',
      fotoRespaldoUrl: '/uploads/bitacora_seguridad.jpg'
    });

    expect(recepcionObservada.estado).toBe(EstadoCicloTransporte.RETIRO_COMPLETADO);
    expect(recepcionObservada.actaRecepcion.tipo).toBe(TipoRecepcion.CON_OBSERVACIONES);
  });
});
