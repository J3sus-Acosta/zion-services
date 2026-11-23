import { describe, it, expect } from 'vitest';
import {
  solicitudMultiAtencionSchema,
  asignarAtencionSchema,
  reasignarAtencionSchema,
  agendaQuerySchema
} from '../../src/validators/planning.validator.js';
import { EstadoAtencionProgramada } from '@prisma/client';

describe('Planning Validators (Zod Schemas)', () => {
  const validUUID1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const validUUID2 = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const validUUID3 = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

  describe('solicitudMultiAtencionSchema', () => {
    it('debe validar exitosamente una solicitud multi-atención correcta', () => {
      const payload = {
        empresaClienteId: validUUID1,
        sucursalFaenaId: validUUID2,
        tipoResiduo: 'RILes Industriales y Aceites',
        descripcion: 'Retiro semanal de residuos líquidos',
        cantidadEstimada: 15.5,
        unidadEstimada: 'M3' as const,
        atenciones: [
          {
            fechaHoraInicio: '2026-12-01T09:00:00.000Z',
            duracionEstimadaMinutos: 120,
            servicios: [
              {
                servicioCatalogoId: validUUID3,
                cantidad: 2,
                observaciones: 'Servicio en cárcamo 1'
              }
            ]
          }
        ]
      };

      const result = solicitudMultiAtencionSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.atenciones).toHaveLength(1);
        expect(result.data.unidadEstimada).toBe('M3');
      }
    });

    it('debe fallar si atenciones supera el límite de 30 elementos (SEC-05)', () => {
      const atenciones31 = Array.from({ length: 31 }, (_, i) => ({
        fechaHoraInicio: new Date(Date.now() + i * 86400000).toISOString(),
        duracionEstimadaMinutos: 120,
        servicios: [{ servicioCatalogoId: validUUID3, cantidad: 1 }]
      }));

      const payload = {
        empresaClienteId: validUUID1,
        sucursalFaenaId: validUUID2,
        tipoResiduo: 'RILes',
        atenciones: atenciones31
      };

      const result = solicitudMultiAtencionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const atencionesError = result.error.issues.find((i) => i.path.includes('atenciones'));
        expect(atencionesError).toBeDefined();
        expect(atencionesError?.message).toContain('Máximo 30 atenciones');
      }
    });

    it('debe fallar si atenciones está vacío', () => {
      const payload = {
        empresaClienteId: validUUID1,
        sucursalFaenaId: validUUID2,
        tipoResiduo: 'Lodos',
        atenciones: []
      };

      const result = solicitudMultiAtencionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('atenciones'))).toBe(true);
      }
    });

    it('debe fallar si una atención no tiene servicios', () => {
      const payload = {
        empresaClienteId: validUUID1,
        sucursalFaenaId: validUUID2,
        tipoResiduo: 'Lodos',
        atenciones: [
          {
            fechaHoraInicio: '2026-12-01T09:00:00.000Z',
            duracionEstimadaMinutos: 120,
            servicios: []
          }
        ]
      };

      const result = solicitudMultiAtencionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('debe rechazar IDs no UUID en empresa o sucursal', () => {
      const payload = {
        empresaClienteId: 'id-no-uuid',
        sucursalFaenaId: 'id-no-uuid',
        tipoResiduo: 'Aguas servidas',
        atenciones: [
          {
            fechaHoraInicio: '2026-12-01T09:00:00.000Z',
            servicios: [{ servicioCatalogoId: validUUID3, cantidad: 1 }]
          }
        ]
      };

      const result = solicitudMultiAtencionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('asignarAtencionSchema', () => {
    it('debe validar asignación normal sin forzado', () => {
      const payload = {
        vehiculoId: validUUID1,
        conductorId: validUUID2,
        fechaHoraInicio: '2026-12-02T10:00:00.000Z',
        duracionEstimadaMinutos: 180,
        forzarConJustificacion: false
      };

      const result = asignarAtencionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('debe fallar si forzarConJustificacion es true pero no se provee justificación', () => {
      const payload = {
        vehiculoId: validUUID1,
        conductorId: validUUID2,
        fechaHoraInicio: '2026-12-02T10:00:00.000Z',
        duracionEstimadaMinutos: 180,
        forzarConJustificacion: true
      };

      const result = asignarAtencionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('justificacionForzado'))).toBe(true);
      }
    });

    it('debe fallar si forzarConJustificacion es true y la justificación tiene menos de 10 caracteres', () => {
      const payload = {
        vehiculoId: validUUID1,
        conductorId: validUUID2,
        fechaHoraInicio: '2026-12-02T10:00:00.000Z',
        duracionEstimadaMinutos: 180,
        forzarConJustificacion: true,
        justificacionForzado: 'corta'
      };

      const result = asignarAtencionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('al menos 10 caracteres');
      }
    });

    it('debe validar si forzarConJustificacion es true y la justificación tiene >= 10 caracteres', () => {
      const payload = {
        vehiculoId: validUUID1,
        conductorId: validUUID2,
        fechaHoraInicio: '2026-12-02T10:00:00.000Z',
        duracionEstimadaMinutos: 180,
        forzarConJustificacion: true,
        justificacionForzado: 'Urgencia operativa autorizada por jefatura.'
      };

      const result = asignarAtencionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('reasignarAtencionSchema', () => {
    it('debe validar reasignación con motivo válido (>= 5 caracteres)', () => {
      const payload = {
        nuevoVehiculoId: validUUID1,
        motivoReasignacion: 'Falla mecánica de camión anterior'
      };

      const result = reasignarAtencionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('debe fallar si el motivo es menor a 5 caracteres', () => {
      const payload = {
        nuevoVehiculoId: validUUID1,
        motivoReasignacion: 'fail'
      };

      const result = reasignarAtencionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('debe exigir justificación de >= 10 caracteres si forzarConJustificacion es true', () => {
      const payloadSinJustificacion = {
        nuevoVehiculoId: validUUID1,
        motivoReasignacion: 'Cambio de turno de chofer',
        forzarConJustificacion: true
      };
      expect(reasignarAtencionSchema.safeParse(payloadSinJustificacion).success).toBe(false);

      const payloadConJustificacion = {
        nuevoVehiculoId: validUUID1,
        motivoReasignacion: 'Cambio de turno de chofer',
        forzarConJustificacion: true,
        justificacionForzado: 'Aprobado excepcionalmente por Jefe de Operaciones'
      };
      expect(reasignarAtencionSchema.safeParse(payloadConJustificacion).success).toBe(true);
    });
  });

  describe('agendaQuerySchema', () => {
    it('debe validar filtros con fechas ISO válidas y vista por defecto mes', () => {
      const query = {
        fechaDesde: '2026-12-01T00:00:00.000Z',
        fechaHasta: '2026-12-31T23:59:59.000Z'
      };

      const result = agendaQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vista).toBe('mes');
      }
    });

    it('debe admitir filtros específicos y estado del enum', () => {
      const query = {
        fechaDesde: '2026-12-01T00:00:00.000Z',
        fechaHasta: '2026-12-07T23:59:59.000Z',
        vehiculoId: validUUID1,
        conductorId: validUUID2,
        estado: EstadoAtencionProgramada.PROGRAMADA,
        vista: 'semana' as const
      };

      const result = agendaQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.estado).toBe(EstadoAtencionProgramada.PROGRAMADA);
        expect(result.data.vista).toBe('semana');
      }
    });

    it('debe rechazar formato no ISO en fechas', () => {
      const query = {
        fechaDesde: '01/12/2026',
        fechaHasta: '2026-12-31T23:59:59.000Z'
      };

      const result = agendaQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });
});
