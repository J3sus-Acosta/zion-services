# Tasks: zion-branding-and-fleet-ui-harmonization

## 1. Limpieza de Marca en Backend (`backend-node`)

- [x] 1.1 Renombrar la cookie de autenticación a `zion_auth_token` en `backend/src/routes/auth.routes.ts` y asegurar soporte dual transitorio en `backend/src/middleware/auth.middleware.ts`. Verificar actualizando los tests de seguridad en `backend/src/services/auth.security.test.ts`.
- [x] 1.2 Actualizar `backend/src/services/document-generator.service.ts` eliminando `SATEM_COLORS` por `ZION_COLORS` y actualizando el pie de página institucional a `DOCUMENTO ELECTRÓNICO OFICIAL - ZION SERVICES`. Verificar con tests de generación PDF.
- [x] 1.3 Limpiar mensajes y comentarios en `backend/src/routes/documentos.routes.ts` y `backend/src/services/email.service.ts` para que no contengan el vocablo "SATEM". Verificar con búsqueda de texto en backend.

## 2. Limpieza de Marca en Frontend (`frontend-react`)

- [x] 2.1 Reemplazar en `frontend/src/App.tsx` los textos visibles "Cargando sesión SATEM..." y "Cerrar sesión segura de SATEM" por textos exclusivos de Zion Services. Verificar en código fuente.
- [x] 2.2 Reemplazar en `ClientManagementView.tsx`, `ClientPortalView.tsx`, `CommercialManagementView.tsx`, `OverrideWarningDialog.tsx`, `ServiceCalendar.tsx` y `TouchSignaturePad.tsx` toda mención o etiqueta "SATEM". Verificar con búsqueda de texto.
- [x] 2.3 Actualizar `frontend/src/config/api.ts`, `frontend/src/services/fleetApi.ts` y `frontend/src/services/offline-storage.ts` eliminando comentarios o mensajes que contengan "SATEM". Verificar con búsqueda de texto.
- [x] 2.4 Actualizar `frontend/src/index.css` renombrando comentarios y habilitando las clases unificadas `.table` y `.zion-table`. Verificar estilos en navegador.

## 3. Armonización Visual del Módulo de Flota (`frontend-react`)

- [x] 3.1 Refactorizar `frontend/src/components/fleet/FleetManagementPanel.tsx` integrando los componentes minimalistas `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Badge` y `Button`, con diseño limpio idéntico al de Clientes y Usuarios. Verificar visualmente y sin estilos discordantes.
- [x] 3.2 Adaptar los modales `FleetFormModal.tsx`, `FleetStatusDialog.tsx` y `FleetTransferDialog.tsx` para seguir el diseño de diálogo limpio y consistente del sistema. Verificar apertura, contraste y cierre.
- [x] 3.3 Eliminar del módulo de flota cualquier mención a "SATEM" (ej. "Cargando catálogo de flota SATEM..."). Verificar con búsqueda de texto.

## 4. Verificación Integral y Auditoría (`tester`, `code-reviewer`)

- [x] 4.1 Ejecutar búsqueda exhaustiva en todo el código fuente (`findstr /s /i "satem" frontend\src\* backend\src\*`) comprobando que el conteo de resultados en código ejecutable sea 0.
- [x] 4.2 Ejecutar suite completa de tests automatizados (`npm test` en backend) certificando que el 100% de los tests continúen pasando.
- [x] 4.3 Ejecutar build de producción en backend y frontend (`npm run build`) verificando ausencia de errores y tipado estricto.

## Workflow follow-up

- Ejecutar `openspec-apply-change zion-branding-and-fleet-ui-harmonization` para implementar las tareas.
- Archivar el cambio con `openspec-archive-change` una vez verificado.
