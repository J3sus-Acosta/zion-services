import { Router, Response } from 'express';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RolUsuario, CategoriaDocumento } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { DossierIndexService, RegistrarDocumentoExpedienteInput } from '../services/dossier-index.service.js';

export const expedienteRouter = Router();

expedienteRouter.use(authenticate);

/**
 * GET /api/expedientes/:ordenId/en-vivo
 * Consulta del expediente documental y evidencias en tiempo real (CU-26)
 * Cumple con el requerimiento de centralizar fotos y documentos sin galería separada.
 */
expedienteRouter.get('/:ordenId/en-vivo', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ordenId = req.params.ordenId;

    const orden = await prisma.ordenServicio.findFirst({
      where: {
        OR: [
          { id: ordenId },
          { folio: ordenId }
        ]
      },
      include: {
        solicitudServicio: {
          include: {
            empresaCliente: true,
            sucursalFaena: true
          }
        },
        cicloTransporte: true,
        expediente: {
          include: {
            documentos: {
              orderBy: { fechaCarga: 'desc' }
            }
          }
        }
      }
    });

    if (!orden) {
      res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Orden de servicio no encontrada.' }
      });
      return;
    }

    // Tenant Isolation
    if (req.user?.rol === RolUsuario.CLIENTE && orden.solicitudServicio.empresaClienteId !== req.user.empresaClienteId) {
      res.status(403).json({
        error: { code: 'TENANT_ISOLATION_VIOLATION', message: 'Acceso denegado a este expediente.' }
      });
      return;
    }

    // Asegurar expediente si no existe
    let expediente = orden.expediente;
    if (!expediente) {
      expediente = await prisma.expedienteDocumental.create({
        data: {
          ordenServicioId: orden.id
        },
        include: { documentos: true }
      });
    }

    // Filtrar visibilidad para cliente si corresponde
    let docs = expediente.documentos;
    if (req.user?.rol === RolUsuario.CLIENTE) {
      docs = docs.filter(d => d.visibleParaCliente);
    }

    // Agrupación de evidencias para vista técnica unificada
    const fotocats: CategoriaDocumento[] = [
      CategoriaDocumento.FOTO_CAMION_SALIDA,
      CategoriaDocumento.FOTO_FAENA_PROCESO,
      CategoriaDocumento.FOTO_EPP_SEGURIDAD,
      CategoriaDocumento.FOTO_CAMION_RETORNO
    ];
    const fotografias = docs.filter(d => fotocats.includes(d.categoria));

    const actacats: CategoriaDocumento[] = [
      CategoriaDocumento.ORDEN_SERVICIO_PDF,
      CategoriaDocumento.CHECKLIST_SALIDA_F_GMT,
      CategoriaDocumento.ACTA_RECEPCION_FIRMADA,
      CategoriaDocumento.GUIA_DESPACHO_CLIENTE
    ];
    const actasYFirmas = docs.filter(d => actacats.includes(d.categoria));

    const certcats: CategoriaDocumento[] = [
      CategoriaDocumento.SIDREP_VENTANILLA_UNICA,
      CategoriaDocumento.SIDREP_SELLADO_ROMANA,
      CategoriaDocumento.TICKET_PESAJE_ROMANA
    ];
    const certificadosYDisposicion = docs.filter(d => certcats.includes(d.categoria));

    res.status(200).json({
      data: {
        ordenServicioId: orden.id,
        folio: orden.folio,
        estado: orden.estado,
        cliente: {
          razonSocial: orden.solicitudServicio.empresaCliente.razonSocial,
          rut: orden.solicitudServicio.empresaCliente.rut,
          sucursal: orden.solicitudServicio.sucursalFaena.nombre
        },
        expedienteCompleto: expediente.completo,
        totalDocumentos: docs.length,
        totalFotografias: fotografias.length,
        documentos: docs,
        secciones: {
          fotografiasEnVivo: fotografias,
          actasYFirmas,
          certificadosYDisposicion
        },
        descargaDisponible: docs.length > 0
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: { code: 'DOSSIER_ERROR', message: error.message }
    });
  }
});

/**
 * GET /api/expedientes/:ordenId/descargar-zip
 * Descarga de paquete consolidado ZIP con todas las evidencias y actas vía streaming (archiver)
 */
expedienteRouter.get('/:ordenId/descargar-zip', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ordenId = req.params.ordenId;

    const orden = await prisma.ordenServicio.findFirst({
      where: {
        OR: [
          { id: ordenId },
          { folio: ordenId }
        ]
      },
      include: {
        solicitudServicio: { include: { empresaCliente: true } },
        expediente: { include: { documentos: true } }
      }
    });

    if (!orden) {
      res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Orden de servicio no encontrada.' }
      });
      return;
    }

    // Tenant Isolation
    if (req.user?.rol === RolUsuario.CLIENTE && orden.solicitudServicio.empresaClienteId !== req.user.empresaClienteId) {
      res.status(403).json({
        error: { code: 'TENANT_ISOLATION_VIOLATION', message: 'Acceso denegado a este expediente.' }
      });
      return;
    }

    const expediente = orden.expediente;
    const docs = expediente?.documentos || [];

    const zipFilename = `Expediente_${orden.folio}_${Date.now()}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', () => {
      res.status(500).end();
    });

    archive.pipe(res);

    // Agregar manifiesto del expediente en formato JSON
    const manifiesto = {
      folioOrden: orden.folio,
      empresaCliente: orden.solicitudServicio.empresaCliente.razonSocial,
      fechaEmisionPaquete: new Date().toISOString(),
      totalDocumentosIndexados: docs.length,
      documentos: docs.map(d => ({
        categoria: d.categoria,
        nombreArchivo: d.nombreArchivo,
        pesoBytes: d.pesoBytes,
        fechaCarga: d.fechaCarga
      }))
    };
    archive.append(JSON.stringify(manifiesto, null, 2), { name: `MANIFIESTO_${orden.folio}.json` });

    // Agregar exclusivamente archivos físicos reales existentes en disco (sin mocks ni archivos simulados)
    for (const doc of docs) {
      const filePath = path.isAbsolute(doc.rutaAlmacenamiento)
        ? doc.rutaAlmacenamiento
        : path.resolve(process.cwd(), doc.rutaAlmacenamiento);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `${doc.categoria}/${doc.nombreArchivo}` });
      }
    }

    await archive.finalize();
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({
        error: { code: 'STREAMING_ZIP_ERROR', message: error.message }
      });
    }
  }
});

/**
 * GET /api/expedientes/:ordenId/documentos/:documentoId/descargar
 * Descarga individual de un documento o evidencia oficial del expediente
 * Con validación estricta de Tenant Isolation y verificación de existencia física en disco (sin mocks)
 */
expedienteRouter.get('/:ordenId/documentos/:documentoId/descargar', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ordenId, documentoId } = req.params;

    const orden = await prisma.ordenServicio.findFirst({
      where: {
        OR: [
          { id: ordenId },
          { folio: ordenId }
        ]
      },
      include: {
        solicitudServicio: { include: { empresaCliente: true } },
        expediente: true
      }
    });

    if (!orden) {
      res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Orden de servicio no encontrada.' }
      });
      return;
    }

    // Tenant Isolation
    if (req.user?.rol === RolUsuario.CLIENTE && orden.solicitudServicio.empresaClienteId !== req.user.empresaClienteId) {
      res.status(403).json({
        error: { code: 'TENANT_ISOLATION_VIOLATION', message: 'Acceso denegado a este expediente.' }
      });
      return;
    }

    if (!orden.expediente) {
      res.status(404).json({
        error: { code: 'DOSSIER_NOT_FOUND', message: 'La orden no tiene un expediente documental asociado.' }
      });
      return;
    }

    const documento = await prisma.documentoExpediente.findFirst({
      where: {
        id: documentoId,
        expedienteDocumentalId: orden.expediente.id
      }
    });

    if (!documento) {
      res.status(404).json({
        error: { code: 'DOCUMENT_NOT_FOUND', message: 'El documento no existe en el expediente especificado.' }
      });
      return;
    }

    if (req.user?.rol === RolUsuario.CLIENTE && !documento.visibleParaCliente) {
      res.status(403).json({
        error: { code: 'DOCUMENT_RESTRICTED', message: 'Este documento es de uso interno operacional.' }
      });
      return;
    }

    const filePath = path.isAbsolute(documento.rutaAlmacenamiento)
      ? documento.rutaAlmacenamiento
      : path.resolve(process.cwd(), documento.rutaAlmacenamiento);

    // Validación física estricta en disco: NUNCA generar un archivo simulado o mock
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        error: { code: 'FILE_NOT_FOUND', message: 'El archivo físico del documento no existe en el servidor.' }
      });
      return;
    }

    res.download(filePath, documento.nombreArchivo);
  } catch (error: any) {
    res.status(500).json({
      error: { code: 'DOWNLOAD_ERROR', message: error.message }
    });
  }
});

/**
 * POST /api/expedientes/:ordenId/documentos
 * Indexación inmediata de un documento o evidencia en el expediente de la orden
 */
expedienteRouter.post('/:ordenId/documentos', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ordenId = req.params.ordenId;
    const { categoria, nombreArchivo, mimeType, pesoBytes, rutaAlmacenamiento, visibleParaCliente } = req.body;

    const orden = await prisma.ordenServicio.findFirst({
      where: {
        OR: [
          { id: ordenId },
          { folio: ordenId }
        ]
      },
      include: { expediente: true }
    });

    if (!orden) {
      res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Orden de servicio no encontrada.' }
      });
      return;
    }

    let expediente = orden.expediente;
    if (!expediente) {
      expediente = await prisma.expedienteDocumental.create({
        data: { ordenServicioId: orden.id }
      });
    }

    const inputVal: RegistrarDocumentoExpedienteInput = {
      expedienteId: expediente.id,
      categoria,
      nombreArchivo,
      mimeType: mimeType || 'image/jpeg',
      pesoBytes: Number(pesoBytes) || 1024,
      rutaAlmacenamiento: rutaAlmacenamiento || `/uploads/${nombreArchivo}`,
      cargadoPorUsuarioId: req.user?.userId,
      visibleParaCliente: visibleParaCliente ?? true
    };

    const validado = DossierIndexService.indexarDocumento(inputVal);

    const docCreado = await prisma.documentoExpediente.create({
      data: {
        expedienteDocumentalId: expediente.id,
        categoria: validado.categoria,
        nombreArchivo: validado.nombreArchivo,
        mimeType: validado.mimeType,
        pesoBytes: validado.pesoBytes,
        rutaAlmacenamiento: validado.rutaAlmacenamiento,
        cargadoPorUsuarioId: inputVal.cargadoPorUsuarioId || null,
        visibleParaCliente: validado.visibleParaCliente
      }
    });

    res.status(201).json({
      data: docCreado
    });
  } catch (error: any) {
    res.status(400).json({
      error: { code: 'INDEX_ERROR', message: error.message }
    });
  }
});
