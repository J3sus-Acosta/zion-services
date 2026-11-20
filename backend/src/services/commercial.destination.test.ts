import { describe, it, expect } from 'vitest';
import { CommercialService } from './commercial.service.js';
import { DestinationService } from './destination.service.js';
import { EstadoLiquidacion, EstadoSolicitud } from '@prisma/client';

describe('Gestión Comercial, Estados de Pago y Certificación de Destino', () => {
  it('debe crear solicitud formal con folio generado', () => {
    const solicitud = CommercialService.crearSolicitud({
      empresaClienteId: 'cli-horse',
      sucursalFaenaId: 'faena-los-andes',
      tipoResiduo: 'AGUAS DE LAVADO CON ACEITES',
      cantidadEstimada: 12000,
      unidadEstimada: 'KG',
      fechaPreferente: new Date('2026-11-25')
    });

    expect(solicitud.folio).toContain('SOL-');
    expect(solicitud.estado).toBe(EstadoSolicitud.ENVIADA);
    expect(solicitud.tipoResiduo).toBe('AGUAS DE LAVADO CON ACEITES');
  });

  it('debe consolidar múltiples órdenes de servicio en un Estado de Pago (EDP) periódico', () => {
    const edp = CommercialService.consolidarEstadoDePago({
      empresaClienteId: 'cli-horse',
      periodoMes: 11,
      periodoAnio: 2026,
      periodoQuincena: 1,
      ordenesServicio: [
        { id: 'os-1', folio: 'OS-000561', montoNeto: 850000 },
        { id: 'os-2', folio: 'OS-000562', montoNeto: 650000 }
      ]
    });

    expect(edp.folio).toContain('EDP-2026-11-Q1');
    expect(edp.montoNeto).toBe(1500000);
    expect(edp.montoIva).toBe(285000);
    expect(edp.montoTotal).toBe(1785000);
    expect(edp.estado).toBe(EstadoLiquidacion.EMITIDO);
    expect(edp.totalOrdenesAgrupadas).toBe(2);
  });

  it('debe validar la Orden de Compra (OC) antes de habilitar para facturación', () => {
    const resultado = CommercialService.validarOCYhabilitarFacturacion('OC-998877', '/uploads/oc_horse.pdf');

    expect(resultado.habilitadoParaFacturar).toBe(true);
    expect(resultado.estado).toBe(EstadoLiquidacion.HABILITADO_FACTURAR);
    expect(resultado.numeroOC).toBe('OC-998877');
  });

  it('debe certificar descarga en destino con foto de SIDREP sellado y ticket de pesaje', () => {
    const certificacion = DestinationService.certificarDescargaEnDestino({
      ordenServicioFolio: 'OS-000561',
      plantaDestinoNombre: 'BRAVO ENERGY CHILE S.A.',
      sidrepFolio: '2291278',
      sidrepSelladoFotoUrl: '/uploads/sidrep_timbrado_bravo.jpg',
      ticketPesajeFotoUrl: '/uploads/ticket_romana_527658.jpg',
      pesoNetoCertificado: 11820
    });

    expect(certificacion.descargaCompleta).toBe(true);
    expect(certificacion.pesoNetoCertificado).toBe(11820);
    expect(certificacion.plantaDestinoNombre).toBe('BRAVO ENERGY CHILE S.A.');
  });

  it('debe rechazar certificación si falta la foto del SIDREP sellado por romana', () => {
    expect(() =>
      DestinationService.certificarDescargaEnDestino({
        ordenServicioFolio: 'OS-000561',
        plantaDestinoNombre: 'BRAVO ENERGY CHILE S.A.',
        sidrepFolio: '2291278',
        sidrepSelladoFotoUrl: '', // Falta foto
        ticketPesajeFotoUrl: '/uploads/ticket.jpg',
        pesoNetoCertificado: 11820
      })
    ).toThrowError(/Es obligatorio adjuntar la fotografía del documento SIDREP con el sello\/timbre/);
  });
});
