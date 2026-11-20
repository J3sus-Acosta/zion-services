import { TipoFotoInspeccion } from '@prisma/client';

export interface FotoAngulo {
  tipo: TipoFotoInspeccion;
  archivoUrl: string;
}

export class VehicleComparisonService {
  /**
   * Genera la comparativa visual 360° lado a lado entre fotos de salida y retorno
   */
  static generarComparativa360(
    fotosSalida: FotoAngulo[],
    fotosRetorno: FotoAngulo[]
  ): {
    completa: boolean;
    angulosComparados: {
      angulo: TipoFotoInspeccion;
      fotoSalidaUrl?: string;
      fotoRetornoUrl?: string;
      ambasDisponibles: boolean;
    }[];
  } {
    const angulos = [
      TipoFotoInspeccion.FRONTAL,
      TipoFotoInspeccion.LATERAL_IZQUIERDA,
      TipoFotoInspeccion.TRASERA,
      TipoFotoInspeccion.LATERAL_DERECHA
    ];

    const mapaSalida = new Map(fotosSalida.map((f) => [f.tipo, f.archivoUrl]));
    const mapaRetorno = new Map(fotosRetorno.map((f) => [f.tipo, f.archivoUrl]));

    const resultado = angulos.map((angulo) => {
      const salida = mapaSalida.get(angulo);
      const retorno = mapaRetorno.get(angulo);
      return {
        angulo,
        fotoSalidaUrl: salida,
        fotoRetornoUrl: retorno,
        ambasDisponibles: Boolean(salida && retorno)
      };
    });

    const completa = resultado.every((r) => r.ambasDisponibles);

    return {
      completa,
      angulosComparados: resultado
    };
  }
}
