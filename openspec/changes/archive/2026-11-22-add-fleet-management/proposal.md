## Why

Hoy no existe forma de administrar la flota: los camiones solo existen como filas en `vehiculos`, sin API ni UI, y el "bloqueo por seguridad" del checklist F-GMT se calcula pero no se persiste. El Jefe de Operaciones necesita agregar equipos, editar sus características y habilitarlos/deshabilitarlos (camiones y otra maquinaria) con trazabilidad.

## What Changes

- Nueva API y módulo de UI **«Flota»** (ruta propia e ítem de navegación) para listar, crear, editar y habilitar/deshabilitar equipos.
- Generalizar `Vehiculo` con `tipoEquipo` (`CAMION`, `CAMIONETA`, `MAQUINARIA`, `OTRO`) y `observaciones`, reutilizando el modelo.
- **Estado único** habilitado/deshabilitado con motivo, que unifica `activo`, `bloqueadoPorSeguridad` y `motivoBloqueo`. **BREAKING** (modelo de datos): requiere migración controlada de esos campos (sin `prisma db push` en producción).
- Deshabilitar un equipo con jornada/orden activa exige motivo, aviso de operaciones afectadas y transferencia obligatoria de la operación activa a otro equipo habilitado.
- El bloqueo por falla crítica del checklist F-GMT pasa a persistir en el estado único.
- Notificación in-app persistida al conductor cuando se transfiere su jornada.
- Rate limiting en `/api/flota` (lectura 120/min; escritura y transferencia 30/min; 429 con `Retry-After`).
- Auditoría con `AuditoriaEvento` de crear, editar, habilitar/deshabilitar y transferencias.
- Sin eliminación física ni endpoint de borrado; solo baja lógica (deshabilitar).
- Permisos por rol: ADMIN, SUPERADMIN y JEFE_OPERACIONES gestionan la flota; los bloqueos de origen checklist de seguridad solo los levantan ADMIN/SUPERADMIN.

### Decisión de roles y origen del bloqueo

`ADMIN`, `SUPERADMIN` y `JEFE_OPERACIONES` crean, editan y habilitan/deshabilitan equipos. Cada deshabilitación tiene un origen: `MANUAL` o `CHECKLIST_SEGURIDAD`. Los bloqueos con origen `CHECKLIST_SEGURIDAD` solo pueden levantarlos `ADMIN` y `SUPERADMIN`; `JEFE_OPERACIONES` gestiona todo lo demás, incluidos los bloqueos `MANUAL`. El resto de roles (`OPERACIONES`, `COMERCIAL`, `CONDUCTOR`, `CLIENTE`) no accede. Nota: el tipo frontend `RolUsuario` no incluye `OPERACIONES` (a resolver en design).

### Reglas de transferencia

Un equipo con jornadas activas no puede deshabilitarse sin transferir: el destino habilitado es obligatorio. En la transferencia, las jornadas `PROGRAMADA` se desvinculan de su inspección de salida y el equipo nuevo repite el checklist; las `EN_CURSO` conservan la inspección original.

## Capabilities

### New Capabilities
- `fleet-management`: catálogo de equipos, alta/edición, estado único habilitado/deshabilitado con motivo, permisos, transferencia de operación activa, auditoría y módulo «Flota».

### Modified Capabilities
- `fleet-inspection`: el bloqueo de salida por falla crítica del checklist F-GMT usa el estado unificado del equipo.

`journey-routing` no se modifica en esta etapa: la restricción de asignar solo equipos habilitados y la transferencia se especifican en `fleet-management`. Se revisará en design si hace falta.

## Impact

- Backend: `prisma/schema.prisma` (`Vehiculo`, migración), nuevas rutas/servicio de flota, `inspection.service.ts` / `inspeccion.routes.ts` (persistir bloqueo), `index.ts`, uso de `authorize` y `AuditoriaEvento`.
- Frontend: `App.tsx` (ruta y navegación), nuevo panel Flota, `types/auth.ts`.
- Datos: migración de `activo`/`bloqueadoPorSeguridad`/`motivoBloqueo`.
- Riesgos abiertos: ver design.md (migración, concurrencia, trazabilidad de patente tras transferencia).

## Non-goals

- El DROP/contract de las columnas legadas `activo`, `bloqueadoPorSeguridad` y `motivoBloqueo` queda **fuera de este change**: permanecen deprecated por compatibilidad. No hay tareas destructivas.

