import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  flotaGetRateLimiter,
  flotaMutationRateLimiter
} from '../middleware/rate-limit.middleware.js';
import {
  FleetService,
  FleetError,
  ROLES_GESTION_FLOTA
} from '../services/fleet.service.js';
import {
  CrearEquipoSchema,
  EditarEquipoSchema,
  CambiarEstadoSchema,
  TransferirJornadasSchema,
  ListarFlotaQuerySchema,
  UUIDParamSchema
} from '../schemas/fleet.schema.js';
import { ZodError } from 'zod';

export const flotaRouter = Router();

// 1. Autenticación y Autorización para todo el catálogo de flota
flotaRouter.use(authenticate);
flotaRouter.use(authorize(...ROLES_GESTION_FLOTA));

// 2. Rate Limiting por tipo de operación (D14)
flotaRouter.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.method === 'GET') {
    return flotaGetRateLimiter(req, res, next);
  }
  return flotaMutationRateLimiter(req, res, next);
});

// Función auxiliar para manejo uniforme de errores en el controller
function handleRouteError(error: any, res: Response, next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.errors[0]?.message || 'Error de validación de datos de entrada.',
        details: error.errors.map((e) => ({
          campo: e.path.join('.'),
          mensaje: e.message
        }))
      }
    });
    return;
  }

  if (error instanceof FleetError || error.statusCode) {
    res.status(error.statusCode).json({
      error: {
        code: error.code || 'FLEET_ERROR',
        message: error.message
      }
    });
    return;
  }

  next(error);
}

/**
 * GET /api/flota
 * Listar catálogo de equipos con filtros opcionales (tipoEquipo, estado, busqueda)
 */
flotaRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query = ListarFlotaQuerySchema.parse(req.query);
    const equipos = await FleetService.listar(query);
    res.status(200).json({ data: { equipos } });
  } catch (error) {
    handleRouteError(error, res, next);
  }
});

/**
 * GET /api/flota/:id
 * Detalle completo de un equipo específico
 */
flotaRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = UUIDParamSchema.parse(req.params);
    const equipo = await FleetService.obtener(id);
    res.status(200).json({ data: { equipo } });
  } catch (error) {
    handleRouteError(error, res, next);
  }
});

/**
 * POST /api/flota
 * Registrar un nuevo equipo en el catálogo
 */
flotaRouter.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const body = CrearEquipoSchema.parse(req.body);
    const actor = {
      userId: req.user?.userId,
      rol: req.user?.rol,
      ip: req.ip
    };

    const equipo = await FleetService.crear(body, actor);
    res.status(201).json({ data: { equipo } });
  } catch (error) {
    handleRouteError(error, res, next);
  }
});

/**
 * PATCH /api/flota/:id
 * Editar características de un equipo (parcial, sin admitir estado)
 */
flotaRouter.patch('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = UUIDParamSchema.parse(req.params);
    const body = EditarEquipoSchema.parse(req.body);
    const actor = {
      userId: req.user?.userId,
      rol: req.user?.rol,
      ip: req.ip
    };

    const equipo = await FleetService.editar(id, body, actor);
    res.status(200).json({ data: { equipo } });
  } catch (error) {
    handleRouteError(error, res, next);
  }
});

/**
 * GET /api/flota/:id/operaciones-afectadas
 * Previsualización de operaciones y jornadas activas con candidatos de reemplazo habilitados
 */
flotaRouter.get(
  '/:id/operaciones-afectadas',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = UUIDParamSchema.parse(req.params);
      const resultado = await FleetService.obtenerOperacionesAfectadas(id);
      res.status(200).json({ data: resultado });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  }
);

/**
 * PATCH /api/flota/:id/estado
 * Cambiar estado del equipo (HABILITADO / DESHABILITADO) con transferencia obligatoria si hay jornadas activas
 */
flotaRouter.patch('/:id/estado', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = UUIDParamSchema.parse(req.params);
    const body = CambiarEstadoSchema.parse(req.body);
    const actor = {
      userId: req.user?.userId,
      rol: req.user?.rol,
      ip: req.ip
    };

    const resultado = await FleetService.cambiarEstado(id, body, actor);
    res.status(200).json({ data: resultado });
  } catch (error) {
    handleRouteError(error, res, next);
  }
});

/**
 * POST /api/flota/:id/transferir
 * Transferir jornadas activas a otro equipo habilitado sin modificar el estado del origen
 */
flotaRouter.post(
  '/:id/transferir',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = UUIDParamSchema.parse(req.params);
      const body = TransferirJornadasSchema.parse(req.body);
      const actor = {
        userId: req.user?.userId,
        rol: req.user?.rol,
        ip: req.ip
      };

      const resultado = await FleetService.transferir(id, body, actor);
      res.status(200).json({ data: resultado });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  }
);

/**
 * Métodos no permitidos: DELETE y PUT
 */
flotaRouter.delete('*', (_req: AuthenticatedRequest, res: Response) => {
  res.status(405).json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'El método DELETE no está permitido en el catálogo de flota.'
    }
  });
});

flotaRouter.put('*', (_req: AuthenticatedRequest, res: Response) => {
  res.status(405).json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'El método PUT no está permitido. Utilice PATCH para modificaciones parciales o cambio de estado.'
    }
  });
});
