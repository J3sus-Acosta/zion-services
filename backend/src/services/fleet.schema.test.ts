import { describe, it, expect } from 'vitest';
import {
  CrearEquipoSchema,
  EditarEquipoSchema,
  CambiarEstadoSchema,
  TransferirJornadasSchema,
  ListarFlotaQuerySchema,
  UUIDParamSchema
} from '../schemas/fleet.schema.js';
import { TipoEquipo, EstadoEquipo } from '@prisma/client';

describe('Fleet Schemas (Zod .strict())', () => {
  describe('CrearEquipoSchema', () => {
    it('debe validar un equipo válido con defaults', () => {
      const data = {
        patente: 'ab-1234',
        tipoEquipo: TipoEquipo.CAMION,
        marca: 'Volvo',
        modelo: 'FH-540',
        anio: 2022,
        capacidadEstanqueM3: 28.5
      };

      const parsed = CrearEquipoSchema.parse(data);
      expect(parsed.patente).toBe('AB-1234');
      expect(parsed.tipoEquipo).toBe(TipoEquipo.CAMION);
      expect(parsed.equipoHidrojet).toBe(false);
      expect(parsed.equipoVacio).toBe(false);
    });

    it('debe rechazar patentes con formato inválido o caracteres especiales', () => {
      expect(() =>
        CrearEquipoSchema.parse({
          patente: 'ABC!12',
          tipoEquipo: TipoEquipo.CAMION,
          marca: 'Volvo',
          modelo: 'FH',
          anio: 2020,
          capacidadEstanqueM3: 10
        })
      ).toThrow();
    });

    it('debe rechazar campos adicionales no permitidos gracias a .strict()', () => {
      expect(() =>
        CrearEquipoSchema.parse({
          patente: 'ABCD12',
          tipoEquipo: TipoEquipo.CAMION,
          marca: 'Volvo',
          modelo: 'FH',
          anio: 2020,
          capacidadEstanqueM3: 10,
          estado: 'HABILITADO' // Campo prohibido en creación
        })
      ).toThrow();
    });

    it('debe rechazar año inferior a 1980 o superior al año actual + 1', () => {
      expect(() =>
        CrearEquipoSchema.parse({
          patente: 'ABCD12',
          tipoEquipo: TipoEquipo.CAMION,
          marca: 'Volvo',
          modelo: 'FH',
          anio: 1975,
          capacidadEstanqueM3: 10
        })
      ).toThrow();
    });

    it('debe rechazar capacidad negativa o con más de 2 decimales', () => {
      expect(() =>
        CrearEquipoSchema.parse({
          patente: 'ABCD12',
          tipoEquipo: TipoEquipo.CAMION,
          marca: 'Volvo',
          modelo: 'FH',
          anio: 2021,
          capacidadEstanqueM3: -5
        })
      ).toThrow();

      expect(() =>
        CrearEquipoSchema.parse({
          patente: 'ABCD12',
          tipoEquipo: TipoEquipo.CAMION,
          marca: 'Volvo',
          modelo: 'FH',
          anio: 2021,
          capacidadEstanqueM3: 10.555
        })
      ).toThrow();
    });
  });

  describe('EditarEquipoSchema', () => {
    it('debe aceptar actualización parcial válida', () => {
      const parsed = EditarEquipoSchema.parse({
        marca: 'Mercedes-Benz',
        observaciones: 'Mantenimiento preventivo al día'
      });
      expect(parsed.marca).toBe('Mercedes-Benz');
      expect(parsed.observaciones).toBe('Mantenimiento preventivo al día');
    });

    it('debe rechazar objeto vacío sin ningún campo', () => {
      expect(() => EditarEquipoSchema.parse({})).toThrow(
        'Debe proporcionar al menos un campo para actualizar.'
      );
    });

    it('debe rechazar si se intenta enviar "estado" (.strict())', () => {
      expect(() =>
        EditarEquipoSchema.parse({
          marca: 'Mercedes-Benz',
          estado: 'DESHABILITADO'
        })
      ).toThrow();
    });
  });

  describe('CambiarEstadoSchema (Unión discriminada)', () => {
    it('debe aceptar cambio a HABILITADO sin motivo', () => {
      const parsed = CambiarEstadoSchema.parse({
        estado: EstadoEquipo.HABILITADO
      });
      expect(parsed.estado).toBe(EstadoEquipo.HABILITADO);
    });

    it('debe exigir motivo de al menos 5 caracteres al pasar a DESHABILITADO', () => {
      expect(() =>
        CambiarEstadoSchema.parse({
          estado: EstadoEquipo.DESHABILITADO
        })
      ).toThrow();

      expect(() =>
        CambiarEstadoSchema.parse({
          estado: EstadoEquipo.DESHABILITADO,
          motivo: 'Mal'
        })
      ).toThrow();

      const parsed = CambiarEstadoSchema.parse({
        estado: EstadoEquipo.DESHABILITADO,
        motivo: 'Falla de transmisión mayor detectada en faena'
      });
      expect(parsed.estado).toBe(EstadoEquipo.DESHABILITADO);
      if (parsed.estado === EstadoEquipo.DESHABILITADO) {
        expect(parsed.motivo).toBe('Falla de transmisión mayor detectada en faena');
      }
    });

    it('debe admitir vehiculoDestinoId opcional en DESHABILITADO', () => {
      const parsed = CambiarEstadoSchema.parse({
        estado: EstadoEquipo.DESHABILITADO,
        motivo: 'Falla de transmisión mayor detectada en faena',
        vehiculoDestinoId: '3c85f782-b7e2-4f36-9781-64d1f274cb6e'
      });
      if (parsed.estado === EstadoEquipo.DESHABILITADO) {
        expect(parsed.vehiculoDestinoId).toBe('3c85f782-b7e2-4f36-9781-64d1f274cb6e');
      }
    });
  });

  describe('TransferirJornadasSchema', () => {
    it('debe aceptar destino UUID válido y jornadaIds opcionales', () => {
      const parsed = TransferirJornadasSchema.parse({
        vehiculoDestinoId: '3c85f782-b7e2-4f36-9781-64d1f274cb6e'
      });
      expect(parsed.vehiculoDestinoId).toBe('3c85f782-b7e2-4f36-9781-64d1f274cb6e');
    });

    it('debe rechazar UUIDs mal formateados', () => {
      expect(() =>
        TransferirJornadasSchema.parse({
          vehiculoDestinoId: 'not-a-valid-uuid'
        })
      ).toThrow();
    });
  });

  describe('ListarFlotaQuerySchema y UUIDParamSchema', () => {
    it('debe validar query params de listado', () => {
      const parsed = ListarFlotaQuerySchema.parse({
        tipoEquipo: TipoEquipo.CAMION,
        estado: EstadoEquipo.HABILITADO,
        busqueda: 'Volvo'
      });
      expect(parsed.tipoEquipo).toBe(TipoEquipo.CAMION);
    });

    it('debe validar UUID en parámetro de ruta', () => {
      const parsed = UUIDParamSchema.parse({
        id: '3c85f782-b7e2-4f36-9781-64d1f274cb6e'
      });
      expect(parsed.id).toBe('3c85f782-b7e2-4f36-9781-64d1f274cb6e');
    });
  });
});
