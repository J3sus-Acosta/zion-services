import crypto from 'crypto';
import QRCode from 'qrcode';

export class QrVerificationService {
  /**
   * Calcula el hash SHA-256 en formato hexadecimal a partir del buffer de un documento.
   */
  static calcularHashDocumento(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Calcula el hash SHA-256 de una carga de datos u objeto serializable.
   */
  static calcularHashPayload(payload: unknown): string {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Genera la URL pública de verificación documental para ser incrustada en el código QR.
   */
  static generarQrUrl(hash: string, baseUrl?: string): string {
    const base = baseUrl || process.env.PUBLIC_APP_URL || 'http://localhost:5173';
    const cleanBase = base.replace(/\/+$/, '');
    return `${cleanBase}/verificar-doc?hash=${hash}`;
  }

  /**
   * Genera un Buffer PNG con el código QR del texto o URL especificado.
   */
  static async generarQrBuffer(textoOUrl: string): Promise<Buffer> {
    return await QRCode.toBuffer(textoOUrl, {
      type: 'png',
      width: 250,
      margin: 1,
      color: {
        dark: '#0B192C',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
  }

  /**
   * Genera un Data URL en formato base64 ("data:image/png;base64,...") con el código QR.
   */
  static async generarQrDataUrl(textoOUrl: string): Promise<string> {
    return await QRCode.toDataURL(textoOUrl, {
      width: 250,
      margin: 1,
      color: {
        dark: '#0B192C',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
  }
}
