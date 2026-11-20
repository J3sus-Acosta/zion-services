import { describe, it, expect } from 'vitest';
import { InspectionService, InspeccionSalidaInput } from './inspection.service.js';
import { JourneyValidationService } from './journey-validation.service.js';
import { TipoFotoInspeccion, EstadoInspeccion, ModalidadJornada, EstadoCicloTransporte } from '@prisma/client';

describe('Inspecciones de Flota y Reglas Operacionales de Jornada', () => {
  const fotosValidas = [
    { tipo: TipoFotoInspeccion.FRONTAL, archivoUrl: '/uploads/frontal.jpg' },
    { tipo: TipoFotoInspeccion.LATERAL_IZQUIERDA, archivoUrl: '/uploads/lat_izq.jpg' },
    { tipo: TipoFotoInspeccion.TRASERA, archivoUrl: '/uploads/trasera.jpg' },
    { tipo: TipoFotoInspeccion.LATERAL_DERECHA, archivoUrl: '/uploads/lat_der.jpg' }
  ];

  it('debe arrojar error si faltan fotos perimetrales 360° en la salida de planta', () => {
    const inputIncompleto: InspeccionSalidaInput = {
      vehiculoId: 'camion-1',
      conductorId: 'conductor-1',
      items: [],
      fotos360: [
        { tipo: TipoFotoInspeccion.FRONTAL, archivoUrl: '/uploads/frontal.jpg' }
        // Faltan 3 fotos
      ]
    };

    expect(() => InspectionService.evaluarInspeccionSalida(inputIncompleto)).toThrowError(
      /Faltan fotos obligatorias del camión/
    );
  });

  it('debe bloquear automáticamente el vehículo si hay fallas críticas en el checklist F-GMT-MAN-004', () => {
    const inputConFallaCritica: InspeccionSalidaInput = {
      vehiculoId: 'camion-1',
      conductorId: 'conductor-1',
      fotos360: fotosValidas,
      items: [
        {
          categoria: 'MECANICA',
          numero: 25,
          nombre: 'Freno de servicio',
          estado: 'MALO',
          esCritico: true,
          observaciones: 'Pedal esponjoso y pérdida de aire'
        }
      ]
    };

    const resultado = InspectionService.evaluarInspeccionSalida(inputConFallaCritica);
    expect(resultado.estado).toBe(EstadoInspeccion.NO_CONFORME);
    expect(resultado.bloqueado).toBe(true);
    expect(resultado.motivoBloqueo).toContain('Freno de servicio');
  });

  it('debe aprobar la salida si los 80 ítems están conformes y las 4 fotos presentes', () => {
    const inputConforme: InspeccionSalidaInput = {
      vehiculoId: 'camion-1',
      conductorId: 'conductor-1',
      fotos360: fotosValidas,
      items: [
        {
          categoria: 'MECANICA',
          numero: 25,
          nombre: 'Freno de servicio',
          estado: 'BUENO',
          esCritico: true
        }
      ]
    };

    const resultado = InspectionService.evaluarInspeccionSalida(inputConforme);
    expect(resultado.estado).toBe(EstadoInspeccion.CONFORME);
    expect(resultado.bloqueado).toBe(false);
  });

  it('en LOCAL_SANTIAGO: debe BLOQUEAR un segundo retiro si el retiro previo no fue descargado en destino', () => {
    const validacion = JourneyValidationService.validarInicioRetiro({
      modalidad: ModalidadJornada.LOCAL_SANTIAGO,
      ultimoCicloTransporte: {
        ordenServicioFolio: 'OS-000561',
        estado: EstadoCicloTransporte.RETIRO_COMPLETADO,
        descargaCertificadaEnDestino: false // Aún no descarga en destino
      }
    });

    expect(validacion.autorizado).toBe(false);
    expect(validacion.errorCodigo).toBe('INVARIANTE_DESCARGA_PENDIENTE');
  });

  it('en LOCAL_SANTIAGO: debe AUTORIZAR el retiro si la atención previa ya fue descargada y certificada en destino', () => {
    const validacion = JourneyValidationService.validarInicioRetiro({
      modalidad: ModalidadJornada.LOCAL_SANTIAGO,
      ultimoCicloTransporte: {
        ordenServicioFolio: 'OS-000561',
        estado: EstadoCicloTransporte.DESCARGA_CERTIFICADA,
        descargaCertificadaEnDestino: true
      }
    });

    expect(validacion.autorizado).toBe(true);
  });

  it('en VIAJE_INTERREGIONAL: debe AUTORIZAR retiros y traslados consecutivos en la zona durante la campaña', () => {
    const validacion = JourneyValidationService.validarInicioRetiro({
      modalidad: ModalidadJornada.VIAJE_INTERREGIONAL,
      ultimoCicloTransporte: {
        ordenServicioFolio: 'OS-000561',
        estado: EstadoCicloTransporte.RETIRO_COMPLETADO,
        descargaCertificadaEnDestino: false
      }
    });

    expect(validacion.autorizado).toBe(true);
  });
});
