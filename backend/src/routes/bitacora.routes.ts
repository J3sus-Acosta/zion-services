import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { RolUsuario } from '@prisma/client';
import { BitacoraController } from '../controllers/bitacora.controller.js';

export const bitacoraRouter = Router();

// Middleware de autenticación global para bitácora de terreno
bitacoraRouter.use(authenticate);

// 1. POST /api/bitacora - Registro de incidencia en terreno
bitacoraRouter.post(
  '/',
  authorize(
    RolUsuario.CONDUCTOR,
    RolUsuario.OPERACIONES,
    RolUsuario.JEFE_OPERACIONES,
    RolUsuario.ADMIN,
    RolUsuario.SUPERADMIN,
    RolUsuario.COMERCIAL
  ),
  BitacoraController.registrarEvento
);

// 2. POST /api/bitacora/:ordenId - Registro de incidencia con ordenId en path
bitacoraRouter.post(
  '/:ordenId',
  authorize(
    RolUsuario.CONDUCTOR,
    RolUsuario.OPERACIONES,
    RolUsuario.JEFE_OPERACIONES,
    RolUsuario.ADMIN,
    RolUsuario.SUPERADMIN,
    RolUsuario.COMERCIAL
  ),
  BitacoraController.registrarEvento
);

// 3. GET /api/bitacora/:ordenId - Consulta del timeline de bitácora
bitacoraRouter.get(
  '/:ordenId',
  authorize(
    RolUsuario.CONDUCTOR,
    RolUsuario.OPERACIONES,
    RolUsuario.JEFE_OPERACIONES,
    RolUsuario.ADMIN,
    RolUsuario.SUPERADMIN,
    RolUsuario.COMERCIAL,
    RolUsuario.CLIENTE
  ),
  BitacoraController.obtenerTimeline
);
