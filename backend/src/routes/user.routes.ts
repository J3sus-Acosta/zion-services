import { Router, Response, NextFunction } from 'express';
import { UserManagementService } from '../services/user-management.service.js';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RolUsuario } from '@prisma/client';

export const userRouter = Router();

// Middleware: solo SUPERADMIN y ADMIN pueden gestionar usuarios
userRouter.use(authenticate);
userRouter.use(authorize(RolUsuario.SUPERADMIN, RolUsuario.ADMIN));

// GET /api/usuarios
userRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rol = req.query.rol as RolUsuario | undefined;
    const activo = req.query.activo !== undefined ? req.query.activo === 'true' : undefined;
    const empresaClienteId = req.query.empresaClienteId as string | undefined;
    const busqueda = req.query.busqueda as string | undefined;

    const usuarios = await UserManagementService.listarUsuarios({
      rol,
      activo,
      empresaClienteId,
      busqueda
    });

    res.status(200).json({ data: { usuarios } });
  } catch (error) {
    next(error);
  }
});

// POST /api/usuarios
userRouter.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const usuario = await UserManagementService.crearUsuario(req.body);
    res.status(201).json({ data: { usuario } });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        error: { code: error.code || 'VALIDATION_ERROR', message: error.message }
      });
      return;
    }
    next(error);
  }
});

// PUT /api/usuarios/:id
userRouter.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const usuario = await UserManagementService.actualizarUsuario(req.params.id, req.body);
    res.status(200).json({ data: { usuario } });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        error: { code: error.code || 'UPDATE_ERROR', message: error.message }
      });
      return;
    }
    next(error);
  }
});

// PATCH /api/usuarios/:id/estado
userRouter.patch('/:id/estado', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { activo } = req.body;
    if (typeof activo !== 'boolean') {
      res.status(400).json({
        error: { code: 'INVALID_PARAM', message: 'El campo "activo" debe ser booleano.' }
      });
      return;
    }
    const usuario = await UserManagementService.cambiarEstado(req.params.id, activo);
    res.status(200).json({ data: { usuario } });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        error: { code: error.code || 'STATUS_ERROR', message: error.message }
      });
      return;
    }
    next(error);
  }
});
