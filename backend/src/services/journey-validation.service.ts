import { ModalidadJornada, EstadoCicloTransporte } from '@prisma/client';

export interface ValidacionInvarianteParams {
  modalidad: ModalidadJornada;
  ultimoCicloTransporte?: {
    ordenServicioFolio: string;
    estado: EstadoCicloTransporte;
    descargaCertificadaEnDestino: boolean;
  } | null;
}

export class JourneyValidationService {
  /**
   * Valida la regla de invariante física antes de autorizar un retiro en cliente.
   * En LOCAL_SANTIAGO: Prohibido iniciar retiro B si retiro A no fue descargado y certificado en destino.
   * En VIAJE_INTERREGIONAL: Permite traslados y servicios consecutivos en la zona durante la campaña.
   */
  static validarInicioRetiro(params: ValidacionInvarianteParams): {
    autorizado: boolean;
    errorCodigo?: string;
    mensaje?: string;
  } {
    if (params.modalidad === ModalidadJornada.LOCAL_SANTIAGO) {
      if (params.ultimoCicloTransporte) {
        const { ordenServicioFolio, estado, descargaCertificadaEnDestino } = params.ultimoCicloTransporte;

        if (!descargaCertificadaEnDestino || estado !== EstadoCicloTransporte.DESCARGA_CERTIFICADA) {
          return {
            autorizado: false,
            errorCodigo: 'INVARIANTE_DESCARGA_PENDIENTE',
            mensaje: `Invariante Física Violada: El camión no puede realizar un nuevo retiro sin antes descargar y certificar en la planta de destino la atención previa (OS: ${ordenServicioFolio}).`
          };
        }
      }
    }

    // En VIAJE_INTERREGIONAL se autorizan servicios consecutivos en campaña
    return {
      autorizado: true
    };
  }
}
