import { describe, it, expect, beforeAll } from 'vitest';
import { BitacoraService, BitacoraError } from '../../src/services/bitacora.service.js';
import { prisma } from '../../src/utils/prisma.js';
import { seedDemoData } from '../../prisma/seed.js';
import { RolUsuario, TipoEventoBitacora, EstadoOrdenServicio, EstadoSolicitud } from '@prisma/client';

describe('BitacoraService (Anti-WhatsApp)', () => {
  let ordenTestId: string;
  let ordenFolio: string;
  let testUserId: string;

  beforeAll(async () => {
    await seedDemoData();

    const user = await prisma.usuario.findFirst();
    testUserId = user!.id;

    const sucursal = await prisma.sucursalFaena.findFirst({
      where: { empresaClienteId: 'empresa-horse' }
    });

    const solicitud = await prisma.solicitudServicio.create({
      data: {
        folio: `SOL-BIT-${Date.now().toString().slice(-4)}`,
        empresaClienteId: 'empresa-horse',
        sucursalFaenaId: sucursal!.id,
        tipoResiduo: 'Aceites Usados',
        fechaPreferente: new Date(),
        estado: EstadoSolicitud.APROBADA
      }
    });

    ordenFolio = `OS-BIT-${Date.now().toString().slice(-4)}`;
    const orden = await prisma.ordenServicio.create({
      data: {
        folio: ordenFolio,
        solicitudServicioId: solicitud.id,
        estado: EstadoOrdenServicio.EN_EJECUCION
      }
    });
    ordenTestId = orden.id;
  });

  describe('registrarIncidencia', () => {
    it('debe registrar exitosamente un evento de bitácora general', async () => {
      const bitacora = await BitacoraService.registrarIncidencia({
        ordenServicioId: ordenTestId,
        tipoEvento: TipoEventoBitacora.OBSERVACION_GENERAL,
        descripcion: 'Inicio de bombeo y succión en planta sin novedad',
        latitud: -33.4372,
        longitud: -70.6506
      }, testUserId);

      expect(bitacora.id).toBeDefined();
      expect(bitacora.tipoEvento).toBe(TipoEventoBitacora.OBSERVACION_GENERAL);
      expect(bitacora.descripcion).toContain('Inicio de bombeo');
      expect(bitacora.latitud).toBe(-33.4372);
      expect(bitacora.registradoPorId).toBe(testUserId);
    });

    it('debe emitir alerta en AuditoriaEvento al registrar un evento crítico tipificado (TRAFICO, FALLA_EQUIPO, ACCESO_DENEGADO)', async () => {
      const bitacora = await BitacoraService.registrarIncidencia({
        ordenServicioId: ordenTestId,
        tipoEvento: TipoEventoBitacora.ACCESO_DENEGADO,
        descripcion: 'Guardia de garita no permite ingreso por cambio no informado de portería',
        latitud: -33.4380,
        longitud: -70.6510
      }, testUserId);

      expect(bitacora.id).toBeDefined();

      // Verificar que se haya creado el evento de auditoría/alerta operacional
      const alerta = await prisma.auditoriaEvento.findFirst({
        where: {
          recursoId: bitacora.id,
          accion: 'ALERTA_BITACORA_ACCESO_DENEGADO'
        }
      });

      expect(alerta).toBeDefined();
      expect(alerta?.accion).toBe('ALERTA_BITACORA_ACCESO_DENEGADO');
    });

    it('debe arrojar error 404 ORDER_NOT_FOUND si la orden de servicio no existe', async () => {
      await expect(
        BitacoraService.registrarIncidencia({
          ordenServicioId: 'orden-inexistente-uuid',
          tipoEvento: TipoEventoBitacora.TRAFICO,
          descripcion: 'Retraso de 40 minutos en autopista'
        })
      ).rejects.toThrowError(BitacoraError);
    });
  });

  describe('obtenerTimeline', () => {
    it('debe listar los eventos del timeline ordenados descendentemente', async () => {
      const resultado = await BitacoraService.obtenerTimeline(ordenTestId, {
        rol: RolUsuario.OPERACIONES,
        empresaClienteId: null
      });

      expect(resultado.ordenServicioId).toBe(ordenTestId);
      expect(resultado.totalEventos).toBeGreaterThanOrEqual(2);
      expect(resultado.timeline[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        resultado.timeline[1].createdAt.getTime()
      );
    });

    it('debe bloquear acceso si usuario CLIENTE intenta consultar bitácora de otra empresa (Tenant Isolation)', async () => {
      await expect(
        BitacoraService.obtenerTimeline(ordenTestId, {
          rol: RolUsuario.CLIENTE,
          empresaClienteId: 'empresa-acme' // Orden pertenece a 'empresa-horse'
        })
      ).rejects.toThrowError(BitacoraError);
    });

    it('debe permitir acceso si usuario CLIENTE consulta bitácora de su propia empresa', async () => {
      const resultado = await BitacoraService.obtenerTimeline(ordenTestId, {
        rol: RolUsuario.CLIENTE,
        empresaClienteId: 'empresa-horse'
      });

      expect(resultado.ordenServicioId).toBe(ordenTestId);
      expect(resultado.timeline.length).toBeGreaterThanOrEqual(1);
    });
  });
});
