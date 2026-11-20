import { CategoriaDocumento } from '@prisma/client';

export interface RegistrarDocumentoExpedienteInput {
  expedienteId: string;
  categoria: CategoriaDocumento;
  nombreArchivo: string;
  mimeType: string;
  pesoBytes: number;
  rutaAlmacenamiento: string;
  cargadoPorUsuarioId?: string;
  visibleParaCliente?: boolean;
}

export class DossierIndexService {
  /**
   * Indexación en tiempo real de cada documento o fotografía capturada en terreno
   */
  static indexarDocumento(input: RegistrarDocumentoExpedienteInput) {
    if (!input.nombreArchivo || input.nombreArchivo.trim() === '') {
      throw new Error('El nombre de archivo es requerido.');
    }
    if (!input.rutaAlmacenamiento || input.rutaAlmacenamiento.trim() === '') {
      throw new Error('La ruta de almacenamiento es requerida.');
    }

    return {
      expedienteId: input.expedienteId,
      categoria: input.categoria,
      nombreArchivo: input.nombreArchivo,
      mimeType: input.mimeType,
      pesoBytes: input.pesoBytes,
      rutaAlmacenamiento: input.rutaAlmacenamiento,
      visibleParaCliente: input.visibleParaCliente ?? true,
      fechaCarga: new Date()
    };
  }

  /**
   * Conector/simulador de descarga de Declaración SIDREP oficial desde Ventanilla Única
   */
  static async descargarSIDREPVentanillaUnica(folioSIDREP: string): Promise<{
    folio: string;
    nombreArchivo: string;
    pdfBufferSimulado: Buffer;
    urlDescargada: string;
  }> {
    if (!folioSIDREP || folioSIDREP.trim() === '') {
      throw new Error('El número de folio SIDREP es obligatorio para consultar en Ventanilla Única.');
    }

    // Simulación de respuesta oficial PDF de Ventanilla Única (MMA / RETC)
    const buffer = Buffer.from(`%PDF-1.4 Declaracion SIDREP Folio ${folioSIDREP} - Zion Services`);
    return {
      folio: folioSIDREP,
      nombreArchivo: `SIDREP_${folioSIDREP}_Oficial_VU.pdf`,
      pdfBufferSimulado: buffer,
      urlDescargada: `/uploads/sidrep_${folioSIDREP}_vu.pdf`
    };
  }
}
