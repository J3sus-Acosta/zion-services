import { describe, it, expect } from 'vitest';
import { QrVerificationService } from '../../src/services/qr-verification.service.js';
import crypto from 'crypto';

describe('QrVerificationService', () => {
  it('calcularHashDocumento: debe calcular el hash SHA-256 exacto de un buffer', () => {
    const testContent = Buffer.from('Documento Oficial Zion Services');
    const expectedHash = crypto.createHash('sha256').update(testContent).digest('hex');

    const calculatedHash = QrVerificationService.calcularHashDocumento(testContent);
    expect(calculatedHash).toBe(expectedHash);
    expect(calculatedHash).toHaveLength(64);
  });

  it('calcularHashPayload: debe calcular hash determinista para objetos y strings', () => {
    const payload = { folio: 'OS-2026-0001', cliente: 'Horse Chile' };
    const hash1 = QrVerificationService.calcularHashPayload(payload);
    const hash2 = QrVerificationService.calcularHashPayload(payload);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('generarQrUrl: debe formatear correctamente la URL pública de verificación', () => {
    const hash = 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0';
    
    // Con baseUrl personalizada
    const urlPersonalizada = QrVerificationService.generarQrUrl(hash, 'https://app.zionservices.cl/');
    expect(urlPersonalizada).toBe(`https://app.zionservices.cl/verificar-doc?hash=${hash}`);

    // Sin trailing slash
    const urlSinSlash = QrVerificationService.generarQrUrl(hash, 'https://app.zionservices.cl');
    expect(urlSinSlash).toBe(`https://app.zionservices.cl/verificar-doc?hash=${hash}`);
  });

  it('generarQrBuffer: debe generar un Buffer de imagen PNG válido con encabezado PNG', async () => {
    const qrBuffer = await QrVerificationService.generarQrBuffer('https://app.zionservices.cl/verificar-doc?hash=test');
    expect(Buffer.isBuffer(qrBuffer)).toBe(true);
    expect(qrBuffer.length).toBeGreaterThan(100);

    // Los primeros 4 bytes de un archivo PNG corresponden al número mágico: 0x89 0x50 0x4E 0x47
    expect(qrBuffer[0]).toBe(0x89);
    expect(qrBuffer[1]).toBe(0x50);
    expect(qrBuffer[2]).toBe(0x4e);
    expect(qrBuffer[3]).toBe(0x47);
  });

  it('generarQrDataUrl: debe retornar una cadena en formato data URL base64', async () => {
    const dataUrl = await QrVerificationService.generarQrDataUrl('https://app.zionservices.cl/verificar-doc?hash=test');
    expect(typeof dataUrl).toBe('string');
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });
});
