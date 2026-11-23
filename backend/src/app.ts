import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { logger } from './utils/logger.js';

import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { trackingRouter } from './routes/tracking.routes.js';
import { inspeccionRouter } from './routes/inspeccion.routes.js';
import { cicloTransporteRouter } from './routes/ciclo-transporte.routes.js';
import { solicitudesRouter } from './routes/solicitudes.routes.js';
import { ordenesRouter } from './routes/ordenes.routes.js';
import { expedienteRouter } from './routes/expediente.routes.js';
import { flotaRouter } from './routes/flota.routes.js';
import { conductorRouter } from './routes/conductor.routes.js';
import { planningRouter } from './routes/planning.routes.js';
import { empresaClienteRouter } from './routes/empresa-cliente.routes.js';
import { sucursalRouter } from './routes/sucursal.routes.js';
import { documentosRouter } from './routes/documentos.routes.js';
import { bitacoraRouter } from './routes/bitacora.routes.js';

export const app = express();
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(cookieParser(process.env.COOKIE_SECRET || 'zion_default_secret'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'zion-services-backend',
    timestamp: new Date().toISOString()
  });
});

// Root info
app.get('/api', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'Zion Services API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rutas de API
app.use('/api/auth', authRouter);
app.use('/api/usuarios', userRouter);
app.use('/api/inspecciones', inspeccionRouter);
app.use('/api/ciclo-transporte', cicloTransporteRouter);
app.use('/api/solicitudes', solicitudesRouter);
app.use('/api/ordenes', ordenesRouter);
app.use('/api/expedientes', expedienteRouter);
app.use('/api/flota', flotaRouter);
app.use('/api/conductores', conductorRouter);
app.use('/api/planning', planningRouter);
app.use('/api/empresas-clientes', empresaClienteRouter);
app.use('/api/sucursales', sucursalRouter);
app.use('/api/documentos', documentosRouter);
app.use('/api/bitacora', bitacoraRouter);
app.use('/api', trackingRouter);

// Manejo centralizado de errores
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Error no controlado en endpoint', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error interno en el servidor.'
    }
  });
});

export default app;
