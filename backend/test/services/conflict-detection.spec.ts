import { describe, it, expect, vi } from 'vitest';
import {
  PlanningConflictService,
  ConflictError,
  AtencionExistenteInfo
} from '../../src/services/planning-conflict.service.js';

describe('PlanningConflictService: Detección de Conflictos y Margen de Traslado', () => {
  const vehiculoId = 'v-100';
  const conductorId = 'c-200';

  describe('Algoritmo puro de Solapamiento (solapan)', () => {
    it('detecta colisión exacta de horarios', () => {
      const a = { inicio: new Date('2026-12-01T10:00:00Z'), fin: new Date('2026-12-01T12:00:00Z') };
      const b = { inicio: new Date('2026-12-01T10:00:00Z'), fin: new Date('2026-12-01T12:00:00Z') };
      expect(PlanningConflictService.solapan(a, b)).toBe(true);
    });

    it('detecta solapamiento parcial donde B inicia antes de que A termine', () => {
      const a = { inicio: new Date('2026-12-01T08:00:00Z'), fin: new Date('2026-12-01T11:00:00Z') };
      const b = { inicio: new Date('2026-12-01T10:30:00Z'), fin: new Date('2026-12-01T13:00:00Z') };
      expect(PlanningConflictService.solapan(a, b)).toBe(true);
      expect(PlanningConflictService.solapan(b, a)).toBe(true);
    });

    it('detecta inclusión completa (B dentro de A)', () => {
      const a = { inicio: new Date('2026-12-01T08:00:00Z'), fin: new Date('2026-12-01T16:00:00Z') };
      const b = { inicio: new Date('2026-12-01T10:00:00Z'), fin: new Date('2026-12-01T12:00:00Z') };
      expect(PlanningConflictService.solapan(a, b)).toBe(true);
    });

    it('no solapan si B inicia exactamente cuando A finaliza (intervalos cerrados-abiertos)', () => {
      const a = { inicio: new Date('2026-12-01T08:00:00Z'), fin: new Date('2026-12-01T11:00:00Z') };
      const b = { inicio: new Date('2026-12-01T11:00:00Z'), fin: new Date('2026-12-01T13:00:00Z') };
      expect(PlanningConflictService.solapan(a, b)).toBe(false);
      expect(PlanningConflictService.solapan(b, a)).toBe(false);
    });

    it('no solapan si están en días distintos o completamente separados', () => {
      const a = { inicio: new Date('2026-12-01T08:00:00Z'), fin: new Date('2026-12-01T10:00:00Z') };
      const b = { inicio: new Date('2026-12-02T08:00:00Z'), fin: new Date('2026-12-02T10:00:00Z') };
      expect(PlanningConflictService.solapan(a, b)).toBe(false);
    });
  });

  describe('detectarSolapamiento sobre lista existente', () => {
    const existentes: AtencionExistenteInfo[] = [
      {
        id: 'at-1',
        folio: 'AP-2026-00001',
        fechaHoraInicio: new Date('2026-12-01T09:00:00Z'),
        fechaHoraFinEstimada: new Date('2026-12-01T12:00:00Z'),
        vehiculoId: 'v-100',
        conductorId: 'c-different',
        vehiculo: { id: 'v-100', patente: 'PJ-9234' }
      },
      {
        id: 'at-2',
        folio: 'AP-2026-00002',
        fechaHoraInicio: new Date('2026-12-01T14:00:00Z'),
        fechaHoraFinEstimada: new Date('2026-12-01T17:00:00Z'),
        vehiculoId: 'v-different',
        conductorId: 'c-200',
        conductor: { id: 'c-200', nombre: 'Carlos', apellido: 'Valenzuela' }
      }
    ];

    it('identifica conflicto de VEHICULO si colisiona con at-1', () => {
      const nuevo = { inicio: new Date('2026-12-01T11:00:00Z'), fin: new Date('2026-12-01T13:00:00Z') };
      const conflictos = PlanningConflictService.detectarSolapamiento(nuevo, 'v-100', 'c-other', existentes);

      expect(conflictos).toHaveLength(1);
      expect(conflictos[0]?.tipo).toBe('VEHICULO');
      expect(conflictos[0]?.recursoIdentificador).toBe('PJ-9234');
      expect(conflictos[0]?.atencionConflictoFolio).toBe('AP-2026-00001');
    });

    it('identifica conflicto de CONDUCTOR si colisiona con at-2', () => {
      const nuevo = { inicio: new Date('2026-12-01T15:00:00Z'), fin: new Date('2026-12-01T18:00:00Z') };
      const conflictos = PlanningConflictService.detectarSolapamiento(nuevo, 'v-other', 'c-200', existentes);

      expect(conflictos).toHaveLength(1);
      expect(conflictos[0]?.tipo).toBe('CONDUCTOR');
      expect(conflictos[0]?.recursoIdentificador).toBe('Carlos Valenzuela');
      expect(conflictos[0]?.atencionConflictoFolio).toBe('AP-2026-00002');
    });

    it('retorna vacío si no colisiona con ninguna atención existente', () => {
      const nuevo = { inicio: new Date('2026-12-01T12:00:00Z'), fin: new Date('2026-12-01T14:00:00Z') };
      const conflictos = PlanningConflictService.detectarSolapamiento(nuevo, 'v-100', 'c-200', existentes);
      expect(conflictos).toHaveLength(0);
    });
  });

  describe('calcularMargenTraslado (Regla 4 horas / 240 minutos)', () => {
    it('genera advertencia si el margen anterior es menor a 240 minutos', () => {
      const atencionesRecurso: AtencionExistenteInfo[] = [
        {
          id: 'at-prev',
          folio: 'AP-2026-00010',
          fechaHoraInicio: new Date('2026-12-01T07:00:00Z'),
          fechaHoraFinEstimada: new Date('2026-12-01T09:00:00Z'), // Termina 09:00
          vehiculoId: 'v-100',
          conductorId: 'c-200',
          sucursalFaena: { id: 's-1', nombre: 'Planta Maipú', comuna: 'Maipú' }
        }
      ];

      // Nuevo servicio inicia 11:00 (margen = 2 horas = 120 min < 240 min)
      const nuevo = { inicio: new Date('2026-12-01T11:00:00Z'), fin: new Date('2026-12-01T13:00:00Z') };
      const advertencia = PlanningConflictService.calcularMargenTraslado(
        nuevo,
        atencionesRecurso,
        'Quilicura',
        'VEHICULO',
        'PJ-9234'
      );

      expect(advertencia).not.toBeNull();
      expect(advertencia?.margenMinutos).toBe(120);
      expect(advertencia?.tipoRecurso).toBe('VEHICULO');
      expect(advertencia?.faenaAnterior?.folio).toBe('AP-2026-00010');
      expect(advertencia?.faenaAnterior?.comuna).toBe('Maipú');
      expect(advertencia?.faenaSolicitada.comuna).toBe('Quilicura');
    });

    it('genera advertencia si el margen posterior es menor a 240 minutos', () => {
      const atencionesRecurso: AtencionExistenteInfo[] = [
        {
          id: 'at-post',
          folio: 'AP-2026-00011',
          fechaHoraInicio: new Date('2026-12-01T15:00:00Z'), // Inicia 15:00
          fechaHoraFinEstimada: new Date('2026-12-01T17:00:00Z'),
          vehiculoId: 'v-100',
          conductorId: 'c-200',
          sucursalFaena: { id: 's-2', nombre: 'Planta Lampa', comuna: 'Lampa' }
        }
      ];

      // Nuevo servicio termina 13:30 (margen = 90 min < 240 min)
      const nuevo = { inicio: new Date('2026-12-01T11:30:00Z'), fin: new Date('2026-12-01T13:30:00Z') };
      const advertencia = PlanningConflictService.calcularMargenTraslado(
        nuevo,
        atencionesRecurso,
        'Pudahuel',
        'CONDUCTOR',
        'Carlos Valenzuela'
      );

      expect(advertencia).not.toBeNull();
      expect(advertencia?.margenMinutos).toBe(90);
      expect(advertencia?.tipoRecurso).toBe('CONDUCTOR');
      expect(advertencia?.faenaPosterior?.folio).toBe('AP-2026-00011');
      expect(advertencia?.faenaPosterior?.comuna).toBe('Lampa');
    });

    it('no genera advertencia si el margen con faena anterior es >= 240 min', () => {
      const atencionesRecurso: AtencionExistenteInfo[] = [
        {
          id: 'at-prev',
          folio: 'AP-2026-00010',
          fechaHoraInicio: new Date('2026-12-01T06:00:00Z'),
          fechaHoraFinEstimada: new Date('2026-12-01T08:00:00Z'), // Termina 08:00
          vehiculoId: 'v-100',
          conductorId: 'c-200'
        }
      ];

      // Inicia a las 13:00 (margen = 5 horas = 300 min >= 240 min)
      const nuevo = { inicio: new Date('2026-12-01T13:00:00Z'), fin: new Date('2026-12-01T15:00:00Z') };
      const advertencia = PlanningConflictService.calcularMargenTraslado(
        nuevo,
        atencionesRecurso,
        'San Bernardo',
        'VEHICULO',
        'PJ-9234'
      );

      expect(advertencia).toBeNull();
    });
  });

  describe('validarDisponibilidad con mock de Prisma', () => {
    it('lanza ConflictError ERROR_SOLAPAMIENTO_HORARIO en colisión directa sin permitir forzado', async () => {
      const mockPrismaClient = {
        atencionProgramada: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'at-colision',
              folio: 'AP-2026-COL-01',
              fechaHoraInicio: new Date('2026-12-05T09:00:00Z'),
              fechaHoraFinEstimada: new Date('2026-12-05T12:00:00Z'),
              vehiculoId,
              conductorId,
              vehiculo: { id: vehiculoId, patente: 'PJ-9234' },
              conductor: { id: conductorId, nombre: 'Carlos', apellido: 'Valenzuela' },
              sucursalFaena: { id: 's-1', nombre: 'Faena Quilicura', comuna: 'Quilicura' }
            }
          ])
        }
      };

      await expect(
        PlanningConflictService.validarDisponibilidad({
          vehiculoId,
          conductorId,
          fechaHoraInicio: new Date('2026-12-05T10:00:00Z'),
          duracionEstimadaMinutos: 120,
          comunaDestino: 'San Bernardo',
          forzarConJustificacion: true, // Aun con forzar debe ser rechazado
          justificacionForzado: 'Intento de forzar colision directa que debe ser rechazada',
          client: mockPrismaClient as any
        })
      ).rejects.toThrow(ConflictError);

      try {
        await PlanningConflictService.validarDisponibilidad({
          vehiculoId,
          conductorId,
          fechaHoraInicio: new Date('2026-12-05T10:00:00Z'),
          duracionEstimadaMinutos: 120,
          comunaDestino: 'San Bernardo',
          client: mockPrismaClient as any
        });
      } catch (err) {
        const error = err as ConflictError;
        expect(error.code).toBe('ERROR_SOLAPAMIENTO_HORARIO');
        expect(error.statusCode).toBe(409);
        expect(error.conflictos?.length).toBeGreaterThan(0);
      }
    });

    it('lanza ConflictError WARNING_INTERVALO_TRASLADO si margen < 4h y no viene forzado válido', async () => {
      const mockPrismaClient = {
        atencionProgramada: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'at-anterior',
              folio: 'AP-2026-ANT-01',
              fechaHoraInicio: new Date('2026-12-05T07:00:00Z'),
              fechaHoraFinEstimada: new Date('2026-12-05T09:00:00Z'),
              vehiculoId,
              conductorId,
              vehiculo: { id: vehiculoId, patente: 'PJ-9234' },
              conductor: { id: conductorId, nombre: 'Carlos', apellido: 'Valenzuela' },
              sucursalFaena: { id: 's-1', nombre: 'Faena San Bernardo', comuna: 'San Bernardo' }
            }
          ])
        }
      };

      // Nuevo inicia 10:30 (margen = 90 min)
      await expect(
        PlanningConflictService.validarDisponibilidad({
          vehiculoId,
          conductorId,
          fechaHoraInicio: new Date('2026-12-05T10:30:00Z'),
          duracionEstimadaMinutos: 120,
          comunaDestino: 'Quilicura',
          forzarConJustificacion: false,
          client: mockPrismaClient as any
        })
      ).rejects.toThrow(ConflictError);

      try {
        await PlanningConflictService.validarDisponibilidad({
          vehiculoId,
          conductorId,
          fechaHoraInicio: new Date('2026-12-05T10:30:00Z'),
          duracionEstimadaMinutos: 120,
          comunaDestino: 'Quilicura',
          forzarConJustificacion: false,
          client: mockPrismaClient as any
        });
      } catch (err) {
        const error = err as ConflictError;
        expect(error.code).toBe('WARNING_INTERVALO_TRASLADO');
        expect(error.detalles?.margenMinutos).toBe(90);
      }
    });

    it('autoriza con forzado si margen < 4h pero viene forzarConJustificacion: true y justificación >= 10 chars', async () => {
      const mockPrismaClient = {
        atencionProgramada: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'at-anterior',
              folio: 'AP-2026-ANT-01',
              fechaHoraInicio: new Date('2026-12-05T07:00:00Z'),
              fechaHoraFinEstimada: new Date('2026-12-05T09:00:00Z'),
              vehiculoId,
              conductorId,
              vehiculo: { id: vehiculoId, patente: 'PJ-9234' },
              conductor: { id: conductorId, nombre: 'Carlos', apellido: 'Valenzuela' },
              sucursalFaena: { id: 's-1', nombre: 'Faena San Bernardo', comuna: 'San Bernardo' }
            }
          ])
        }
      };

      const resultado = await PlanningConflictService.validarDisponibilidad({
        vehiculoId,
        conductorId,
        fechaHoraInicio: new Date('2026-12-05T10:30:00Z'),
        duracionEstimadaMinutos: 120,
        comunaDestino: 'Quilicura',
        forzarConJustificacion: true,
        justificacionForzado: 'Urgencia operacional aprobada por Jefatura',
        client: mockPrismaClient as any
      });

      expect(resultado.autorizadaConForzado).toBe(true);
      expect(resultado.advertencia).toBeDefined();
      expect(resultado.advertencia?.margenMinutos).toBe(90);
    });
  });
});
