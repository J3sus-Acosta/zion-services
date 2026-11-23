import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ClienteService, ClienteError } from '../services/cliente.service.js';
import {
  createEmpresaClienteSchema,
  updateEmpresaClienteSchema,
  createSucursalSchema,
  updateSucursalSchema,
  clientePaginationQuerySchema
} from '../validators/cliente.validator.js';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class ClienteController {
  private static handleZodError(error: ZodError, res: Response): void {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.errors[0]?.message || 'Error de validación de datos de entrada.',
        details: error.errors.map((e) => ({
          campo: e.path.join('.'),
          mensaje: e.message
        }))
      }
    });
  }

  private static handleError(error: unknown, res: Response, fallbackMessage: string): void {
    if (error instanceof ZodError) {
      ClienteController.handleZodError(error, res);
      return;
    }

    if (error instanceof ClienteError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
      return;
    }

    const err = error as Error;
    logger.error(fallbackMessage, { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: fallbackMessage
      }
    });
  }

  // -------------------------------------------------------------
  // CONTROLADORES DE EMPRESAS CLIENTES
  // -------------------------------------------------------------

  /**
   * GET /api/empresas-clientes
   */
  static async listarEmpresas(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const parsedQuery = clientePaginationQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        ClienteController.handleZodError(parsedQuery.error, res);
        return;
      }

      const result = await ClienteService.listarEmpresas(parsedQuery.data);
      res.status(200).json({
        success: true,
        data: result.empresas,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      ClienteController.handleError(error, res, 'Error al listar las empresas clientes.');
    }
  }

  /**
   * GET /api/empresas-clientes/:id
   */
  static async obtenerEmpresaPorId(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresa = await ClienteService.obtenerEmpresaPorId(id);
      res.status(200).json({
        success: true,
        data: empresa
      });
    } catch (error) {
      ClienteController.handleError(error, res, 'Error al obtener detalle de la empresa cliente.');
    }
  }

  /**
   * POST /api/empresas-clientes
   */
  static async crearEmpresa(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const parsed = createEmpresaClienteSchema.safeParse(req.body);
      if (!parsed.success) {
        ClienteController.handleZodError(parsed.error, res);
        return;
      }

      const empresa = await ClienteService.crearEmpresa(parsed.data);
      res.status(201).json({
        success: true,
        data: empresa
      });
    } catch (error) {
      ClienteController.handleError(error, res, 'Error al crear la empresa cliente.');
    }
  }

  /**
   * PUT /api/empresas-clientes/:id
   */
  static async actualizarEmpresa(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = updateEmpresaClienteSchema.safeParse(req.body);
      if (!parsed.success) {
        ClienteController.handleZodError(parsed.error, res);
        return;
      }

      const actualizada = await ClienteService.actualizarEmpresa(id, parsed.data);
      res.status(200).json({
        success: true,
        data: actualizada
      });
    } catch (error) {
      ClienteController.handleError(error, res, 'Error al actualizar la empresa cliente.');
    }
  }

  /**
   * DELETE /api/empresas-clientes/:id
   */
  static async eliminarEmpresa(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const eliminada = await ClienteService.eliminarEmpresa(id);
      res.status(200).json({
        success: true,
        message: 'Empresa cliente desactivada exitosamente.',
        data: eliminada
      });
    } catch (error) {
      ClienteController.handleError(error, res, 'Error al eliminar la empresa cliente.');
    }
  }

  // -------------------------------------------------------------
  // CONTROLADORES DE SUCURSALES / FAENAS
  // -------------------------------------------------------------

  /**
   * GET /api/sucursales
   */
  static async listarSucursales(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const parsedQuery = clientePaginationQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        ClienteController.handleZodError(parsedQuery.error, res);
        return;
      }

      const result = await ClienteService.listarSucursales(parsedQuery.data);
      res.status(200).json({
        success: true,
        data: result.sucursales,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      ClienteController.handleError(error, res, 'Error al listar sucursales.');
    }
  }

  /**
   * GET /api/sucursales/:id
   */
  static async obtenerSucursalPorId(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const sucursal = await ClienteService.obtenerSucursalPorId(id);
      res.status(200).json({
        success: true,
        data: sucursal
      });
    } catch (error) {
      ClienteController.handleError(error, res, 'Error al obtener detalle de la sucursal.');
    }
  }

  /**
   * POST /api/sucursales
   */
  static async crearSucursal(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const parsed = createSucursalSchema.safeParse(req.body);
      if (!parsed.success) {
        ClienteController.handleZodError(parsed.error, res);
        return;
      }

      const sucursal = await ClienteService.crearSucursal(parsed.data);
      res.status(201).json({
        success: true,
        data: sucursal
      });
    } catch (error) {
      ClienteController.handleError(error, res, 'Error al crear la sucursal.');
    }
  }

  /**
   * PUT /api/sucursales/:id
   */
  static async actualizarSucursal(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = updateSucursalSchema.safeParse(req.body);
      if (!parsed.success) {
        ClienteController.handleZodError(parsed.error, res);
        return;
      }

      const actualizada = await ClienteService.actualizarSucursal(id, parsed.data);
      res.status(200).json({
        success: true,
        data: actualizada
      });
    } catch (error) {
      ClienteController.handleError(error, res, 'Error al actualizar la sucursal.');
    }
  }

  /**
   * DELETE /api/sucursales/:id
   */
  static async eliminarSucursal(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const eliminada = await ClienteService.eliminarSucursal(id);
      res.status(200).json({
        success: true,
        message: 'Sucursal faena desactivada exitosamente.',
        data: eliminada
      });
    } catch (error) {
      ClienteController.handleError(error, res, 'Error al eliminar la sucursal.');
    }
  }
}
