import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';

export const documentosRouter = Router();

/**
 * GET /api/documentos/verificar/:hash
 * Endpoint PÚBLICO (sin middleware de autenticación) para verificación ciudadana,
 * técnica y de fiscalización (SEREMI, Inspectores, Generadores) mediante escaneo QR.
 */
documentosRouter.get('/verificar/:hash', async (req: Request, res: Response): Promise<void> => {
  try {
    const { hash } = req.params;

    if (!hash || hash.trim().length !== 64) {
      res.status(400).json({
        valido: false,
        mensaje: 'El hash SHA-256 de verificación debe ser una cadena hexadecimal de 64 caracteres.'
      });
      return;
    }

    const documento = await prisma.documentoExpediente.findFirst({
      where: { hashSha256: hash.trim() },
      include: {
        expedienteDocumental: {
          include: {
            ordenServicio: {
              include: {
                solicitudServicio: {
                  include: {
                    empresaCliente: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!documento) {
      res.status(404).json({
        valido: false,
        mensaje: 'Documento no encontrado o no registrado en Zion Services'
      });
      return;
    }

    const ordenServicio = documento.expedienteDocumental?.ordenServicio;
    const cliente = ordenServicio?.solicitudServicio?.empresaCliente;

    logger.info('Documento verificado públicamente vía QR', {
      hash,
      documentoId: documento.id,
      categoria: documento.categoria,
      folioOrden: ordenServicio?.folio
    });

    res.status(200).json({
      valido: true,
      documento: {
        id: documento.id,
        tipo: documento.categoria,
        nombreArchivo: documento.nombreArchivo,
        hashSha256: documento.hashSha256,
        qrUrl: documento.qrUrl,
        ordenServicioId: documento.expedienteDocumental?.ordenServicioId,
        folioOrden: ordenServicio?.folio,
        fechaEmision: documento.fechaCarga,
        cliente: cliente?.razonSocial || null
      }
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error al verificar documento por hash', { error: err.message, stack: err.stack });
    res.status(500).json({
      valido: false,
      mensaje: 'Ocurrió un error interno al verificar el documento.'
    });
  }
});
