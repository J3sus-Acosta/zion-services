import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export interface FileMetadata {
  nombreOriginal: string;
  categoria: string;
  mimeType: string;
}

export interface FileStoragePort {
  guardarArchivo(buffer: Buffer, rutaRelativa: string): Promise<string>;
  obtenerLectura(rutaRelativa: string): fs.ReadStream;
  crearArchivoZip(archivos: { rutaFisica: string; nombreEnZip: string }[]): Promise<NodeJS.ReadableStream>;
}

export class LocalDiskStorageAdapter implements FileStoragePort {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async guardarArchivo(buffer: Buffer, rutaRelativa: string): Promise<string> {
    const destinoCompleto = path.join(this.baseDir, rutaRelativa);
    const dir = path.dirname(destinoCompleto);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(destinoCompleto, buffer);
    return destinoCompleto;
  }

  obtenerLectura(rutaRelativa: string): fs.ReadStream {
    const destinoCompleto = path.join(this.baseDir, rutaRelativa);
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
