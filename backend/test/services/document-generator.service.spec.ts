import { describe, it, expect, afterAll } from 'vitest';
import { DocumentGeneratorService } from '../../src/services/document-generator.service.js';
import fs from 'fs';
import path from 'path';

describe('DocumentGeneratorService', () => {
  const minimalPngBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const mockCliente = {
    razonSocial: 'Horse Chile S.A.',
    rut: '76.111.222-8',
    sucursalNombre: 'Faena Planta Maipú',
    direccion: 'Camino a Melipilla 9876',
    comuna: 'Maipú',
    ciudad: 'Santiago',
    contactoNombre: 'Carlos Martínez',
    contactoTelefono: '+56987654321',
    contactoEmail: 'carlos.martinez@horse.cl'
  };

  const mockOperacion = {
    camionPatente: 'RVFL-92',
    conductorNombre: 'Carlos Sánchez',
    conductorRut: '15.678.901-2',
    fechaHora: new Date('2026-11-23T10:00:00Z'),
    tipoResiduo: 'Residuos Industriales Líquidos (RILES)',
    volumenEstimado: 15,
    volumenReal: 14.5,
    unidad: 'M3'
  };

  let createdFirmaPath: string | null = null;

  afterAll(async () => {
    if (createdFirmaPath) {
      const fullPath = path.resolve(process.cwd(), createdFirmaPath);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath).catch(() => {});
      }
    }
  });

  describe('guardarFirmaTactil', () => {
    it('debe decodificar y almacenar físicamente la firma táctil en uploads/firmas/', async () => {
      const rutaRelativa = await DocumentGeneratorService.guardarFirmaTactil(minimalPngBase64, 'OS-TEST-001');
      createdFirmaPath = rutaRelativa;

      expect(rutaRelativa.startsWith('uploads/firmas/firma-OS-TEST-001-')).toBe(true);
      expect(rutaRelativa.endsWith('.png')).toBe(true);

      const fullPath = path.resolve(process.cwd(), rutaRelativa);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stats = await fs.promises.stat(fullPath);
      expect(stats.size).toBeGreaterThan(10);
    });

    it('debe rechazar firmas vacías o inválidas', async () => {
      await expect(DocumentGeneratorService.guardarFirmaTactil('', 'OS-TEST')).rejects.toThrow();
    });
  });

  describe('generarOrdenServicioPdf', () => {
    it('debe generar exitosamente el PDF de Orden de Servicio con código QR y hash', async () => {
      const resultado = await DocumentGeneratorService.generarOrdenServicioPdf({
        folio: 'OS-2026-0001',
        ordenId: 'ord-12345',
        fechaEmision: new Date('2026-11-23'),
        cliente: mockCliente,
        operacion: mockOperacion,
        servicios: [
          { descripcion: 'Succión y retiro de RILES industriales', cantidad: 1, unidad: 'Servicio' },
          { descripcion: 'Tratamiento y disposición final autorizada', cantidad: 1, unidad: 'Servicio' }
        ]
      });

      expect(Buffer.isBuffer(resultado.buffer)).toBe(true);
      expect(resultado.buffer.length).toBeGreaterThan(1000);
      // Validar cabecera mágica de PDF (%PDF-)
      expect(resultado.buffer.toString('utf-8', 0, 5)).toBe('%PDF-');

      expect(resultado.hash).toBeDefined();
      expect(resultado.hash).toHaveLength(64);
      expect(resultado.qrUrl).toContain(`/verificar-doc?hash=${resultado.hash}`);
    });
  });

  describe('generarGuiaDespachoPdf', () => {
    it('debe generar exitosamente el PDF de Guía de Despacho de Residuos', async () => {
      const resultado = await DocumentGeneratorService.generarGuiaDespachoPdf({
        folio: 'GD-2026-0001',
        numeroGuia: 'GD-891011',
        ordenId: 'ord-12345',
        fechaEmision: new Date('2026-11-23'),
        cliente: mockCliente,
        operacion: mockOperacion,
        destinoAutorizado: {
          nombre: 'Planta Tratamiento Norte SpA',
          rut: '78.111.222-3',
          direccion: 'Av. Los Libertadores 5000, Lampa',
          resolucion: 'Res. Ex. SEREMI N° 12.345'
        }
      });

      expect(Buffer.isBuffer(resultado.buffer)).toBe(true);
      expect(resultado.buffer.length).toBeGreaterThan(1000);
      expect(resultado.buffer.toString('utf-8', 0, 5)).toBe('%PDF-');
      expect(resultado.hash).toHaveLength(64);
      expect(resultado.qrUrl).toContain(resultado.hash);
    });
  });

  describe('generarOrdenTrabajoPdf', () => {
    it('debe generar exitosamente el PDF de Orden de Trabajo en Terreno', async () => {
      const resultado = await DocumentGeneratorService.generarOrdenTrabajoPdf({
        folio: 'OT-2026-0001',
        ordenId: 'ord-12345',
        fechaEmision: new Date('2026-11-23'),
        cliente: mockCliente,
        operacion: mockOperacion,
        actividades: [
          'Chequeo de válvulas y hermeticidad de mangueras',
          'Succión de residuos de estanque subterráneo',
          'Limpieza final de zona de trabajo'
        ]
      });

      expect(Buffer.isBuffer(resultado.buffer)).toBe(true);
      expect(resultado.buffer.length).toBeGreaterThan(1000);
      expect(resultado.buffer.toString('utf-8', 0, 5)).toBe('%PDF-');
      expect(resultado.hash).toHaveLength(64);
    });
  });

  describe('generarActaRecepcionPdf', () => {
    it('debe generar exitosamente el PDF de Acta de Recepción Conforme estampando la firma táctil', async () => {
      const firmaBuffer = Buffer.from(
        minimalPngBase64.replace(/^data:image\/png;base64,/, ''),
        'base64'
      );

      const resultado = await DocumentGeneratorService.generarActaRecepcionPdf({
        folio: 'ARC-2026-0001',
        ordenId: 'ord-12345',
        fechaEmision: new Date('2026-11-23'),
        cliente: mockCliente,
        operacion: mockOperacion,
        receptorNombre: 'Carlos Martínez',
        receptorRut: '12.345.678-5',
        receptorCargo: 'Jefe de Planta',
        conforme: true,
        observacionesRecepcion: 'Servicio completado a tiempo y sin incidentes.',
        firmaTactilBuffer: firmaBuffer
      });

      expect(Buffer.isBuffer(resultado.buffer)).toBe(true);
      expect(resultado.buffer.length).toBeGreaterThan(1000);
      expect(resultado.buffer.toString('utf-8', 0, 5)).toBe('%PDF-');
      expect(resultado.hash).toHaveLength(64);
      expect(resultado.qrUrl).toContain(resultado.hash);
    });
  });
});
