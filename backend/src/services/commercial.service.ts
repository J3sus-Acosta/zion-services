import { EstadoLiquidacion, EstadoSolicitud, EstadoOrdenServicio } from '@prisma/client';

export interface CrearSolicitudInput {
  empresaClienteId: string;
  sucursalFaenaId: string;
  tipoResiduo: string;
  descripcion?: string;
  cantidadEstimada?: number;
  unidadEstimada?: string;
  fechaPreferente: Date;
}

export interface AprobarSolicitudInput {
  solicitudId: string;
  folioOrdenServicio: string;
}

export interface ConsolidarEDPInput {
  empresaClienteId: string;
  periodoMes: number;
  periodoAnio: number;
  periodoQuincena?: number;
  ordenesServicio: {
    id: string;
    folio: string;
    montoNeto: number;
  }[];
}

export class CommercialService {
  /**
   * Crear solicitud de servicio estructurada
   */
  static crearSolicitud(input: CrearSolicitudInput) {
    if (!input.tipoResiduo || input.tipoResiduo.trim() === '') {
      throw new Error('El tipo de residuo es requerido.');
    }

    const folio = `SOL-${Date.now().toString().slice(-6)}`;

    return {
      folio,
      empresaClienteId: input.empresaClienteId,
      sucursalFaenaId: input.sucursalFaenaId,
      tipoResiduo: input.tipoResiduo,
      descripcion: input.descripcion,
      cantidadEstimada: input.cantidadEstimada,
      unidadEstimada: input.unidadEstimada || 'KG',
      estado: EstadoSolicitud.ENVIADA
    };
  }

  /**
   * Aprobar solicitud comercialmente y emitir Orden de Servicio
   */
  static aprobarYEmitirOS(input: AprobarSolicitudInput) {
    return {
      solicitudEstado: EstadoSolicitud.APROBADA,
      ordenServicio: {
        folio: input.folioOrdenServicio,
        estado: EstadoOrdenServicio.EMITIDA
      }
    };
  }

  /**
   * Consolidación de múltiples órdenes de servicio en un Estado de Pago (EDP)
   */
  static consolidarEstadoDePago(input: ConsolidarEDPInput) {
    if (!input.ordenesServicio || input.ordenesServicio.length === 0) {
      throw new Error('Debe incluir al menos una orden de servicio para generar el Estado de Pago.');
    }

    const subtotal = input.ordenesServicio.reduce((sum, os) => sum + os.montoNeto, 0);
    const iva = Math.round(subtotal * 0.19);
    const total = subtotal + iva;
    const folioEDP = `EDP-${input.periodoAnio}-${input.periodoMes.toString().padStart(2, '0')}-${input.periodoQuincena ? `Q${input.periodoQuincena}` : 'M'}-${Date.now().toString().slice(-4)}`;

    return {
      folio: folioEDP,
      empresaClienteId: input.empresaClienteId,
      periodoMes: input.periodoMes,
      periodoAnio: input.periodoAnio,
      periodoQuincena: input.periodoQuincena,
      montoNeto: subtotal,
      montoIva: iva,
      montoTotal: total,
      estado: EstadoLiquidacion.EMITIDO,
      totalOrdenesAgrupadas: input.ordenesServicio.length
    };
  }

  /**
   * Validación de Orden de Compra (OC) antes de habilitar facturación
   */
  static validarOCYhabilitarFacturacion(numeroOC: string, archivoOCUrl: string) {
    if (!numeroOC || numeroOC.trim() === '') {
      throw new Error('El número de Orden de Compra es obligatorio para clientes que la requieren.');
    }
    if (!archivoOCUrl || archivoOCUrl.trim() === '') {
      throw new Error('El archivo PDF de la Orden de Compra es obligatorio.');
    }

    return {
      estado: EstadoLiquidacion.HABILITADO_FACTURAR,
      numeroOC,
      archivoOCUrl,
      habilitadoParaFacturar: true
    };
  }
}
