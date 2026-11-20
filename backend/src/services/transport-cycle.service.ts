import { EstadoCicloTransporte, TipoRecepcion } from '@prisma/client';

export interface MarcarLlegadaInput {
  cicloTransporteId: string;
  horaLlegada: Date;
  coordenadas?: { lat: number; lng: number };
}

export interface FirmarOrdenTrabajoInput {
  cicloTransporteId: string;
  nombreCliente: string;
  rutCliente: string;
  firmaSvg: string;
  fechaHora: Date;
}

export interface CargarFotoFaenaEPPInput {
  cicloTransporteId: string;
  archivoUrl: string;
  descripcion: string; // Ej: "Succión estanque 1", "Cuadrilla con EPP completo"
}

export interface FinalizarRecepcionInput {
  cicloTransporteId: string;
  tipoRecepcion: TipoRecepcion;
  nombreFirmante?: string;
  rutFirmante?: string;
  firmaSvg?: string;
  observaciones?: string;
  fotoRespaldoUrl?: string;
}

export class TransportCycleService {
  /**
   * 1. Marcar Llegada a la faena del cliente
   */
  static registrarLlegada(input: MarcarLlegadaInput) {
    return {
      estado: EstadoCicloTransporte.EN_FAENA,
      horaLlegada: input.horaLlegada,
      mensaje: 'Llegada registrada exitosamente. Pendiente firma de Orden de Trabajo por el cliente.'
    };
  }

  /**
   * 2. Firma de Orden de Trabajo por el cliente autorizando el inicio de faena.
   * Inmediatamente después se desbloquea la carga de fotos de faena y EPP.
   */
  static autorizarInicioFaena(input: FirmarOrdenTrabajoInput) {
    if (!input.firmaSvg || input.firmaSvg.trim() === '') {
      throw new Error('La firma digital del cliente es requerida para autorizar el inicio de faena.');
    }

    return {
      estado: EstadoCicloTransporte.FAENA_AUTORIZADA,
      autorizacionFaena: {
        nombreCliente: input.nombreCliente,
        rutCliente: input.rutCliente,
        fechaHoraFirma: input.fechaHora
      },
      fotosFaenaPermitidas: true,
      mensaje: 'Faena autorizada. Módulo de fotos de trabajo y EPP habilitado.'
    };
  }

  /**
   * 3. Validar y registrar fotos de trabajo y EPP
   */
  static registrarFotoFaena(estadoCiclo: EstadoCicloTransporte, input: CargarFotoFaenaEPPInput) {
    if (estadoCiclo !== EstadoCicloTransporte.FAENA_AUTORIZADA && estadoCiclo !== EstadoCicloTransporte.EN_FAENA) {
      throw new Error('No se pueden registrar fotos de faena sin haber firmado previamente la Orden de Trabajo.');
    }

    return {
      archivoUrl: input.archivoUrl,
      descripcion: input.descripcion,
      registrado: true
    };
  }

  /**
   * 4. Acta de Recepción Conforme, Observaciones o Sin Firma
   */
  static finalizarRecepcion(input: FinalizarRecepcionInput) {
    if (input.tipoRecepcion === TipoRecepcion.CONFORME && (!input.firmaSvg || input.firmaSvg.trim() === '')) {
      throw new Error('Para recepción conforme se requiere la firma digital del cliente.');
    }

    if (input.tipoRecepcion !== TipoRecepcion.CONFORME && (!input.observaciones || input.observaciones.trim() === '')) {
      throw new Error('Para recepción con observaciones o rechazo de firma se debe ingresar una justificación detallada.');
    }

    return {
      estado: EstadoCicloTransporte.RETIRO_COMPLETADO,
      actaRecepcion: {
        tipo: input.tipoRecepcion,
        nombreFirmante: input.nombreFirmante,
        rutFirmante: input.rutFirmante,
        observaciones: input.observaciones,
        fechaHoraFirma: new Date()
      },
      mensaje: 'Retiro en faena completado exitosamente.'
    };
  }
}
