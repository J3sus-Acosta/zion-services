# Tasks

> Orden por dependencias. Agente ejecutor entre corchetes. Ver `design.md` (D1–D9, R1–R9) y `specs/`.
> Decisiones cerradas: R1 (solo ADMIN/SUPERADMIN levantan bloqueos CHECKLIST_SEGURIDAD; D10), R2 (PROGRAMADA desvincula inspeccionSalidaId, EN_CURSO conserva; D11), R7 (transferencia obligatoria con jornadas activas + endpoint `POST /api/flota/:id/transferir`; D12).

## 1. Base de datos y migración (expand) [database-prisma]

- [x] 1.1 `backend/prisma/schema.prisma`: agregar enums `TipoEquipo` (CAMION, CAMIONETA, MAQUINARIA, OTRO), `EstadoEquipo` (HABILITADO, DESHABILITADO) y `OrigenBloqueo` (MANUAL, CHECKLIST_SEGURIDAD) y los campos de `Vehiculo` (`tipoEquipo`, `observaciones`, `estado`, motivo/origen, `estadoCambiadoPorId`/fecha) según D1; mantener columnas antiguas (`activo`, `bloqueadoPorSeguridad`, `motivoBloqueo`) sin eliminarlas (fase expand).
- [x] 1.2 Generar migración controlada (`prisma migrate dev --create-only`) con backfill: `activo=false` → DESHABILITADO/MANUAL; `bloqueadoPorSeguridad=true` → DESHABILITADO/CHECKLIST_SEGURIDAD (precedencia a seguridad); `tipoEquipo=CAMION` por defecto. Prohibido `db push` contra producción.
- [x] 1.3 Índices (estado, tipoEquipo) y revisión de relaciones; `prisma generate`.
- [x] 1.4 Validar migración: conteos antes/después del backfill, ejecución sobre copia de datos, plan de respaldo/rollback (R3). Documentar que el DROP de columnas (contract) queda fuera de este change y requiere autorización explícita.

## 2. Servicio de flota y auditoría (backend) [backend-node] — depende de 1

- [x] 2.1 Crear `backend/src/services/fleet.service.ts` (+ `FleetError`): listar/filtrar, detalle, crear (estado HABILITADO), editar parcial; unicidad de patente (409 `FLEET_PLATE_DUPLICATE`, normalizar patente).
- [x] 2.2 Esquemas Zod `.strict()` (alta, edición sin `estado`, cambio de estado como unión discriminada, query params, uuid) en el módulo de flota.
- [x] 2.3 `cambiarEstado`: deshabilitar con motivo obligatorio; habilitar; conflicto de estado (409 `FLEET_STATE_CONFLICT`); constante única `ROLES_GESTION_FLOTA` y regla de levantamiento de bloqueos CHECKLIST_SEGURIDAD (403 `FLEET_UNLOCK_FORBIDDEN`) según resolución de R1.
- [x] 2.4 `operacionesAfectadas`: jornadas PROGRAMADA/EN_CURSO → HojaDeRuta → TramoRuta → OrdenServicio/Expediente + candidatos de reemplazo habilitados con `tieneConflicto`.
- [x] 2.5 Transferencia transaccional (`SELECT … FOR UPDATE`, revalidar origen/destino habilitados y sin solapamiento, actualizar `Jornada.vehiculoId`, regla R2 sobre `inspeccionSalidaId` en jornadas PROGRAMADA); rollback atómico ante error.
- [x] 2.5b Deshabilitar con jornadas activas sin `vehiculoDestinoId` → 409 `FLEET_TRANSFER_REQUIRED` sin cambios; sin jornadas activas basta el motivo. Reutilizar la rutina de transferencia para `transferir(origenId, {vehiculoDestinoId, jornadaIds?})` que no cambia el estado del origen (409 `FLEET_NO_ACTIVE_OPERATIONS` si no hay jornadas activas).
- [x] 2.5c Implementar modelo/tabla de notificación in-app y creación de notificación para conductores afectados durante la transferencia en `FleetService.transferirJornadas` (D13).
- [x] 2.8 Implementar middleware de rate limiting para `/api/flota` (120 req/min en GET; 30 req/min en POST/PATCH; respuesta 429 con `Retry-After`) según D14.
- [x] 2.6 Auditoría con `AuditoriaEvento` (FLOTA_CREAR, FLOTA_EDITAR, FLOTA_DESHABILITAR, FLOTA_HABILITAR, FLOTA_TRANSFERENCIA; `detallesJson` con antes/después, motivo, ids; sin datos sensibles) en la misma transacción que el cambio.
- [x] 2.7 `assertDespachable` (409 `FLEET_DISABLED` con motivo) como guardia reutilizable.

## 3. Rutas e integración con checklist (backend) [backend-node] — depende de 2

- [x] 3.1 `backend/src/routes/flota.routes.ts`: `authenticate` + `authorize(SUPERADMIN, ADMIN, JEFE_OPERACIONES)`; endpoints GET/GET:id/POST/PATCH:id/GET:id/operaciones-afectadas/PATCH:id/estado/POST:id/transferir; controllers delgados; errores `{ error: { code, message } }`; sin DELETE/PUT.
- [x] 3.2 Montar `/api/flota` en `backend/src/index.ts`.
- [x] 3.3 `inspeccion.routes.ts` `POST /salida`: invocar `assertDespachable` antes de evaluar y persistir el bloqueo de seguridad (`aplicarBloqueoSeguridad`: DESHABILITADO/CHECKLIST_SEGURIDAD + motivo + auditoría) después; contrato de respuesta (`bloqueado`, `motivoBloqueo`) sin cambios.
- [x] 3.5 Endpoints para notificaciones de conductor: `GET /api/conductores/notificaciones` y `PATCH /api/conductores/notificaciones/:id/leida` con autorización para el conductor asignado.
- [x] 3.4 Aplicar regla R1 de levantamiento en `cambiarEstado` y confirmar que el bloqueo automático no sobrescribe un DESHABILITADO manual vigente.

## 4. Frontend módulo «Flota» [frontend-react] — depende de 3 (contratos)

- [x] 4.1 `frontend/src/types/auth.ts`: agregar `OPERACIONES` a `RolUsuario`; revisar fallback de `getDefaultRoute()` para ese rol (R5). Crear `types/fleet.ts` y cliente API de flota.
- [x] 4.2 `frontend/src/components/fleet/FleetManagementPanel.tsx` (tabla/tarjetas responsive, filtros por tipo/estado/búsqueda, formulario alta/edición en Modal, badges de estado, estados loading/error/empty/data, aria-*), siguiendo SATEM Design System y `UserManagementPanel.tsx`.
- [x] 4.3 Diálogo de deshabilitar: motivo obligatorio, carga de operaciones afectadas, advertencia, selector de equipo de reemplazo OBLIGATORIO si hay jornadas activas (candidatos con conflicto deshabilitados; sin opción «no transferir»), resumen de transferencia; `FleetTransferDialog` («Reasignar operaciones») para equipos ya deshabilitados con jornadas activas; botón de habilitar deshabilitado con tooltip para JEFE_OPERACIONES en bloqueos CHECKLIST_SEGURIDAD; diálogo de habilitar (mensaje 403 de bloqueo por checklist).
- [x] 4.4 `App.tsx`: flag `puedeVerFlota` (SUPERADMIN, ADMIN, JEFE_OPERACIONES), ruta `/flota` con `ProtectedRoute` y el ítem «Flota» en los 3 bloques de navegación.
- [x] 4.6 `TabletConductorView`: banner/alerta in-app de notificación cuando se transfiera la jornada del conductor a otro equipo, con detalle del nuevo equipo y patente.
- [x] 4.5 Validación de UI: `npm run build`/lint, revisión responsive (móvil/tablet/escritorio) y modo oscuro.

## 5. Pruebas [tester] — depende de 2–4

- [x] 5.1 Tests Vitest de `fleet.service`: alta/edición/validaciones, patente duplicada, motivo obligatorio, transiciones de estado, sin eliminación.
- [x] 5.2 Tests de transferencia: éxito, rollback, destino deshabilitado/igual al origen/con conflicto, jornadas PROGRAMADA vs EN_CURSO (R2), expediente/órdenes siguen a la jornada.
- [x] 5.2b Tests: `FLEET_TRANSFER_REQUIRED` sin destino, `POST /transferir` (éxito, sin jornadas → 409, origen sigue DESHABILITADO).
- [x] 5.3 Tests de permisos por rol (ADMIN, SUPERADMIN, JEFE_OPERACIONES permitidos; OPERACIONES, COMERCIAL, CONDUCTOR, CLIENTE → 403; sin token → 401) y regla R1.
- [x] 5.4 Tests de auditoría (un evento por acción con detalles esperados) y de integración checklist F-GMT (bloqueo persistido, `assertDespachable`, regresión de `operations.rules.test.ts`).
- [x] 5.5 Ejecutar la suite completa del backend y build del frontend; reportar cobertura de los escenarios de los specs.

## 6. Seguridad [security-reviewer] — depende de 3–5

- [x] 6.1 Revisar autorización server-side, mass assignment (`.strict()`), validación de entrada, inyección en `FOR UPDATE`/SQL crudo, exposición de errores y contenido de auditoría.
- [x] 6.2 Revisar rate limiting en endpoints de cambio de estado/transferencia y que `estado` no sea modificable vía `PATCH /:id`.

## 7. Revisión y cierre [code-reviewer / performance-reviewer / devops]

- [x] 7.1 [code-reviewer] Revisión de código (arquitectura, tipos estrictos, sin código muerto, campos nuevos con consumidores).
- [x] 7.2 [performance-reviewer] Revisar consultas de operaciones afectadas (índices, N+1) y listado de flota.
- [x] 7.3 [devops] Validar plan de despliegue: migración expand con backup antes de producción, orden backend→frontend, rollback; la fase contract queda como change posterior.
- [x] 7.4 [orchestrator] Ejecutar `openspec validate add-fleet-management`, marcar tareas y archivar tras aprobación del usuario.
