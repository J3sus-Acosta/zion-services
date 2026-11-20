import { describe, it, expect } from 'vitest';
import { TransportCycleService } from './transport-cycle.service.js';
import { EstadoCicloTransporte, TipoRecepcion } from '@prisma/client';

describe('Ciclo de Transporte en Terreno (Tablet Android)', () => {
  it('debe registrar hora de llegada y cambiar a EN_FAENA', () => {
    const llegada = TransportCycleService.registrarLlegada({
      cicloTransporteId: 'ciclo-1',
      horaLlegada: new Date('2026-11-20T10:15:00Z')
    });

    expect(llegada.estado).toBe(EstadoCicloTransporte.EN_FAENA);
    expect(llegada.horaLlegada).toBeDefined();
  });

  it('debe requerir firma de Orden de Trabajo para autorizar inicio y desbloquear fotos de faena y EPP', () => {
    const autorizacion = TransportCycleService.autorizarInicioFaena({
      cicloTransporteId: 'ciclo-1',
      nombreCliente: 'Cristóbal Guzmán',
      rutCliente: '19.783.569-9',
      firmaSvg: '<svg>firma_digital_ot</svg>',
      fechaHora: new Date('2026-11-20T10:20:00Z')
    });

    expect(autorizacion.estado).toBe(EstadoCicloTransporte.FAENA_AUTORIZADA);
    expect(autorizacion.fotosFaenaPermitidas).toBe(true);
  });

  it('debe rechazar fotos de faena si no se ha firmado la Orden de Trabajo', () => {
    expect(() =>
      TransportCycleService.registrarFotoFaena(EstadoCicloTransporte.PENDIENTE, {
        cicloTransporteId: 'ciclo-1',
        archivoUrl: '/uploads/faena1.jpg',
        descripcion: 'Succión estanque 1'
      })
    ).toThrowError(/sin haber firmado previamente la Orden de Trabajo/);
  });

  it('debe permitir recepción con observaciones obligatorias sin firma inventada', () => {
    const recepcionObservada = TransportCycleService.finalizarRecepcion({
      cicloTransporteId: 'ciclo-1',
      tipoRecepcion: TipoRecepcion.CON_OBSERVACIONES,
      observaciones: 'Encargado ausente por reunión, personal de seguridad autoriza salida',
      fotoRespaldoUrl: '/uploads/bitacora_seguridad.jpg'
    });

    expect(recepcionObservada.estado).toBe(EstadoCicloTransporte.RETIRO_COMPLETADO);
    expect(recepcionObservada.actaRecepcion.tipo).toBe(TipoRecepcion.CON_OBSERVACIONES);
  });
});
