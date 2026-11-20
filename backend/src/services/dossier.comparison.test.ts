import { describe, it, expect } from 'vitest';
import { DossierIndexService } from './dossier-index.service.js';
import { VehicleComparisonService } from './vehicle-comparison.service.js';
import { CategoriaDocumento, TipoFotoInspeccion } from '@prisma/client';

describe('Indexación Documental y Comparativa 360°', () => {
  it('debe indexar documentos en tiempo real con metadatos completos', () => {
    const doc = DossierIndexService.indexarDocumento({
      expedienteId: 'exp-1',
      categoria: CategoriaDocumento.SIDREP_SELLADO_ROMANA,
      nombreArchivo: 'sidrep_timbrado_2291278.jpg',
      mimeType: 'image/jpeg',
      pesoBytes: 1542000,
      rutaAlmacenamiento: '/uploads/exp-1/sidrep_timbrado.jpg',
      visibleParaCliente: true
    });

    expect(doc.categoria).toBe(CategoriaDocumento.SIDREP_SELLADO_ROMANA);
    expect(doc.visibleParaCliente).toBe(true);
    expect(doc.fechaCarga).toBeDefined();
  });

  it('debe generar la comparativa visual 360° entre fotos de salida y retorno', () => {
    const fotosSalida = [
      { tipo: TipoFotoInspeccion.FRONTAL, archivoUrl: '/uploads/salida_frontal.jpg' },
      { tipo: TipoFotoInspeccion.LATERAL_IZQUIERDA, archivoUrl: '/uploads/salida_lat_izq.jpg' },
      { tipo: TipoFotoInspeccion.TRASERA, archivoUrl: '/uploads/salida_trasera.jpg' },
      { tipo: TipoFotoInspeccion.LATERAL_DERECHA, archivoUrl: '/uploads/salida_lat_der.jpg' }
    ];

    const fotosRetorno = [
      { tipo: TipoFotoInspeccion.FRONTAL, archivoUrl: '/uploads/retorno_frontal.jpg' },
      { tipo: TipoFotoInspeccion.LATERAL_IZQUIERDA, archivoUrl: '/uploads/retorno_lat_izq.jpg' },
      { tipo: TipoFotoInspeccion.TRASERA, archivoUrl: '/uploads/retorno_trasera.jpg' },
      { tipo: TipoFotoInspeccion.LATERAL_DERECHA, archivoUrl: '/uploads/retorno_lat_der.jpg' }
    ];

    const comparativa = VehicleComparisonService.generarComparativa360(fotosSalida, fotosRetorno);

    expect(comparativa.completa).toBe(true);
    expect(comparativa.angulosComparados).toHaveLength(4);
    expect(comparativa.angulosComparados[0].ambasDisponibles).toBe(true);
  });

  it('debe simular la descarga oficial de SIDREP desde Ventanilla Única', async () => {
    const sidrep = await DossierIndexService.descargarSIDREPVentanillaUnica('2291278');

    expect(sidrep.folio).toBe('2291278');
    expect(sidrep.nombreArchivo).toContain('2291278');
    expect(sidrep.pdfBufferSimulado.length).toBeGreaterThan(0);
  });
});
