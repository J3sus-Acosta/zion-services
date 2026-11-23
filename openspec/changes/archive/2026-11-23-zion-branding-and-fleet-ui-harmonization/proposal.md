# Proposal: zion-branding-and-fleet-ui-harmonization

## Why

Este proyecto es un software desarrollado específicamente para el cliente **Zion Services** (`Zion Services — Gestión Operacional`). En iteraciones anteriores se introdujeron referencias a la marca "SATEM" en textos visibles al usuario, modales, alertas, cookies de sesión, plantillas PDF y encabezados, lo cual compromete la identidad corporativa y la exclusividad del desarrollo para el cliente final.

Asimismo, el módulo de **Flota** (`FleetManagementPanel.tsx`) adoptó estilos aislados y clases heterogéneas que desentonan con la estética minimalista, limpia y consistente implementada en los módulos de Administración de Usuarios, Clientes, Comercial y Portal del Cliente. Es necesario armonizar la interfaz del módulo Flota con los componentes canónicos minimalistas (`Card`, `Button`, `Badge`, `table-container`, etc.) y remover exhaustivamente el término "SATEM" de todo el frontend y backend.

## What Changes

- **Erradicación Total de Referencias a "SATEM"**:
  - Reemplazar en frontend todos los textos, loaders, títulos de modales, alertas y pie de página que mencionan "SATEM" por la marca del cliente **"Zion Services"** o terminología operativa neutra.
  - Actualizar el nombre de la cookie de autenticación de `satem_auth_token` a `zion_auth_token` (manteniendo compatibilidad transitoria si existiera sesión activa).
  - Renombrar constantes de estilo en backend y frontend (ej. `SATEM_COLORS` → `ZION_COLORS`, clases CSS `.satem-table` → `.zion-table` / `.table`, `.satem-calendar-root` → `.calendar-root`).
  - Actualizar los documentos oficiales en PDF (Orden de Servicio, Guía de Despacho, Acta de Recepción Conforme, Orden de Trabajo) para que el pie de página rece: `DOCUMENTO ELECTRÓNICO OFICIAL - ZION SERVICES` y la verificación QR certifique autenticidad ante Zion Services.
  - Eliminar menciones a SATEM de comentarios visibles, logs de consola y respuestas de API (`Documento no registrado en Zion Services`).
- **Armonización de UI del Módulo de Flota al Diseño Minimalista**:
  - Refactorizar `FleetManagementPanel.tsx`, `FleetFormModal.tsx`, `FleetStatusDialog.tsx` y `FleetTransferDialog.tsx` para ajustarse al lenguaje visual minimalista de la aplicación (idéntico al de `ClientManagementView` y `UserManagementPanel`).
  - Utilizar componentes canónicos de interfaz (`Card`, `CardHeader`, `CardTitle`, `CardContent`, `Button`, `Badge`, inputs estándar y modales con backdrop consistente).
  - Eliminar estilos inline redundantes y tablas no homogéneas, integrando la tabla minimalista con hover sutil, tipografía limpia y badges de estado estándar (`HABILITADO` / `DESHABILITADO`).

## Capabilities

### Modified Capabilities
- `fleet-management`: Adaptación completa de las pantallas de gestión de flota (listado, filtros, modales de alta/edición, habilitación y transferencia) al diseño minimalista unificado de Zion Services, eliminando cualquier vestigio de marcas externas.
- `official-document-generation`: Actualización del membrete y pie de firma institucional en los PDFs generados para certificar exclusivamente a Zion Services como emisor del documento oficial.
- `user-auth`: Actualización del mecanismo de cookies de autenticación (`zion_auth_token`) y mensajes de carga y cierre de sesión limpios de referencias a SATEM.

## Impact

- **Frontend**:
  - `frontend/src/App.tsx`: Actualización de textos de carga de sesión, logout y títulos.
  - `frontend/src/components/fleet/FleetManagementPanel.tsx` y diálogos modales: Rediseño visual minimalista con `Card`, `Badge` y `Button`.
  - `frontend/src/components/admin/ClientManagementView.tsx`, `ClientPortalView.tsx`, `CommercialManagementView.tsx`, `OverrideWarningDialog.tsx`, `ServiceCalendar.tsx`, `TouchSignaturePad.tsx`: Reemplazo de etiquetas y textos con "SATEM".
  - `frontend/src/index.css`: Limpieza de comentarios y clases `.satem-table` → soporte para `.table` / `.zion-table`.
  - `frontend/src/config/api.ts`, `frontend/src/services/fleetApi.ts`, `frontend/src/services/offline-storage.ts`: Textos de error y logs limpios.
- **Backend**:
  - `backend/src/routes/auth.routes.ts`, `backend/src/middleware/auth.middleware.ts`, `backend/src/services/auth.security.test.ts`: Uso de `zion_auth_token`.
  - `backend/src/services/document-generator.service.ts`: `ZION_COLORS`, pie institucional `ZION SERVICES`.
  - `backend/src/routes/documentos.routes.ts`: Mensaje de error de verificación de documentos neutro para Zion Services.
