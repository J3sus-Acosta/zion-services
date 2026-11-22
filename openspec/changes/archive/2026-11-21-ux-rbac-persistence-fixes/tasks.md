Created At: 2026-11-21T23:30:14-03:00
Completed At: 2026-11-22T02:46:00-03:00

# Tasks

## 1. Backend: Endpoints de Administración de Usuarios y Logout

- [x] 1.1 Implementar métodos `cambiarPassword` y `cambiarRol` en `UserManagementService` con validación Zod y hash seguro vía `CryptoUtil.hashPassword`, y verificar ejecución de tests unitarios del servicio.
- [x] 1.2 Exponer endpoints `PATCH /api/usuarios/:id/password` y `PATCH /api/usuarios/:id/rol` en `user.routes.ts` protegidos con `authenticate` y `authorize(SUPERADMIN, ADMIN)`, y verificar códigos HTTP 200 y 400.
- [x] 1.3 Exponer y verificar endpoint `POST /api/auth/logout` en `auth.routes.ts` que invalide la cookie HTTP-only `satem_auth_token` y responda 200 con mensaje de éxito, y verificar mediante test de integración API.
- [x] 1.4 Crear suite de pruebas de seguridad y endpoints en `backend/src/services/auth.security.test.ts` o `backend/src/services/user-management.test.ts` cubriendo cambio de clave, validación de complejidad y RBAC, y verificar que pasen al 100%.

## 2. Frontend: Encabezado Oficial y Cierre de Sesión Visible

- [x] 2.1 Modificar `AppLayout` en `frontend/src/App.tsx` para reemplazar el icono aislado de logout por un botón visible con texto explícito "Cerrar Sesión", icono `LogOut`, estilizado con tokens semánticos SATEM (`text-muted-foreground hover:text-destructive`), y verificar visualización adecuada en resoluciones desktop y tablet.
- [x] 2.2 Conectar el botón de logout al método `logout()` de `AuthContext`, asegurando la llamada a `POST /api/auth/logout`, la purga del estado en memoria y la redirección atómica hacia `/login`, verificando que una sesión cerrada no pueda retornar mediante el botón Atrás del navegador.

## 3. Frontend: Persistencia en Tablet del Conductor y Carga Inmediata a Expediente

- [x] 3.1 Extender `OfflineStorageService` en `frontend/src/services/offline-storage.ts` con métodos `guardarEstadoJornadaActiva` y `recuperarEstadoJornadaActiva` en IndexedDB (`ZionFleetOfflineDB`) y fallback a `localStorage`, y verificar almacenamiento y lectura local de checklist y fotos.
- [x] 3.2 Actualizar `TabletConductorView.tsx` para sincronizar bidireccionalmente el paso del flujo (1 a 4), checklist completado y las 4 fotos perimetrales con el almacenamiento local, verificando que una recarga (F5) o cambio de ruta conserve el 100% de los datos.
- [x] 3.3 Modificar el handler de captura fotográfica en `TabletConductorView.tsx` para que cada una de las 4 fotos perimetrales capturadas se envíe de inmediato a `POST /api/expedientes/:ordenId/documentos` con categoría `FOTO_CAMION_SALIDA` / `FOTO_CAMION_RETORNO` y `visibleParaCliente: true`, encolando en IndexedDB si no hay conexión, y verificar la petición de red inmediata.
- [x] 3.4 Validar mediante prueba de flujo en navegador que una foto capturada en la tablet del conductor aparezca reflejada de inmediato en la respuesta de `GET /api/expedientes/:ordenId/en-vivo` y en el portal del cliente.

## 4. Frontend: Gestión de Usuarios en UserManagementPanel

- [x] 4.1 Incorporar columna visible y destacada de `Email` en la cabecera y filas de la tabla de `UserManagementPanel.tsx` con estilo tipográfico nítido y soporte de filtro/búsqueda, y verificar renderizado correcto en la grilla.
- [x] 4.2 Diseñar e integrar modal de cambio de contraseña administrativa en `UserManagementPanel.tsx` con input de nueva clave, validación mínima de 6 caracteres y confirmación interactiva llamando a `PATCH /api/usuarios/:id/password`, y verificar notificación de éxito.
- [x] 4.3 Diseñar e integrar selector modal de cambio de rol de usuario en `UserManagementPanel.tsx` con opciones de `RolUsuario` y campo condicional de `empresaClienteId` para rol `CLIENTE` llamando a `PATCH /api/usuarios/:id/rol`, y verificar actualización reactiva de la tabla.

## 5. Frontend: Accesibilidad y Contraste en Portal del Cliente (Light Mode)

- [x] 5.1 Refactorizar `ClientPortalView.tsx` para erradicar clases hardcodeadas (`text-zinc-100`, `text-zinc-400`, `text-zinc-200`, `bg-zinc-950`, `border-zinc-800`, `bg-zinc-900/40`), reemplazándolas por tokens semánticos del SATEM Design System (`text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`, `bg-muted/50`), y verificar legibilidad y ratio WCAG AA en Modo Claro.
- [x] 5.2 Ajustar estilos del modal visor de documentos y evidencias en `ClientPortalView.tsx` para heredar tokens semánticos dinámicos, y verificar contraste en visualización de imágenes y documentos certificados.

## 6. Matriz RBAC, Módulo Comercial y Control de Enrutamiento

- [x] 6.1 Crear el componente `CommercialManagementView.tsx` en `frontend/src/components/commercial/` con pestañas de consulta y gestión de Solicitudes de Servicio y Órdenes de Servicio para roles comerciales, y verificar renderizado inicial.
- [x] 6.2 Actualizar `frontend/src/App.tsx` para registrar la ruta `/comercial` protegida por `ProtectedRoute` con `allowedRoles: ['SUPERADMIN', 'ADMIN', 'COMERCIAL']`, y añadir botón de navegación en la cabecera condicionado a dichos roles, verificando acceso autorizado.
- [x] 6.3 Refactorizar la matriz de enrutamiento y redirección en `App.tsx`:
  - `CONDUCTOR`: acceso exclusivo a `/tablet` y bloqueo de otros accesos.
  - `CLIENTE`: acceso exclusivo a `/portal-cliente` y bloqueo de otros accesos.
  - `JEFE_OPERACIONES`: acceso a `/operaciones` y `/tablet`.
  - `COMERCIAL`: acceso a `/comercial`.
  - `ADMIN` y `SUPERADMIN`: acceso completo a todas las vistas.
  - Actualizar `getDefaultRoute()` en concordancia y verificar redirecciones automáticas por rol.
- [x] 6.4 Realizar auditoría de RBAC verificando que los roles restringidos reciban redirección o 403 Forbidden al intentar acceder a rutas no autorizadas en cliente y servidor.

## 7. Verificación de Integración y Validación del Sistema

- [x] 7.1 Ejecutar prueba de verificación integral del ciclo completo: login contextual, persistencia en tablet ante recarga, subida en tiempo real al expediente, contraste accesible en modo claro de cliente, y administración de usuarios.
- [x] 7.2 Ejecutar chequeo de tipos TypeScript (`tsc --noEmit`) en backend y frontend para confirmar cero errores de tipado o compilación.
