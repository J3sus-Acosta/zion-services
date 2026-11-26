import path from 'path';
import {
  EstadoCicloTransporte,
  TipoRecepcion,
  CategoriaDocumento,
  EstadoOrdenServicio
} from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { fileStorageService } from './file-storage.service.js';

export interface MarcarLlegadaInput {
  cicloTransporteId: string;
  horaLlegada?: Date | string;
  coordenadas?: { lat?: number; lng?: number; latitud?: number; longitud?: number };
}

export interface FirmarOrdenTrabajoInput {
  cicloTransporteId: string;
  nombreCliente: string;
  rutCliente: string;
  firmaSvg: string;
  fechaHora?: Date | string;
}

export interface CargarFotoFaenaEPPInput {
  cicloTransporteId: string;
  archivoUrl: string;
  descripcion: string; // Ej: "Succión estanque 1", "Cuadrilla con EPP completo"
}

export interface FinalizarRecepcionInput {
  cicloTransporteId: string;
  tipoRecepcion: TipoRecepcion;
  nombreFirmante?: string;
  rutFirmante?: string;
  firmaSvg?: string;
  observaciones?: string;
  fotoRespaldoUrl?: string;
}

export class TransportCycleService {
  /**
   * 1. Marcar Llegada a la faena del cliente:
   * - Actualiza CicloTransporte con horaLlegadaFaena y estado EN_FAENA.
   * - Si se envían coordenadas GPS, inserta registro en RegistroTelemetriaGPS vinculado a la orden.
   */
  static async registrarLlegada(input: MarcarLlegadaInput) {
    const ciclo = await prisma.cicloTransporte.findUnique({
      where: { id: input.cicloTransporteId },
      include: { ordenServicio: true }
    });

    if (!ciclo) {
      throw new Error(`Ciclo de transporte no encontrado: ${input.cicloTransporteId}`);
    }

    const fechaLlegada = input.horaLlegada ? new Date(input.horaLlegada) : new Date();

    const resultado = await prisma.$transaction(async (tx) => {
      // 1.1 Actualizar estado del ciclo a EN_FAENA
      const cicloActualizado = await tx.cicloTransporte.update({
        where: { id: input.cicloTransporteId },
        data: {
          horaLlegadaFaena: fechaLlegada,
          estado: EstadoCicloTransporte.EN_FAENA
        }
      });

      // 1.2 Si se envían coordenadas GPS, persistir telemetría
      const lat = input.coordenadas?.lat ?? input.coordenadas?.latitud;
      const lng = input.coordenadas?.lng ?? input.coordenadas?.longitud;

      if (lat !== undefined && lng !== undefined) {
        await tx.registroTelemetriaGPS.create({
          data: {
            ordenServicioId: ciclo.ordenServicioId,
            latitud: Number(lat),
            longitud: Number(lng),
            precisionMts: 5.0,
            timestamp: new Date()
          }
        });
      }

      return cicloActualizado;
    });

    return {
      cicloTransporteId: resultado.id,
      estado: resultado.estado,
      horaLlegada: resultado.horaLlegadaFaena,
      mensaje: 'Llegada registrada exitosamente. Pendiente firma de Orden de Trabajo por el cliente.'
    };
  }

  /**
   * 2. Firma de Orden de Trabajo por el cliente autorizando el inicio de faena:
   * - Decodifica y persiste la firma táctil (SVG/PNG Data URL) en disco (${STORAGE_PATH}/ciclo-transporte/firmas/).
   * - Inserta o actualiza AutorizacionFaena.
   * - Actualiza CicloTransporte.estado a FAENA_AUTORIZADA.
   */
  static async autorizarInicioFaena(input: FirmarOrdenTrabajoInput) {
    if (!input.firmaSvg || input.firmaSvg.trim() === '') {
      throw new Error('La firma digital del cliente es requerida para autorizar el inicio de faena.');
    }

    const ciclo = await prisma.cicloTransporte.findUnique({
      where: { id: input.cicloTransporteId }
    });

    if (!ciclo) {
      throw new Error(`Ciclo de transporte no encontrado: ${input.cicloTransporteId}`);
    }

    // Decodificar y persistir firma en disco si viene como Data URL o SVG markup
    let urlFirmaRelativa = input.firmaSvg;
    if (input.firmaSvg.startsWith('data:')) {
      const saved = await fileStorageService.guardarBase64(
        input.firmaSvg,
        'ciclo-transporte/firmas',
        'firma_ot'
      );
      urlFirmaRelativa = saved.urlRelativa;
    } else if (input.firmaSvg.startsWith('<svg') || input.firmaSvg.startsWith('<?xml')) {
      const svgBase64 = 'data:image/svg+xml;base64,' + Buffer.from(input.firmaSvg).toString('base64');
      const saved = await fileStorageService.guardarBase64(
        svgBase64,
        'ciclo-transporte/firmas',
        'firma_ot'
      );
      urlFirmaRelativa = saved.urlRelativa;
    }

    const fechaFirma = input.fechaHora ? new Date(input.fechaHora) : new Date();

    const resultado = await prisma.$transaction(async (tx) => {
      // 2.1 Upsert AutorizacionFaena
      const autorizacion = await tx.autorizacionFaena.upsert({
        where: { cicloTransporteId: ciclo.id },
        update: {
          nombreCliente: input.nombreCliente.trim(),
          rutCliente: input.rutCliente.trim(),
          firmaClienteSvg: urlFirmaRelativa,
          fechaHoraFirma: fechaFirma
        },
        create: {
          cicloTransporteId: ciclo.id,
          nombreCliente: input.nombreCliente.trim(),
          rutCliente: input.rutCliente.trim(),
          firmaClienteSvg: urlFirmaRelativa,
          fechaHoraFirma: fechaFirma
        }
      });

      // 2.2 Actualizar estado del Ciclo a FAENA_AUTORIZADA
      const cicloActualizado = await tx.cicloTransporte.update({
        where: { id: ciclo.id },
        data: {
          estado: EstadoCicloTransporte.FAENA_AUTORIZADA
        }
      });

      return { autorizacion, cicloActualizado };
    });

    return {
      cicloTransporteId: ciclo.id,
      estado: resultado.cicloActualizado.estado,
      autorizacionFaena: {
        nombreCliente: resultado.autorizacion.nombreCliente,
        rutCliente: resultado.autorizacion.rutCliente,
        fechaHoraFirma: resultado.autorizacion.fechaHoraFirma,
        firmaClienteSvg: resultado.autorizacion.firmaClienteSvg
      },
      fotosFaenaPermitidas: true,
      mensaje: 'Faena autorizada. Módulo de fotos de trabajo y EPP habilitado.'
    };
  }

  /**
   * 3. Validar y registrar fotos de trabajo y EPP:
   * - Decodifica la imagen Base64 hacia ${STORAGE_PATH}/ciclo-transporte/fotos/.
   * - Crea registro en FotoFaenaEPP.
   * - Indexa simultáneamente en ExpedienteDocumental (DocumentoExpediente).
   */
  static async registrarFotoFaena(estadoCiclo: EstadoCicloTransporte, input: CargarFotoFaenaEPPInput) {
    if (
      estadoCiclo !== EstadoCicloTransporte.FAENA_AUTORIZADA &&
      estadoCiclo !== EstadoCicloTransporte.EN_FAENA &&
      estadoCiclo !== EstadoCicloTransporte.RETIRO_COMPLETADO
    ) {
      throw new Error('No se pueden registrar fotos de faena sin haber firmado previamente la Orden de Trabajo.');
    }

    const ciclo = await prisma.cicloTransporte.findUnique({
      where: { id: input.cicloTransporteId },
      include: {
        ordenServicio: {
          include: { expediente: true }
        }
      }
    });

    if (!ciclo) {
      throw new Error(`Ciclo de transporte no encontrado: ${input.cicloTransporteId}`);
    }

    // Decodificar Base64 en disco si aplica
    let urlFinal = input.archivoUrl;
    let pesoBytes = 1024;
    let mimeType = 'image/jpeg';

    if (input.archivoUrl.startsWith('data:')) {
      const saved = await fileStorageService.guardarBase64(
        input.archivoUrl,
        'ciclo-transporte/fotos',
        'faena'
      );
      urlFinal = saved.urlRelativa;
      pesoBytes = saved.pesoBytes;
      mimeType = saved.mimeType;
    }

    const categoriaDoc = input.descripcion.toUpperCase().includes('EPP')
      ? CategoriaDocumento.FOTO_EPP_SEGURIDAD
      : CategoriaDocumento.FOTO_FAENA_PROCESO;

    const foto = await prisma.$transaction(async (tx) => {
      // 3.1 Registrar FotoFaenaEPP
      const fotoRow = await tx.fotoFaenaEPP.create({
        data: {
          cicloTransporteId: ciclo.id,
          archivoUrl: urlFinal,
          descripcion: input.descripcion,
          fechaHora: new Date()
        }
      });

      // 3.2 Indexar en DocumentoExpediente
      let expedienteId = ciclo.ordenServicio?.expediente?.id;
      if (!expedienteId && ciclo.ordenServicioId) {
        const exp = await tx.expedienteDocumental.upsert({
          where: { ordenServicioId: ciclo.ordenServicioId },
          update: {},
          create: { ordenServicioId: ciclo.ordenServicioId, completo: false }
        });
        expedienteId = exp.id;
      }

      if (expedienteId) {
        await tx.documentoExpediente.create({
          data: {
            expedienteDocumentalId: expedienteId,
            categoria: categoriaDoc,
            nombreArchivo: path.basename(urlFinal),
            mimeType,
            pesoBytes,
            rutaAlmacenamiento: urlFinal,
            visibleParaCliente: true,
            fechaCarga: new Date()
          }
        });
      }

      return fotoRow;
    });

    return {
      id: foto.id,
      cicloTransporteId: ciclo.id,
      archivoUrl: foto.archivoUrl,
      descripcion: foto.descripcion,
      registrado: true
    };
  }

  /**
   * 4. Acta de Recepción Conforme, Observaciones o Sin Firma:
   * - Decodifica firma y/o foto de respaldo si existen hacia disco.
   * - Inserta o actualiza ActaRecepcion.
   * - Actualiza CicloTransporte.estado a RETIRO_COMPLETADO y horaSalidaFaena.
   * - Sincroniza OrdenServicio.estado a EJECUTADA.
   * - Indexa en DocumentoExpediente bajo categoría ACTA_RECEPCION_FIRMADA.
   */
  static async finalizarRecepcion(input: FinalizarRecepcionInput) {
    if (input.tipoRecepcion === TipoRecepcion.CONFORME && (!input.firmaSvg || input.firmaSvg.trim() === '')) {
      throw new Error('Para recepción conforme se requiere la firma digital del cliente.');
    }

    if (input.tipoRecepcion !== TipoRecepcion.CONFORME && (!input.observaciones || input.observaciones.trim() === '')) {
      throw new Error('Para recepción con observaciones o rechazo de firma se debe ingresar una justificación detallada.');
    }

    const ciclo = await prisma.cicloTransporte.findUnique({
      where: { id: input.cicloTransporteId },
      include: {
        ordenServicio: {
          include: { expediente: true }
        }
      }
    });

    if (!ciclo) {
      throw new Error(`Ciclo de transporte no encontrado: ${input.cicloTransporteId}`);
    }

    // Persistir firma si existe
    let urlFirma = input.firmaSvg || null;
    if (input.firmaSvg) {
      if (input.firmaSvg.startsWith('data:')) {
        const savedFirma = await fileStorageService.guardarBase64(
          input.firmaSvg,
          'ciclo-transporte/actas',
          'acta_firma'
        );
        urlFirma = savedFirma.urlRelativa;
      } else if (input.firmaSvg.startsWith('<svg') || input.firmaSvg.startsWith('<?xml')) {
        const svgBase64 = 'data:image/svg+xml;base64,' + Buffer.from(input.firmaSvg).toString('base64');
        const savedFirma = await fileStorageService.guardarBase64(
          svgBase64,
          'ciclo-transporte/actas',
          'acta_firma'
        );
        urlFirma = savedFirma.urlRelativa;
      }
    }

    // Persistir foto de respaldo si existe
    let urlRespaldo = input.fotoRespaldoUrl || null;
    if (input.fotoRespaldoUrl && input.fotoRespaldoUrl.startsWith('data:')) {
      const savedFoto = await fileStorageService.guardarBase64(
        input.fotoRespaldoUrl,
        'ciclo-transporte/actas',
        'acta_respaldo'
      );
      urlRespaldo = savedFoto.urlRelativa;
    }

    const ahora = new Date();

    const resultado = await prisma.$transaction(async (tx) => {
      // 4.1 Upsert ActaRecepcion
      const acta = await tx.actaRecepcion.upsert({
        where: { cicloTransporteId: ciclo.id },
        update: {
          tipo: input.tipoRecepcion,
          nombreFirmante: input.nombreFirmante || null,
          rutFirmante: input.rutFirmante || null,
          firmaSvg: urlFirma,
          observaciones: input.observaciones || null,
          fotoRespaldoUrl: urlRespaldo,
          fechaHoraFirma: ahora
        },
        create: {
          cicloTransporteId: ciclo.id,
          tipo: input.tipoRecepcion,
          nombreFirmante: input.nombreFirmante || null,
          rutFirmante: input.rutFirmante || null,
          firmaSvg: urlFirma,
          observaciones: input.observaciones || null,
          fotoRespaldoUrl: urlRespaldo,
          fechaHoraFirma: ahora
        }
      });

      // 4.2 Actualizar CicloTransporte
      const cicloActualizado = await tx.cicloTransporte.update({
        where: { id: ciclo.id },
        data: {
          horaSalidaFaena: ahora,
          estado: EstadoCicloTransporte.RETIRO_COMPLETADO
        }
      });

      // 4.3 Sincronizar OrdenServicio
      if (ciclo.ordenServicioId) {
        await tx.ordenServicio.update({
          where: { id: ciclo.ordenServicioId },
          data: {
            estado: EstadoOrdenServicio.EJECUTADA
          }
        });
      }

      // 4.4 Indexar en DocumentoExpediente
      let expedienteId = ciclo.ordenServicio?.expediente?.id;
      if (!expedienteId && ciclo.ordenServicioId) {
        const exp = await tx.expedienteDocumental.upsert({
          where: { ordenServicioId: ciclo.ordenServicioId },
          update: {},
          create: { ordenServicioId: ciclo.ordenServicioId, completo: false }
        });
        expedienteId = exp.id;
      }

      if (expedienteId && (urlFirma || urlRespaldo)) {
        await tx.documentoExpediente.create({
          data: {
            expedienteDocumentalId: expedienteId,
            categoria: CategoriaDocumento.ACTA_RECEPCION_FIRMADA,
            nombreArchivo: path.basename((urlFirma || urlRespaldo)!),
            mimeType: 'image/png',
            pesoBytes: 1024,
            rutaAlmacenamiento: (urlFirma || urlRespaldo)!,
            visibleParaCliente: true,
            fechaCarga: ahora
          }
        });
      }

      return { acta, cicloActualizado };
    });

    return {
      cicloTransporteId: ciclo.id,
      estado: resultado.cicloActualizado.estado,
      actaRecepcion: {
        id: resultado.acta.id,
        tipo: resultado.acta.tipo,
        nombreFirmante: resultado.acta.nombreFirmante,
        rutFirmante: resultado.acta.rutFirmante,
        observaciones: resultado.acta.observaciones,
        firmaSvg: resultado.acta.firmaSvg,
        fotoRespaldoUrl: resultado.acta.fotoRespaldoUrl,
        fechaHoraFirma: resultado.acta.fechaHoraFirma
      },
      mensaje: 'Retiro en faena completado exitosamente.'
    };
  }
}
