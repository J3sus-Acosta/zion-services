import { prisma } from '../utils/prisma.js';

export interface ServicioCatalogoDTO {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  duracionEstimadaMinutos: number;
}

export interface PlantaDestinoDTO {
  id: string;
  nombre: string;
  direccion: string;
  comuna: string;
  region: string;
  autorizadaRiles: boolean;
  resolucionSanitaria: string | null;
}

export class CatalogoService {
  /**
   * Obtiene todos los servicios de catálogo activos disponibles para contratación.
   */
  static async listarServiciosActivos(): Promise<ServicioCatalogoDTO[]> {
    return prisma.servicioCatalogo.findMany({
      where: { activo: true },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        duracionEstimadaMinutos: true
      },
      orderBy: { nombre: 'asc' }
    });
  }

  /**
   * Obtiene todas las plantas de disposición y descarga final activas.
   */
  static async listarPlantasDestinoActivas(): Promise<PlantaDestinoDTO[]> {
    return prisma.plantaDestino.findMany({
      where: { activa: true },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        comuna: true,
        region: true,
        autorizadaRiles: true,
        resolucionSanitaria: true
      },
      orderBy: { nombre: 'asc' }
    });
  }

  /**
   * Obtiene un servicio de catálogo por ID si está activo.
   */
  static async obtenerServicioPorId(id: string): Promise<ServicioCatalogoDTO | null> {
    return prisma.servicioCatalogo.findFirst({
      where: { id, activo: true },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        duracionEstimadaMinutos: true
      }
    });
  }

  /**
   * Obtiene una planta de destino por ID si está activa.
   */
  static async obtenerPlantaPorId(id: string): Promise<PlantaDestinoDTO | null> {
    return prisma.plantaDestino.findFirst({
      where: { id, activa: true },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        comuna: true,
        region: true,
        autorizadaRiles: true,
        resolucionSanitaria: true
      }
    });
  }
}
