export interface CertificarDescargaInput {
  ordenServicioFolio: string;
  plantaDestinoNombre: string;
  sidrepFolio: string;
  sidrepSelladoFotoUrl: string;
  ticketPesajeFotoUrl: string;
  pesoNetoCertificado: number;
}

export class DestinationService {
  /**
   * Valida la certificación de la romana de destino (timbre húmedo en SIDREP + ticket de pesaje)
   */
  static certificarDescargaEnDestino(input: CertificarDescargaInput) {
    if (!input.sidrepSelladoFotoUrl || input.sidrepSelladoFotoUrl.trim() === '') {
      throw new Error('Es obligatorio adjuntar la fotografía del documento SIDREP con el sello/timbre de romana de la planta de destino.');
    }

    if (!input.ticketPesajeFotoUrl || input.ticketPesajeFotoUrl.trim() === '') {
      throw new Error('Es obligatorio adjuntar la fotografía del ticket oficial de pesaje emitido por la planta de destino.');
    }

    if (!input.pesoNetoCertificado || input.pesoNetoCertificado <= 0) {
      throw new Error('El peso neto certificado por la planta de destino debe ser mayor a cero.');
    }

    return {
      ordenServicioFolio: input.ordenServicioFolio,
      plantaDestinoNombre: input.plantaDestinoNombre,
      sidrepFolio: input.sidrepFolio,
      pesoNetoCertificado: input.pesoNetoCertificado,
      descargaCompleta: true,
      fechaHoraCertificacion: new Date(),
      mensaje: 'Descarga en planta de destino certificada exitosamente.'
    };
  }
}
