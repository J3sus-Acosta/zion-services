# Tasks: zero-paper-official-documents

## 1. Modelado de Datos y Migración Prisma (`database-prisma`)

- [x] 1.1 Actualizar `backend/prisma/schema.prisma` agregando el modelo `BitacoraServicio`, campos de trazabilidad y verificación en `DocumentoExpediente` (`hashSha256`, `qrUrl`), y relaciones correspondientes. Verificar mediante `npx prisma validate`.
- [x] 1.2 Ejecutar migración de Prisma `npx prisma migrate dev --name add_zero_paper_and_crm_models` y comprobar la creación de tablas e índices en MySQL.
- [x] 1.3 Actualizar seed en `backend/prisma/seed.ts` con empresas clientes y sucursales de prueba estructuradas y consistentes. Verificar ejecutando `npm run seed` en backend.

## 2. Dependencias y Módulo de Gestión de Clientes (`backend-node`)

- [x] 2.1 Instalar dependencias `pdfkit`, `qrcode` y sus tipos `@types/pdfkit`, `@types/qrcode` en `backend/package.json`. Verificar con `npm ls pdfkit qrcode`.
- [x] 2.2 Crear validadores Zod en `backend/src/validators/cliente.validator.ts` con validación de RUT chileno (algoritmo Módulo 11) y esquemas para creación y edición de empresas y sucursales. Verificar mediante tests unitarios en `backend/test/validators/cliente.validator.spec.ts`.
- [x] 2.3 Implementar servicios y controladores en `backend/src/services/cliente.service.ts` y `backend/src/controllers/cliente.controller.ts` para CRUD de empresas clientes y sucursales con soporte de paginación y búsqueda. Verificar con tests de integración.
- [x] 2.4 Montar rutas REST en `backend/src/routes/empresa-cliente.routes.ts` y `backend/src/routes/sucursal.routes.ts` protegidas con JWT y matriz RBAC, y limpiar los anti-patrones dummy en `solicitudes.routes.ts` y `user-management.service.ts`. Verificar con `npm test backend/test/routes/cliente.routes.spec.ts`.

## 3. Motor de Generación PDF y Código QR Oficial (`backend-node`)

- [x] 3.1 Implementar servicio de generación de códigos QR y cálculo de hash en `backend/src/services/qr-verification.service.ts`. Verificar con tests unitarios.
- [x] 3.2 Implementar motor de plantillas PDF en `backend/src/services/document-generator.service.ts` para Orden de Servicio (OS) y Guía de Despacho (GD) con membrete oficial SATEM. Verificar generación de buffer y guardado en disco.
- [x] 3.3 Implementar persistencia de firma táctil y renderizado del Acta de Recepción Conforme (ARC) y Orden de Trabajo (OT) con firma y código QR estampados en `backend/src/services/document-generator.service.ts`. Verificar con tests de integración.
- [x] 3.4 Implementar endpoint público de verificación `GET /api/documentos/verificar/:hash` en `backend/src/routes/documentos.routes.ts` accesible sin autenticación previa. Verificar con test de respuesta JSON de autenticidad.

## 4. Normalización de Expedientes y Descarga ZIP (`backend-node`)

- [x] 4.1 Modificar `backend/src/routes/expediente.routes.ts` para implementar endpoint de descarga individual de archivos y eliminar la generación de respaldos simulados `.txt`. Verificar que retorne error 404 si el archivo no existe físicamente en lugar de un mock.
- [x] 4.2 Actualizar el streaming ZIP en `expediente.routes.ts` para empaquetar exclusivamente los PDFs oficiales generados, manifiesto y fotografías reales. Verificar descargando un ZIP de prueba y validando su integridad.

## 5. Bitácora de Terreno y Anti-WhatsApp (`backend-node`)

- [x] 5.1 Implementar `backend/src/services/bitacora.service.ts` y rutas en `backend/src/routes/bitacora.routes.ts` para registro de incidencias tipificadas (`TRAFICO`, `ACCESO_DENEGADO`, `FALLA_EQUIPO`, `VOLUMEN_DISCREPANTE`) con coordenadas GPS y foto. Verificar con tests unitarios.
- [x] 5.2 Conectar la bitácora con el sistema de notificaciones inmediatas para alertar a Operaciones y al Cliente. Verificar emisión de eventos.

## 6. Frontend: CRM de Clientes, Plantillas y Normalización API (`frontend-react`)

- [x] 6.1 Crear módulo de configuración `frontend/src/config/api.ts` para usar dinámicamente `import.meta.env.VITE_API_URL` y reemplazar todas las URLs hardcodeadas con `localhost:3000`. Verificar mediante búsqueda de texto que no queden referencias a `localhost:3000`.
- [x] 6.2 Implementar vista `frontend/src/components/admin/ClientManagementView.tsx` para listar, crear y editar Empresas Clientes y Sucursales bajo el SATEM Design System. Verificar navegación y renderizado responsive.
- [x] 6.3 Implementar componentes reutilizables `EmpresaSelect.tsx` y `SucursalSelect.tsx` e integrarlos en `UserManagementPanel.tsx` y `MultiServiceRequestWizard.tsx`, eliminando las constantes hardcodeadas. Verificar comportamiento del autocompletado.
- [x] 6.4 Integrar en `TabletConductorView.tsx` los botones de reporte rápido de incidencias ("Tráfico", "Acceso Denegado", etc.) con almacenamiento offline en IndexedDB. Verificar persistencia local y sincronización.
- [x] 6.5 Integrar en `ClientPortalView.tsx` el timeline de la bitácora en vivo y los botones de descarga directa de los PDFs oficiales generados. Verificar descarga individual y de ZIP en el navegador.

## 7. Pruebas Integrales, Seguridad y Verificación DevOps (`tester`, `security-reviewer`, `devops`)

- [x] 7.1 Ejecutar suite completa de tests automatizados (`npm test` en backend) asegurando 100% de éxito en tests unitarios e integración.
- [x] 7.2 Auditar aislamiento por cliente (Tenant Isolation) en todas las rutas nuevas de clientes, sucursales y expedientes. Verificar rechazo 403 ante acceso cruzado.
- [x] 7.3 Ejecutar build de producción en backend y frontend (`npm run build`). Verificar que no existan errores ni advertencias de tipos en TypeScript strict mode.

## Workflow follow-up

- Ejecutar `openspec-apply-change zero-paper-official-documents` para orquestar la implementación con el SATEM Orchestrator.
- Archivar el cambio con `openspec-archive-change` una vez completadas y verificadas todas las tareas.
