import { describe, it, expect, beforeAll } from 'vitest';
import { CatalogoService } from '../../src/services/catalogo.service.js';
import { prisma } from '../../src/utils/prisma.js';

describe('CatalogoService', () => {
  let servicioActivoId: string;
  let servicioInactivoId: string;
  let plantaActivaId: string;
  let plantaInactivaId: string;

  beforeAll(async () => {
    // Asegurar registros de prueba activo e inactivo
    const sActivo = await prisma.servicioCatalogo.upsert({
      where: { codigo: 'TEST-HIDROJET-ACTIVO' },
      update: { activo: true },
      create: {
        codigo: 'TEST-HIDROJET-ACTIVO',
        nombre: 'Hidrojet Test Activo',
        descripcion: 'Servicio de prueba activo',
        duracionEstimadaMinutos: 120,
        activo: true
      }
    });
    servicioActivoId = sActivo.id;

    const sInactivo = await prisma.servicioCatalogo.upsert({
      where: { codigo: 'TEST-HIDROJET-INACTIVO' },
      update: { activo: false },
      create: {
        codigo: 'TEST-HIDROJET-INACTIVO',
        nombre: 'Hidrojet Test Inactivo',
        descripcion: 'Servicio de prueba inactivo',
        duracionEstimadaMinutos: 90,
        activo: false
      }
    });
    servicioInactivoId = sInactivo.id;

    const pActiva = await prisma.plantaDestino.upsert({
      where: { id: 'test-planta-activa-01' },
      update: { activa: true },
      create: {
        id: 'test-planta-activa-01',
        nombre: 'Planta Test Activa',
        direccion: 'Camino La Farfana 123',
        comuna: 'Maipú',
        region: 'Metropolitana',
        autorizadaRiles: true,
        activa: true
      }
    });
    plantaActivaId = pActiva.id;

    const pInactiva = await prisma.plantaDestino.upsert({
      where: { id: 'test-planta-inactiva-01' },
      update: { activa: false },
      create: {
        id: 'test-planta-inactiva-01',
        nombre: 'Planta Test Inactiva',
        direccion: 'Ruta 68 km 20',
        comuna: 'Pudahuel',
        region: 'Metropolitana',
        autorizadaRiles: false,
        activa: false
      }
    });
    plantaInactivaId = pInactiva.id;
  });

  it('listarServiciosActivos debe retornar solo servicios con activo: true', async () => {
    const servicios = await CatalogoService.listarServiciosActivos();
    expect(servicios.length).toBeGreaterThan(0);
    expect(servicios.some((s) => s.id === servicioActivoId)).toBe(true);
    expect(servicios.some((s) => s.id === servicioInactivoId)).toBe(false);

    for (const servicio of servicios) {
      expect(servicio).toHaveProperty('id');
      expect(servicio).toHaveProperty('codigo');
      expect(servicio).toHaveProperty('nombre');
      expect(servicio).toHaveProperty('duracionEstimadaMinutos');
    }
  });

  it('listarPlantasDestinoActivas debe retornar solo plantas con activa: true', async () => {
    const plantas = await CatalogoService.listarPlantasDestinoActivas();
    expect(plantas.length).toBeGreaterThan(0);
    expect(plantas.some((p) => p.id === plantaActivaId)).toBe(true);
    expect(plantas.some((p) => p.id === plantaInactivaId)).toBe(false);

    for (const planta of plantas) {
      expect(planta).toHaveProperty('id');
      expect(planta).toHaveProperty('nombre');
      expect(planta).toHaveProperty('direccion');
      expect(planta).toHaveProperty('comuna');
      expect(planta).toHaveProperty('autorizadaRiles');
    }
  });

  it('obtenerServicioPorId debe retornar servicio activo y null si inactivo o inexistente', async () => {
    const activo = await CatalogoService.obtenerServicioPorId(servicioActivoId);
    expect(activo).not.toBeNull();
    expect(activo?.id).toBe(servicioActivoId);

    const inactivo = await CatalogoService.obtenerServicioPorId(servicioInactivoId);
    expect(inactivo).toBeNull();

    const inexistente = await CatalogoService.obtenerServicioPorId('inexistente-id');
    expect(inexistente).toBeNull();
  });

  it('obtenerPlantaPorId debe retornar planta activa y null si inactiva o inexistente', async () => {
    const activa = await CatalogoService.obtenerPlantaPorId(plantaActivaId);
    expect(activa).not.toBeNull();
    expect(activa?.id).toBe(plantaActivaId);

    const inactiva = await CatalogoService.obtenerPlantaPorId(plantaInactivaId);
    expect(inactiva).toBeNull();

    const inexistente = await CatalogoService.obtenerPlantaPorId('inexistente-id');
    expect(inexistente).toBeNull();
  });
});
