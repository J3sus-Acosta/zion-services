import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';

export interface FileMetadata {
  nombreOriginal: string;
  categoria: string;
  mimeType: string;
}

export interface SavedFileInfo {
  rutaFisica: string;
  rutaAbsoluta: string;
  urlRelativa: string;
  rutaRelativa: string;
  pesoBytes: number;
  mimeType: string;
}

export interface FileStoragePort {
  guardarArchivo(buffer: Buffer, rutaRelativa: string): Promise<string>;
  guardarBase64(dataUrl: string, subDirectorio?: string, prefijo?: string): Promise<SavedFileInfo>;
  obtenerLectura(rutaRelativa: string): fs.ReadStream;
  crearArchivoZip(archivos: { rutaFisica: string; nombreEnZip: string }[]): Promise<NodeJS.ReadableStream>;
}

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf'
};

export class LocalDiskStorageAdapter implements FileStoragePort {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = path.resolve(baseDir || process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads'));
    this.inicializarDirectoriosBase();
  }

  private inicializarDirectoriosBase(): void {
    const directorios = [
      '',
      'inspecciones',
      'inspecciones/salida',
      'inspecciones/retorno',
      'ciclo-transporte/firmas',
      'ciclo-transporte/fotos',
      'ciclo-transporte/actas',
      'bitacora',
      'documentos'
    ];
    for (const dir of directorios) {
      const ruta = path.join(this.baseDir, dir);
      if (!fs.existsSync(ruta)) {
        fs.mkdirSync(ruta, { recursive: true });
      }
    }
  }

  getBaseDir(): string {
    return this.baseDir;
  }

  async guardarArchivo(buffer: Buffer, rutaRelativa: string): Promise<string> {
    if (rutaRelativa && rutaRelativa.includes('..')) {
      throw new Error(`Acceso denegado: intento de Path Traversal detectado en '${rutaRelativa}'`);
    }

    const destinoCompleto = path.resolve(this.baseDir, rutaRelativa);
    const rel = path.relative(this.baseDir, destinoCompleto);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`Acceso denegado: intento de Path Traversal detectado en '${rutaRelativa}'`);
    }

    const dir = path.dirname(destinoCompleto);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(destinoCompleto, buffer);
    return destinoCompleto;
  }

  async guardarBase64(
    dataUrl: string,
    subDirectorio: string = '',
    prefijo: string = 'archivo'
  ): Promise<SavedFileInfo> {
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error('Payload dataUrl inválido o vacío');
    }

    // Extracción de MIME y base64
    const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Formato Data URL inválido o corrupto');
    }

    const mimeType = matches[1].toLowerCase();
    const rawBase64 = matches[2].trim();

    if (!rawBase64) {
      throw new Error('Payload base64 vacío');
    }

    const extension = MIME_EXTENSION_MAP[mimeType];
    if (!extension) {
      throw new Error(`Tipo MIME no permitido o no soportado: ${mimeType}`);
    }

    // Bloqueo explícito de secuencias de escape y validación con path.relative
    if (subDirectorio && subDirectorio.includes('..')) {
      throw new Error(`Acceso denegado: intento de Path Traversal detectado en subdirectorio '${subDirectorio}'`);
    }

    const resolvedTargetDir = path.resolve(this.baseDir, subDirectorio);
    const relDir = path.relative(this.baseDir, resolvedTargetDir);

    if (relDir.startsWith('..') || path.isAbsolute(relDir)) {
      throw new Error(`Acceso denegado: intento de Path Traversal detectado en subdirectorio '${subDirectorio}'`);
    }

    // Sanitización del prefijo (máx 12 caracteres para garantizar URL < 80 chars con alta entropía)
    const prefijoSanitizado = (prefijo || 'archivo')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 12);

    const timestamp = Date.now();
    const randomUuid = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const nombreArchivo = `${prefijoSanitizado}_${timestamp}_${randomUuid}.${extension}`;

    const destinoCompleto = path.join(resolvedTargetDir, nombreArchivo);
    const relFile = path.relative(this.baseDir, destinoCompleto);
    if (relFile.startsWith('..') || path.isAbsolute(relFile)) {
      throw new Error('Acceso denegado: intento de Path Traversal en el archivo de destino');
    }

    // Decodificación binaria
    const buffer = Buffer.from(rawBase64, 'base64');
    if (buffer.length === 0) {
      throw new Error('Payload base64 corrupto o sin contenido decodificable');
    }

    // Creación recursiva del directorio destino
    if (!fs.existsSync(resolvedTargetDir)) {
      await fs.promises.mkdir(resolvedTargetDir, { recursive: true });
    }

    // Escritura asíncrona en disco
    await fs.promises.writeFile(destinoCompleto, buffer);

    // Construcción de URL relativa para Express (/uploads/...)
    const normalizedRelDir = relDir ? relDir.split(path.sep).join('/') : '';
    const urlRelativa = normalizedRelDir
      ? `/uploads/${normalizedRelDir}/${nombreArchivo}`
      : `/uploads/${nombreArchivo}`;

    if (urlRelativa.length > 80) {
      throw new Error(`La URL relativa generada ('${urlRelativa}') excede el límite máximo de 80 caracteres (${urlRelativa.length} caracteres)`);
    }

    return {
      rutaFisica: destinoCompleto,
      rutaAbsoluta: destinoCompleto,
      urlRelativa,
      rutaRelativa: urlRelativa,
      pesoBytes: buffer.length,
      mimeType
    };
  }

  obtenerLectura(rutaRelativa: string): fs.ReadStream {
    if (rutaRelativa && rutaRelativa.includes('..')) {
      throw new Error(`Acceso denegado: intento de Path Traversal detectado en '${rutaRelativa}'`);
    }

    const destinoCompleto = path.resolve(this.baseDir, rutaRelativa);
    const rel = path.relative(this.baseDir, destinoCompleto);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`Acceso denegado: intento de Path Traversal detectado en '${rutaRelativa}'`);
    }
    return fs.createReadStream(destinoCompleto);
  }

  async crearArchivoZip(archivos: { rutaFisica: string; nombreEnZip: string }[]): Promise<NodeJS.ReadableStream> {
    const archive = archiver('zip', { zlib: { level: 9 } });

    for (const item of archivos) {
      if (fs.existsSync(item.rutaFisica)) {
        archive.file(item.rutaFisica, { name: item.nombreEnZip });
      }
    }

    // Finalizar archivo de manera asíncrona
    setImmediate(() => {
      archive.finalize();
    });

    return archive;
  }
}

export const fileStorageService = new LocalDiskStorageAdapter();
