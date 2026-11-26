import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../../src/app.js';
import { LocalDiskStorageAdapter } from '../../src/services/file-storage.service.js';

describe('LocalDiskStorageAdapter (FileStoragePort)', () => {
  let tempStorageDir: string;
  let storageAdapter: LocalDiskStorageAdapter;

  // Data URLs de prueba
  // 1x1 PNG transparente en base64
  const VALID_PNG_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  // 1x1 JPEG en base64
  const VALID_JPEG_DATA_URL =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  // 1x1 WebP en base64
  const VALID_WEBP_DATA_URL =
    'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  // SVG en base64
  const VALID_SVG_DATA_URL =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PC9zdmc+';
  // PDF dummy en base64 (%PDF-1.4...)
  const VALID_PDF_DATA_URL =
    'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbXQovQ291bnQgMD4+ZW5kb2JqCnhyZWYKMCAzCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDUzIDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSAzL1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKOTkKJSVFT0Y=';

  beforeAll(() => {
    tempStorageDir = path.join(os.tmpdir(), `zion-storage-test-${Date.now()}`);
    storageAdapter = new LocalDiskStorageAdapter(tempStorageDir);
  });

  afterAll(() => {
    if (fs.existsSync(tempStorageDir)) {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
    }
  });

  describe('1. Inicialización y Estructura de Directorios', () => {
    it('crea el directorio base y subcarpetas requeridas al instanciar', () => {
      expect(fs.existsSync(tempStorageDir)).toBe(true);
      expect(fs.existsSync(path.join(tempStorageDir, 'inspecciones'))).toBe(true);
      expect(fs.existsSync(path.join(tempStorageDir, 'inspecciones', 'salida'))).toBe(true);
      expect(fs.existsSync(path.join(tempStorageDir, 'inspecciones', 'retorno'))).toBe(true);
      expect(fs.existsSync(path.join(tempStorageDir, 'ciclo-transporte', 'firmas'))).toBe(true);
      expect(fs.existsSync(path.join(tempStorageDir, 'ciclo-transporte', 'fotos'))).toBe(true);
      expect(fs.existsSync(path.join(tempStorageDir, 'ciclo-transporte', 'actas'))).toBe(true);
      expect(fs.existsSync(path.join(tempStorageDir, 'bitacora'))).toBe(true);
      expect(fs.existsSync(path.join(tempStorageDir, 'documentos'))).toBe(true);
    });
  });

  describe('2. Decodificación y Escritura de Imágenes Base64', () => {
    it('decodifica y guarda correctamente una imagen PNG', async () => {
      const resultado = await storageAdapter.guardarBase64(
        VALID_PNG_DATA_URL,
        'ciclo-transporte/firmas',
        'firma_test'
      );

      expect(resultado).toBeDefined();
      expect(resultado.mimeType).toBe('image/png');
      expect(resultado.pesoBytes).toBeGreaterThan(0);
      expect(resultado.rutaFisica).toBe(resultado.rutaAbsoluta);
      expect(resultado.urlRelativa).toBe(resultado.rutaRelativa);
      expect(resultado.rutaFisica.endsWith('.png')).toBe(true);
      expect(fs.existsSync(resultado.rutaFisica)).toBe(true);

      const contenido = fs.readFileSync(resultado.rutaFisica);
      expect(contenido.length).toBe(resultado.pesoBytes);
    });

    it('decodifica y guarda correctamente una imagen JPEG', async () => {
      const resultado = await storageAdapter.guardarBase64(
        VALID_JPEG_DATA_URL,
        'inspecciones/salida',
        'foto_salida'
      );

      expect(resultado.mimeType).toBe('image/jpeg');
      expect(resultado.rutaFisica.endsWith('.jpg')).toBe(true);
      expect(fs.existsSync(resultado.rutaFisica)).toBe(true);
      expect(resultado.pesoBytes).toBeGreaterThan(0);
    });

    it('soporta otros formatos válidos como WebP, SVG y PDF', async () => {
      const resWebp = await storageAdapter.guardarBase64(VALID_WEBP_DATA_URL, 'bitacora', 'foto_webp');
      expect(resWebp.rutaFisica.endsWith('.webp')).toBe(true);
      expect(fs.existsSync(resWebp.rutaFisica)).toBe(true);

      const resSvg = await storageAdapter.guardarBase64(VALID_SVG_DATA_URL, 'ciclo-transporte/firmas', 'firma_svg');
      expect(resSvg.rutaFisica.endsWith('.svg')).toBe(true);
      expect(fs.existsSync(resSvg.rutaFisica)).toBe(true);

      const resPdf = await storageAdapter.guardarBase64(VALID_PDF_DATA_URL, 'documentos', 'doc_adjunto');
      expect(resPdf.rutaFisica.endsWith('.pdf')).toBe(true);
      expect(fs.existsSync(resPdf.rutaFisica)).toBe(true);
    });

    it('crea recursivamente subdirectorios no pre-existentes', async () => {
      const subDirNuevo = 'sub1/sub2/sub3';
      const resultado = await storageAdapter.guardarBase64(VALID_PNG_DATA_URL, subDirNuevo, 'anidado');

      expect(fs.existsSync(resultado.rutaFisica)).toBe(true);
      expect(fs.existsSync(path.join(tempStorageDir, 'sub1', 'sub2', 'sub3'))).toBe(true);
    });
  });

  describe('3. Cálculo y Longitud de URLs Relativas (< 80 caracteres)', () => {
    it('genera URLs relativas cortas comenzando con /uploads/ de longitud menor a 80 chars', async () => {
      const resultado = await storageAdapter.guardarBase64(
        VALID_PNG_DATA_URL,
        'ciclo-transporte/firmas',
        'firma'
      );

      expect(resultado.urlRelativa.startsWith('/uploads/ciclo-transporte/firmas/')).toBe(true);
      expect(resultado.urlRelativa.length).toBeLessThan(80);
      expect(resultado.urlRelativa).toBe(resultado.rutaRelativa);
    });

    it('genera URLs válidas cuando se almacena en la raíz sin subdirectorio', async () => {
      const resultado = await storageAdapter.guardarBase64(VALID_PNG_DATA_URL, '', 'root_test');

      expect(resultado.urlRelativa.startsWith('/uploads/root_test_')).toBe(true);
      expect(resultado.urlRelativa.length).toBeLessThan(80);
      expect(resultado.urlRelativa).not.toContain('//');
    });
  });

  describe('4. Sanitización y Detección de Path Traversal', () => {
    it('bloquea intentos de Path Traversal con ../ en subDirectorio', async () => {
      await expect(
        storageAdapter.guardarBase64(VALID_PNG_DATA_URL, '../../etc', 'hack')
      ).rejects.toThrow(/Path Traversal/i);

      await expect(
        storageAdapter.guardarBase64(VALID_PNG_DATA_URL, 'inspecciones/../../escapar', 'hack')
      ).rejects.toThrow(/Path Traversal/i);
    });

    it('bloquea intentos de Path Traversal con rutas absolutas ajenas', async () => {
      const rutaAjena = path.resolve(os.tmpdir(), 'carpeta-ajena');
      await expect(
        storageAdapter.guardarBase64(VALID_PNG_DATA_URL, rutaAjena, 'hack')
      ).rejects.toThrow(/Path Traversal/i);
    });

    it('sanitiza caracteres maliciosos o separadores en prefijo', async () => {
      const resultado = await storageAdapter.guardarBase64(
        VALID_PNG_DATA_URL,
        'inspecciones',
        '../../malicious/prefijo!@#$'
      );

      expect(resultado.rutaFisica).toBeDefined();
      expect(fs.existsSync(resultado.rutaFisica)).toBe(true);
      // El nombre del archivo no debe tener '../' ni separadores
      const nombreArchivo = path.basename(resultado.rutaFisica);
      expect(nombreArchivo).not.toContain('/');
      expect(nombreArchivo).not.toContain('\\');
      expect(nombreArchivo).not.toContain('..');
    });

    it('bloquea Path Traversal en guardarArchivo tradicional', async () => {
      const dummyBuffer = Buffer.from('test');
      await expect(
        storageAdapter.guardarArchivo(dummyBuffer, '../../outside.txt')
      ).rejects.toThrow(/Path Traversal/i);
    });

    it('bloquea Path Traversal en obtenerLectura tradicional', () => {
      expect(() => {
        storageAdapter.obtenerLectura('../../shadow_file.txt');
      }).toThrow(/Path Traversal/i);
    });
  });

  describe('5. Validación y Rechazo de Payloads Inválidos o Corruptos', () => {
    it('rechaza dataUrl vacío o nulo', async () => {
      await expect(storageAdapter.guardarBase64('', 'inspecciones')).rejects.toThrow(
        /Payload dataUrl inválido o vacío/i
      );

      // @ts-expect-error probando valor inválido
      await expect(storageAdapter.guardarBase64(null, 'inspecciones')).rejects.toThrow(
        /Payload dataUrl inválido o vacío/i
      );
    });

    it('rechaza cadenas que no son Data URLs válidas', async () => {
      await expect(
        storageAdapter.guardarBase64('http://example.com/imagen.jpg', 'inspecciones')
      ).rejects.toThrow(/Formato Data URL inválido o corrupto/i);

      await expect(
        storageAdapter.guardarBase64('plain text string', 'inspecciones')
      ).rejects.toThrow(/Formato Data URL inválido o corrupto/i);
    });

    it('rechaza Data URLs con tipo MIME no soportado', async () => {
      const exeDataUrl = 'data:application/x-msdownload;base64,TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAA=';
      await expect(storageAdapter.guardarBase64(exeDataUrl, 'inspecciones')).rejects.toThrow(
        /Tipo MIME no permitido o no soportado/i
      );
    });

    it('rechaza Data URLs con payload base64 vacío', async () => {
      const emptyBase64 = 'data:image/png;base64,';
      await expect(storageAdapter.guardarBase64(emptyBase64, 'inspecciones')).rejects.toThrow(
        /Formato Data URL inválido o corrupto/i
      );
    });
  });

  describe('6. Servicio Estático HTTP (/uploads)', () => {
    let server: http.Server;
    let baseUrl: string;
    const uploadsDir = process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads');
    let testHttpFileName: string;

    beforeAll(async () => {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      testHttpFileName = `test_static_${Date.now()}.png`;
      const pngBuffer = Buffer.from(VALID_PNG_DATA_URL.split(',')[1], 'base64');
      fs.writeFileSync(path.join(uploadsDir, testHttpFileName), pngBuffer);

      await new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const port = (server.address() as AddressInfo).port;
          baseUrl = `http://127.0.0.1:${port}`;
          resolve();
        });
      });
    });

    afterAll(async () => {
      const filePath = path.join(uploadsDir, testHttpFileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (server) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('sirve archivos estáticos correctamente con cabecera X-Content-Type-Options: nosniff', async () => {
      const res = await fetch(`${baseUrl}/uploads/${testHttpFileName}`);
      expect(res.status).toBe(200);
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      const blob = await res.arrayBuffer();
      expect(blob.byteLength).toBeGreaterThan(0);
    });

    it('retorna 404 si el archivo solicitado no existe', async () => {
      const res = await fetch(`${baseUrl}/uploads/no_existe_${Date.now()}.png`);
      expect(res.status).toBe(404);
    });

    it('bloquea intentos de Path Traversal a través del endpoint HTTP /uploads', async () => {
      const res = await fetch(`${baseUrl}/uploads/../../package.json`);
      expect([400, 403, 404]).toContain(res.status);
    });
  });
});
