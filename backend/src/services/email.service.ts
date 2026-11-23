import { logger } from '../utils/logger.js';

export interface ConfirmacionAtencionEmailData {
  destinatarioEmail: string;
  clienteNombre: string;
  folioAtencion: string;
  fechaHoraInicio: Date;
  duracionMinutos: number;
  sucursalNombre: string;
  sucursalComuna: string;
  vehiculoPatente?: string;
}

export interface ReprogramacionAtencionEmailData {
  destinatarioEmail: string;
  clienteNombre: string;
  folioAtencion: string;
  fechaHoraAnterior: Date;
  nuevaFechaHora: Date;
  motivo: string;
  sucursalNombre: string;
}

export class EmailService {
  /**
   * Envía correo de confirmación de atención al cliente.
   * Manejo no bloqueante y resiliente: no arroja excepción si falla.
   */
  static async enviarConfirmacionAtencion(data: ConfirmacionAtencionEmailData): Promise<boolean> {
    try {
      logger.info('Despachando correo de confirmación de atención', {
        destinatario: data.destinatarioEmail,
        folio: data.folioAtencion,
        fechaHoraInicio: data.fechaHoraInicio.toISOString(),
        sucursal: data.sucursalNombre
      });

      // Simulación de envío con template corporativo SATEM
      // En producción aquí se integra transporte SMTP o servicio Transaccional (SendGrid, SES, Resend)
      return true;
    } catch (error) {
      logger.error('Error al enviar correo de confirmación de atención', {
        error: (error as Error).message,
        folio: data.folioAtencion
      });
      return false;
    }
  }

  /**
   * Envía correo de reprogramación de atención al cliente informando nueva fecha y motivo.
   */
  static async enviarReprogramacionAtencion(data: ReprogramacionAtencionEmailData): Promise<boolean> {
    try {
      logger.info('Despachando correo de reprogramación de atención', {
        destinatario: data.destinatarioEmail,
        folio: data.folioAtencion,
        fechaAnterior: data.fechaHoraAnterior.toISOString(),
        nuevaFecha: data.nuevaFechaHora.toISOString(),
        motivo: data.motivo
      });

      return true;
    } catch (error) {
      logger.error('Error al enviar correo de reprogramación de atención', {
        error: (error as Error).message,
        folio: data.folioAtencion
      });
      return false;
    }
  }
}
