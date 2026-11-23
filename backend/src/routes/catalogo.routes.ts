import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { CatalogoController } from '../controllers/catalogo.controller.js';

export const catalogoRouter = Router();

// Todas las consultas de catálogos requieren token JWT autenticado
catalogoRouter.use(authenticate);

// Catálogo de Servicios Oficiales
catalogoRouter.get('/catalogo-servicios', CatalogoController.listarServicios);

// Catálogo de Plantas de Destino Autorizadas
catalogoRouter.get('/plantas-destino', CatalogoController.listarPlantas);
