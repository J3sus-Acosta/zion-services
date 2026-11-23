import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { RolUsuario } from '@prisma/client';
import { PlanningController } from '../controllers/planning.controller.js';
import { catalogoRouter } from './catalogo.routes.js';

export const planningRouter = Router();

// Middleware de autenticación global para módulo de planificación
planningRouter.use(authenticate);

// 1. Catálogos integrados bajo el prefijo /api/planning
planningRouter.use('/', catalogoRouter);

// 2. Consulta de Agenda Operativa (Multi-Vista: mes, semana, día)
planningRouter.get(
  '/agenda',
  authorize(
    RolUsuario.COMERCIAL,
    RolUsuario.ADMIN,
    RolUsuario.JEFE_OPERACIONES,
    RolUsuario.SUPERADMIN
  ),
  PlanningController.getAgenda
);

// 3. Solicitudes Multi-Atención (Portal Clientes y Gestión Comercial)
planningRouter.post(
  '/solicitudes-multi',
  authorize(
    RolUsuario.CLIENTE,
    RolUsuario.COMERCIAL,
    RolUsuario.ADMIN,
    RolUsuario.SUPERADMIN
  ),
  PlanningController.crearSolicitudMulti
);

// 4. Asignación Operativa y Confirmación de Recursos (Generación 1:1 OS)
planningRouter.put(
  '/atenciones/:id/asignar',
  authorize(
    RolUsuario.COMERCIAL,
    RolUsuario.ADMIN,
    RolUsuario.JEFE_OPERACIONES,
    RolUsuario.SUPERADMIN
  ),
  PlanningController.asignarAtencion
);

// 5. Reasignación y Reprogramación Operativa
planningRouter.put(
  '/atenciones/:id/reasignar',
  authorize(
    RolUsuario.COMERCIAL,
    RolUsuario.ADMIN,
    RolUsuario.JEFE_OPERACIONES,
    RolUsuario.SUPERADMIN
  ),
  PlanningController.reasignarAtencion
);
