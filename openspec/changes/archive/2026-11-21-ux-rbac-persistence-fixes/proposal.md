# Proposal: UX, RBAC & Persistence Fixes

## Why

Durante las pruebas operacionales y de usabilidad en terreno sobre tablets móviles y paneles administrativos, se identificaron brechas críticas que afectan la continuidad operacional, la seguridad de acceso y la experiencia de usuario:
1. En la tablet del conductor, los datos del checklist preoperacional F-GMT-MAN-004 y las 4 fotografías perimetrales eran susceptibles de pérdida ante recargas de página o cierres accidentales de navegador durante la jornada activa, además de existir desfases en su indexación inmediata en el expediente documental.
2. En la capa de autenticación y gestión de usuarios, los usuarios carecían de un botón explícito de cierre de sesión en la cabecera principal, el panel de usuarios omitía la columna de correo electrónico y carecía de administración directa de contraseñas y roles, y faltaba formalizar el rol `COMERCIAL` en la matriz de RBAC para la gestión de solicitudes, órdenes y estados de pago.
3. En el Portal de Clientes, el cambio a Modo Claro (Light Mode) presentaba problemas de contraste y legibilidad al no sincronizar adecuadamente los tokens semánticos del SATEM Design System, y se requería asegurar la disponibilidad inmediata de las evidencias documentales sincronizadas desde la tablet.

Esta propuesta consolida las correcciones necesarias para asegurar la persistencia offline-first en tablets, el control de acceso granular y la accesibilidad visual requerida por los estándares SATEM.

## What Changes

- **Inspección de Flota y Persistencia en Tablet (`fleet-inspection`)**:
  - Persistencia continua de las respuestas del checklist preoperacional (80 ítems) y de las 4 fotografías perimetrales obligatorias en almacenamiento local (IndexedDB) de la tablet durante toda la jornada activa del conductor.
  - Mecanismo de recuperación automática del estado de la inspección ante recargas, minimización o reinicio del navegador en dispositivos Android e iOS.
  - Sincronización inmediata de la inspección y de las 4 fotografías perimetrales hacia el backend, vinculándolas directamente como ítems documentales en el expediente (`ExpedienteDocumental`) de la orden correspondiente.

- **Autenticación, Administración y Matriz RBAC (`user-auth`)**:
  - Incorporación de un botón visible y accesible de "Cerrar Sesión" en la barra de navegación/cabecera unificada de todas las vistas autenticadas, con invalidación de cookie HTTP-only y reseteo del estado del cliente.
  - Incorporación de la columna "Email" en la tabla principal del panel de administración de usuarios (`/admin/usuarios`).
  - Habilitación de acciones administrativas para restablecimiento/cambio de contraseña y reasignación de roles de usuario por parte de `SUPERADMIN` y `ADMIN`.
  - Formalización del rol `COMERCIAL` dentro del esquema de roles y middlewares de autorización RBAC, otorgando facultades sobre solicitudes de clientes, órdenes de servicio y consolidación de Estados de Pago (EDP), restringiendo accesos a despachos operativos y administración del sistema.

- **Portal de Clientes y Accesibilidad Visual (`client-portal`)**:
  - Adaptación completa de las vistas del portal de clientes a las variables semánticas de color del SATEM Design System para Modo Claro (Light Mode), garantizando un ratio de contraste accesible superior a 4.5:1 (WCAG AA).
  - Visualización reactiva e inmediata de las evidencias fotográficas, firmas táctiles y registros operacionales en el expediente documental desde el momento en que son sincronizados por el conductor.

## Capabilities

### Modified Capabilities

- `fleet-inspection`: Persistencia de checklist y 4 fotos perimetrales durante jornada activa en tablet Android/iOS y sincronización inmediata a expediente documental.
- `user-auth`: Cierre de sesión explícito en cabecera, columna email y administración de passwords/roles en panel de usuarios, y matriz de RBAC reforzada con rol COMERCIAL.
- `client-portal`: Contraste dinámico accesible en Modo Claro (Light Mode) con tokens del SATEM Design System y visualización en tiempo real de evidencias sincronizadas.

## Impact

- **Frontend**:
  - Componente de cabecera/navbar (`Navbar.tsx` o equivalente): Incorporación de botón accesible de Logout y selector de tema dinámico.
  - Módulo Tablet (`DriverTabletView.tsx`, `ChecklistPreoperacional.tsx`): Integración con capa de almacenamiento IndexedDB para persistencia de checklist y fotos perimetrales ante eventos de recarga.
  - Módulo Administración de Usuarios (`UserManagementView.tsx`): Inclusión de columna de correo electrónico en la grilla y modales para modificación de contraseña y rol.
  - Módulo Portal Cliente (`ClientPortalView.tsx`, `ExpedienteView.tsx`): Aplicación estricta de tokens CSS de SATEM Design System para contraste en Light Mode y refresco de evidencias en tiempo real.
- **Backend & Rutas API**:
  - `POST /api/auth/logout`: Endpoint para destrucción de sesión y limpieza de cookies HTTP-only.
  - `PATCH /api/usuarios/:id/password`: Endpoint para actualización administrativa de contraseñas con validación de complejidad.
  - `PATCH /api/usuarios/:id/rol`: Endpoint para actualización de rol por administradores.
  - `POST /api/inspecciones`: Asegura la persistencia y vinculación automática con el expediente documental de la orden asociada.
  - Middlewares de autorización: Inclusión del rol `COMERCIAL` en rutas de solicitudes, órdenes de servicio y estados de pago.
- **Base de Datos & Modelos Prisma**:
  - `RolUsuario`: Inclusión del valor `COMERCIAL` en el enum de roles si no estuviese presente.
  - Modelos `Usuario`, `InspeccionPreoperacional`, `ExpedienteDocumental` e `ItemDossier` debidamente alineados.
