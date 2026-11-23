# Design

## Context

Motivación y alcance: ver `proposal.md`. Requisitos: ver `specs/fleet-management/spec.md` y `specs/fleet-inspection/spec.md`. Aquí solo el **cómo**.

Estado actual verificado en el código:

- `Vehiculo` (`vehiculos`) tiene `activo`, `bloqueadoPorSeguridad`, `motivoBloqueo`, pero **ningún código en `backend/src` lee o escribe `prisma.vehiculo`** (solo `prisma/seed.ts` hace `vehiculo.upsert`). No hay `/api/vehiculos`.
- `inspeccion.routes.ts` (`POST /salida`) valida a mano, llama a `InspectionService.evaluarInspeccionSalida` (función pura) y devuelve `bloqueado`/`motivoBloqueo` **sin persistir nada**. Tampoco persiste la inspección ni usa `vehiculoId` contra la BD.
- `Jornada.vehiculoId` es la única FK equipo→operación. `OrdenServicio` y `ExpedienteDocumental` **no tienen** `vehiculoId`; llegan al equipo vía `Jornada → HojaDeRuta → TramoRuta.ordenServicioId`.
- Migraciones existentes: `20261120000000_init_zion_schema_v3`, `20261122012506_add_telemetria_gps` (historial de `prisma migrate`; usar `migrate dev` en local y `migrate deploy` en producción).
- Patrón de rutas: `routes/user.routes.ts` (`router.use(authenticate); router.use(authorize(...))`, errores con `error.statusCode`/`error.code` → `{ error: { code, message } }`, respuestas `{ data: {...} }`). `zod@^3.23` ya es dependencia; test runner **Vitest** (`npm test`), tests en `src/services/*.test.ts`; **no hay Supertest**.
- Frontend: `App.tsx` con `ProtectedRoute allowedRoles`, flags `puedeVer*` y los ítems de navegación repetidos en tres bloques (líneas ~159-266 y ~348-400). `types/auth.ts` define `RolUsuario` **sin `OPERACIONES`** (existe en Prisma).
- `AuditoriaEvento` existe en el schema pero no tiene escritores actuales en servicios; este change crea el primer uso estructurado.

## Goals / Non-Goals

**Goals:**
- Un único estado por equipo (`HABILITADO`/`DESHABILITADO`) con motivo, origen y auditoría de quién/cuándo, reemplazando `activo` + `bloqueadoPorSeguridad` + `motivoBloqueo`.
- API `/api/flota` con CRUD parcial (sin DELETE), cambio de estado y transferencia atómica.
- Persistir el bloqueo del checklist F-GMT en ese estado.
- Migración de datos reversible por fases, sin `db push`.
- Módulo «Flota» con estados loading/error/empty/data.

**Non-Goals:**
- No persistir la inspección F-GMT completa (`InspeccionSalida_F_GMT`) ni fotos: fuera de este change (hoy tampoco se persisten). Solo se persiste el efecto sobre el equipo.
- No crear endpoint de creación de jornadas ni modificar `journey-routing` (no existe flujo de creación en `src`); solo se deja una **guardia reutilizable** `FleetService.assertDespachable(vehiculoId)` para que cualquier creador de jornada/despacho la invoque.
- Sin historial de estados en tabla propia (se usa `AuditoriaEvento`).
- Sin soft-delete adicional, sin eliminación, sin filtros avanzados ni paginación server-side (flota de decenas de equipos).
- No resolver el modelo `Conductor.activo` ni `Usuario.activo` (son independientes).

## Decisions

### D1. Modelo de datos

```prisma
enum EstadoEquipo { HABILITADO  DESHABILITADO }
enum OrigenBloqueo { MANUAL  CHECKLIST_SEGURIDAD }
enum TipoEquipo { CAMION  CAMIONETA  MAQUINARIA  OTRO }

model Vehiculo {
  // existentes: id, patente @unique, marca, modelo, anio, capacidadEstanqueM3,
  //             equipoHidrojet, equipoVacio, createdAt, updatedAt, relaciones
  tipoEquipo            TipoEquipo     @default(CAMION)
  observaciones         String?        @db.Text
  estado                EstadoEquipo   @default(HABILITADO)
  motivoEstado          String?        @db.Text        // obligatorio si DESHABILITADO; null si HABILITADO
  origenBloqueo         OrigenBloqueo?                 // solo si DESHABILITADO
  estadoCambiadoAt      DateTime?
  estadoCambiadoPorId   String?                        // Usuario.id (FK opcional a Usuario, onDelete SetNull)
  estadoCambiadoPor     Usuario?       @relation("VehiculoEstadoPor", fields: [estadoCambiadoPorId], references: [id])

  @@index([estado, tipoEquipo])
}
```

- Invariante (validada en `FleetService`, no solo en BD): `estado=DESHABILITADO ⇒ motivoEstado no vacío y origenBloqueo ≠ null`; `HABILITADO ⇒ motivoEstado=null y origenBloqueo=null`. El motivo histórico queda en `AuditoriaEvento`.
- `estadoCambiadoPorId` es null cuando el bloqueo proviene del checklist y lo origina el conductor/sistema; se registra igualmente `usuarioId` del conductor en auditoría.
- `capacidadEstanqueM3`, `anio` se mantienen con sus tipos actuales. Para `MAQUINARIA`/`OTRO` la capacidad puede ser `0` (spec: no negativa); no se hace nullable para no romper consumidores existentes (`vehicle-comparison.service`, seed).
- Todos los campos nuevos tienen consumidor (API, UI, auditoría); `estadoCambiadoAt/Por` se muestran en el detalle.

**Alternativas:** (a) mantener `activo` + `bloqueadoPorSeguridad` y derivar estado — rechazado: dos fuentes de verdad, contradice decisión 5. (b) Tabla `EstadoEquipoHistorial` — rechazada por sobre-ingeniería; `AuditoriaEvento` ya cubre trazabilidad. (c) Tabla nueva `Equipo` — rechazada: duplica FKs de `Jornada`/inspecciones; se reutiliza `Vehiculo` (decisión 3). (d) `String` en lugar de enum Prisma — rechazado: se prefiere tipado fuerte.

### D2. Migración de datos (expand / contract)

Dos migraciones Prisma versionadas (nunca `db push`; `migrate deploy` en producción, respaldo previo de BD).

**Migración 1 – expand** (`add_fleet_state`, aditiva, desplegable con código viejo):
1. Crear columnas nuevas con defaults (`tipoEquipo='CAMION'`, `estado='HABILITADO'`, resto null) e índice.
2. SQL de backfill en el mismo `migration.sql`:
   ```sql
   UPDATE vehiculos SET estado='DESHABILITADO', origenBloqueo='CHECKLIST_SEGURIDAD',
          motivoEstado=COALESCE(NULLIF(motivoBloqueo,''),'Bloqueo por seguridad (migrado)'), estadoCambiadoAt=NOW()
    WHERE bloqueadoPorSeguridad = 1;
   UPDATE vehiculos SET estado='DESHABILITADO', origenBloqueo='MANUAL',
          motivoEstado='Deshabilitado previamente (migrado)', estadoCambiadoAt=NOW()
    WHERE activo = 0 AND bloqueadoPorSeguridad = 0;
   ```
   La precedencia deja el bloqueo de seguridad como origen cuando ambos aplican (conserva el motivo más informativo y la regla más estricta para levantarlo, ver R1).
3. Las columnas antiguas **se conservan** (sin uso por código nuevo). Como no hay código en `src` que las lea, no hay escritura dual necesaria; solo se actualizan `seed.ts` y fixtures.

**Despliegue:** migrate deploy → desplegar backend/frontend nuevos → verificar conteos (`SELECT estado,origenBloqueo,COUNT(*)` coincide con conteos pre-migración de `activo=0` / `bloqueadoPorSeguridad=1`).

**Migración 2 – contract** (change/tarea posterior, tras ≥1 release estable y aprobación explícita): `ALTER TABLE vehiculos DROP COLUMN activo, bloqueadoPorSeguridad, motivoBloqueo`. Es destructiva: requiere autorización explícita y backup.

**Rollback:** tras la migración 1 es seguro volver al código anterior (columnas viejas intactas). Tras la 2 solo con restore. El backfill inverso (estado→activo) se documenta como script manual por si se necesita.

**Alternativa:** una sola migración que dropea columnas — rechazada (irreversible, sin ventana de rollback). Migrar con script TS aparte — rechazado: el SQL en la migración es atómico y versionado.

### D3. Endpoints REST `/api/flota`

Montaje: `app.use('/api/flota', fleetRouter)` en `index.ts`. Router: `authenticate` + `authorize(SUPERADMIN, ADMIN, JEFE_OPERACIONES)` para **todo** el router (lectura incluida: los demás roles no necesitan el catálogo; el tablet usa `/api/inspecciones`). Respuestas `{ data: ... }`; errores `{ error: { code, message } }` (campo opcional `details` solo en validación con `{campo, mensaje}[]` de Zod). Archivo `routes/fleet.routes.ts` delgado; Zod en `schemas/fleet.schema.ts` (o junto al servicio).

| Método y ruta | Descripción | Éxito | Errores |
|---|---|---|---|
| `GET /api/flota?tipoEquipo=&estado=&busqueda=` | Lista (incluye deshabilitados), orden por patente. `busqueda` sobre patente/marca/modelo | 200 `{data:{equipos}}` | 400 `VALIDATION_ERROR` (query) |
| `GET /api/flota/:id` | Detalle | 200 `{data:{equipo}}` | 404 `FLEET_NOT_FOUND` |
| `POST /api/flota` | Crear (estado `HABILITADO`) | 201 | 400 `VALIDATION_ERROR`, 409 `FLEET_PLATE_DUPLICATE` |
| `PATCH /api/flota/:id` | Editar características (parcial, `.strict()`; **no** admite `estado`) | 200 | 400, 404, 409 |
| `GET /api/flota/:id/operaciones-afectadas` | Vista previa de jornadas/órdenes activas + candidatos de reemplazo habilitados | 200 | 404 |
| `PATCH /api/flota/:id/estado` | Cambiar estado; deshabilitar con operaciones activas exige `vehiculoDestinoId` (transferencia obligatoria, ver D12) | 200 | 400, 404, 409 `FLEET_TRANSFER_REQUIRED`, 409 `FLEET_TRANSFER_INVALID_TARGET`, 409 `FLEET_STATE_CONFLICT`, 403 `FLEET_UNLOCK_FORBIDDEN` |
| `POST /api/flota/:id/transferir` | Reasignar jornadas activas de un equipo (incluso ya `DESHABILITADO`) a otro equipo `HABILITADO`, sin cambiar el estado del origen | 200 | 400, 404, 409 `FLEET_TRANSFER_INVALID_TARGET`, 409 `FLEET_NO_ACTIVE_OPERATIONS` |

No existe `DELETE` (405/404 por defecto de Express; el test lo verifica). Se usa `PATCH` con `/:id/estado` por coherencia con `user.routes.ts`.

**Esquemas Zod:**
- Crear: `patente` (trim, mayúsculas, regex `^[A-Z0-9-]{4,10}$`), `tipoEquipo` (`z.nativeEnum(TipoEquipo)`), `marca`/`modelo` (trim, 1-60), `anio` (`int`, 1980..año actual+1), `capacidadEstanqueM3` (`number` ≥0, ≤ 999999.99, 2 decimales), `equipoHidrojet`/`equipoVacio` (boolean, default false), `observaciones` (opcional, ≤1000, nullable).
- Editar: mismo esquema `.partial().strict()` y al menos un campo. Cambiar `patente` permitido con unicidad.
- Estado: `z.discriminatedUnion('estado', ...)`:
  - `{ estado:'HABILITADO' }`
  - `{ estado:'DESHABILITADO', motivo: string(trim, 5..500), vehiculoDestinoId?: uuid }` — `vehiculoDestinoId` es opcional **en el esquema** pero el servicio lo exige (409 `FLEET_TRANSFER_REQUIRED`) cuando el equipo tiene jornadas activas; sin operaciones activas solo se requiere `motivo`.
- Transferir (`POST /:id/transferir`): `{ vehiculoDestinoId: uuid (obligatorio), jornadaIds?: uuid[] }` (por defecto todas las jornadas activas del origen; con `jornadaIds` se reasigna solo esas, todas deben pertenecer al origen y estar activas, si no 400/409). `.strict()`.

**Semántica de `PATCH /:id/estado`:**
- `DESHABILITADO` sobre equipo ya deshabilitado → 409 `FLEET_STATE_CONFLICT` (idempotencia explícita; evita pisar motivo/origen). `HABILITADO` sobre habilitado → 409 igual.
- Equipo con jornadas activas (`PROGRAMADA`/`EN_CURSO`) y sin `vehiculoDestinoId` → 409 `FLEET_TRANSFER_REQUIRED`, sin cambios; el mensaje indica la cantidad de jornadas afectadas. **No existe deshabilitación sin transferencia** cuando hay operaciones activas.
- Respuesta 200: `{ data: { equipo, transferencia: { destino, jornadasTransferidas: [...], ordenes: [...] } | null } }` (`null` si no había operaciones activas).
- `DELETE`/`PUT` no se exponen.

**Semántica de `POST /:id/transferir`:** misma rutina transaccional que D4 pero **no modifica el estado del origen** (puede estar `HABILITADO` o `DESHABILITADO`). Sin jornadas activas que transferir → 409 `FLEET_NO_ACTIVE_OPERATIONS`. Respuesta 200 `{ data: { transferencia: {...} } }`. Es necesario porque un equipo puede quedar `DESHABILITADO` con jornadas activas por vías que **no** pasan por `PATCH estado`: bloqueo automático por checklist F-GMT (D4) y equipos migrados (D2); sin este endpoint esas jornadas no podrían completarse. Autorización: los tres roles de gestión (ver D6).

Mapeo de errores: el servicio lanza `FleetError(statusCode, code, message)` (mismo estilo que `error.statusCode` existente); los errores no controlados pasan a `next(err)` y el handler global responde sin detalles internos (500). `ZodError` → 400 `VALIDATION_ERROR`. El error P2002 de Prisma sobre `patente` → 409 (se captura además de la verificación previa para cubrir carreras).

**Alternativas:** `PUT` completo — rechazado (menos tolerante). Endpoint separado `/habilitar` y `/deshabilitar` — válido, pero un solo `PATCH estado` con unión discriminada mantiene un contrato y reutiliza el patrón de usuarios. Lectura abierta a `OPERACIONES`/`CONDUCTOR` — rechazada: spec limita el acceso a los 3 roles.

### D4. Servicios

`services/fleet.service.ts` (`FleetService`, métodos estáticos como el resto del código; recibe `actor: { userId, rol, ip }`):
- `listar`, `obtener`, `crear`, `editar`, `obtenerOperacionesAfectadas`, `cambiarEstado`, `transferir`, `assertDespachable(vehiculoId)` y `bloquearPorChecklist(vehiculoId, motivo, actor)`.
- Acceso a BD vía `prisma` de `utils/prisma.ts`; **controller solo parsea Zod, delega y responde**.

**Operaciones afectadas (consulta):** definición de «activa»:
- Jornadas del equipo con `estado IN (PROGRAMADA, EN_CURSO)`.
- Órdenes: `TramoRuta.ordenServicioId` de las `HojaDeRuta` de esas jornadas, con `OrdenServicio.estado NOT IN (EJECUTADA, LIQUIDADA, CERRADA, CANCELADA)`; se incluye el `ExpedienteDocumental` (por `ordenServicioId`) con su estado y el `CicloTransporte` si no está `FINALIZADO`.
- Respuesta: `{ jornadas:[{id, estado, fechaInicio, conductor, ordenes:[{id, numero, estado, expedienteId?}]}], candidatos:[{id, patente, tipoEquipo, marca, modelo, capacidadEstanqueM3, tieneConflicto}] }`. Candidatos = `HABILITADO`, distintos al origen, mismo `tipoEquipo` primero; `tieneConflicto` = ya tiene jornada `PROGRAMADA/EN_CURSO` que solapa en `fechaInicio..fechaFin`.

**Transferencia (transaccional, obligatoria al deshabilitar con operaciones activas):** como orden y expediente se vinculan vía jornada, **transferir = `UPDATE jornadas SET vehiculoId = destino` para las jornadas activas del origen**; órdenes/expedientes siguen automáticamente al nuevo equipo por la cadena (sin tocar tablas de orden/expediente → mínima invasividad). Se implementa como método interno `transferirJornadas(tx, origen, destino, jornadaIds?, actor)` reutilizado por `cambiarEstado` (deshabilitar) y por `transferir` (POST). Todo dentro de `prisma.$transaction(async tx => ...)` con bloqueo de fila:
1. `SELECT ... FOR UPDATE` (`tx.$queryRaw`) sobre las filas `vehiculos` de origen y destino (en orden determinístico de id para evitar deadlock).
2. Re-validar en la transacción (las jornadas activas se recalculan aquí, no se confía en la vista previa): origen existe; si es `PATCH estado`, origen `HABILITADO`; si hay jornadas activas y no llegó destino → 409 `FLEET_TRANSFER_REQUIRED`; destino existe, `HABILITADO`, ≠ origen y sin conflicto de solapamiento de jornadas (si no → 409 `FLEET_TRANSFER_INVALID_TARGET`).
3. Solo en `PATCH estado`: `tx.vehiculo.update(origen → DESHABILITADO, motivo, origen MANUAL, estadoCambiado*)`.
4. `tx.jornada.updateMany({ where:{id in jornadas, vehiculoId: origen, estado in [PROGRAMADA,EN_CURSO]}, data:{vehiculoId: destino} })`.
5. Inspecciones (decisión D11): en jornadas `PROGRAMADA` con `inspeccionSalidaId` se pone `inspeccionSalidaId=null` (la inspección no se borra; queda en el historial del equipo original y el nuevo equipo repite el checklist); en jornadas `EN_CURSO` se conserva el vínculo y se anota en auditoría.
6. Escribir `AuditoriaEvento` (misma tx): `FLOTA_DESHABILITAR` (si aplica) + `FLOTA_TRANSFERIR`.
Cualquier fallo revierte todo (spec «sin cambios parciales»). **Invariante resultante:** un equipo no pasa a `DESHABILITADO` por vía administrativa con jornadas activas. Se admiten jornadas activas en equipo `DESHABILITADO` únicamente por bloqueo de checklist o por migración, y se resuelven con `POST /:id/transferir`.

**Vista previa:** `GET /:id/operaciones-afectadas` es solo lectura; el cliente la llama al abrir el diálogo (sirve de base para elegir destino). La confirmación recalcula en la tx (TOCTOU).

**Guardia de despacho:** `assertDespachable` lanza `FleetError(409,'FLEET_DISABLED', "Equipo deshabilitado: <motivo>")`. Se invoca en `POST /api/inspecciones/salida` (el equipo deshabilitado no puede inspeccionarse/despacharse, escenario «Bloqueo por equipo deshabilitado») y debe invocarse en cualquier creación/asignación de jornada (hoy inexistente en `src`; queda como punto de integración documentado, ver Non-Goals).

**Persistencia del bloqueo F-GMT (`inspection.service` / `inspeccion.routes`):**
- `evaluarInspeccionSalida` permanece pura (testeable). Se añade `InspectionService.aplicarBloqueoSeguridad(vehiculoId, resultado, actor)` (o `FleetService.bloquearPorChecklist`) que, si `resultado.bloqueado`, en una tx: verifica que el vehículo existe (404 si no), actualiza a `DESHABILITADO` con `origenBloqueo=CHECKLIST_SEGURIDAD`, `motivoEstado=resultado.motivoBloqueo`, `estadoCambiadoPorId=null`; audita `FLOTA_BLOQUEO_CHECKLIST` con `usuarioId` del conductor. Es idempotente: si ya está `DESHABILITADO`, no sobreescribe el motivo (se agrega evento de auditoría con el nuevo motivo).
- `POST /salida` invoca `assertDespachable` **antes** de evaluar y `aplicarBloqueoSeguridad` **después**, antes de responder. El contrato de respuesta existente (`bloqueado`, `motivoBloqueo`) no cambia.
- `try/catch` actual convierte cualquier error en 400 `INSPECTION_VALIDATION_ERROR`; se ajusta para propagar `FleetError` con su status (404/409) sin romper los códigos existentes.

**Alternativas:** agregar `vehiculoId` a `OrdenServicio`/`ExpedienteDocumental` (transferir actualizando órdenes) — rechazado: migración invasiva, duplica la verdad, afecta specs de otras capacidades. Transferir creando nueva jornada — rechazado: pierde hoja de ruta/telemetría/trazabilidad. Mover la lógica de bloqueo al router — rechazado (controllers delgados).

### D5. Auditoría (`AuditoriaEvento`)

`recurso='Vehiculo'`, `recursoId=vehiculo.id`, `usuarioId`, `ipAddress=req.ip`. Helper `AuditService.registrar(tx|prisma, evento)` mínimo (un solo método) para evitar duplicación; escrito dentro de la misma transacción que el cambio.

| `accion` | `detallesJson` |
|---|---|
| `FLOTA_CREAR` | `{ patente, tipoEquipo, marca, modelo, anio, capacidadEstanqueM3, equipoHidrojet, equipoVacio }` |
| `FLOTA_EDITAR` | `{ previos:{campo:valor}, nuevos:{campo:valor} }` solo campos modificados |
| `FLOTA_DESHABILITAR` | `{ motivo, origenBloqueo:'MANUAL', estadoPrevio, operacionesAfectadas:[{jornadaId, ordenIds[]}], destinoId? }` |
| `FLOTA_HABILITAR` | `{ motivoPrevio, origenPrevio }` |
| `FLOTA_TRANSFERIR` | `{ origenId, origenPatente, destinoId, destinoPatente, jornadaIds[], ordenIds[], expedienteIds[], inspeccionesDesvinculadas[] }` |
| `FLOTA_BLOQUEO_CHECKLIST` | `{ motivo, inspeccionResumen:{fallasCriticas:n}, conductorId }` |

Sin PII (no emails/RUT/tokens), sin payload de fotos. `usuarioId` es la FK real; patente se denormaliza en la transferencia para legibilidad histórica.

### D6. Autorización y levantamiento de bloqueos de checklist

- Autorización siempre server-side con `authorize(...)` de `auth.middleware`; `enforceTenantIsolation` no aplica (la flota es global de Zion, no por `empresaClienteId`).
- **Regla (decisión cerrada, D10):** un bloqueo con `origenBloqueo=CHECKLIST_SEGURIDAD` solo lo levantan `ADMIN`/`SUPERADMIN`; `JEFE_OPERACIONES` gestiona todo lo demás (crear, editar, deshabilitar, habilitar bloqueos `MANUAL`, transferir). Se implementa en `FleetService.cambiarEstado` (403 `FLEET_UNLOCK_FORBIDDEN` si un JEFE intenta habilitar un equipo con origen `CHECKLIST_SEGURIDAD`) con constantes únicas `ROLES_GESTION_FLOTA` y `ROLES_LEVANTAN_BLOQUEO_CHECKLIST`. Es más estricta que el supuesto original del proposal; el proposal/spec deben reflejarla.
- Habilitar limpia `motivoEstado`, `origenBloqueo`, y setea `estadoCambiadoAt/Por`.

### D13. Notificación in-app al conductor por transferencia de jornada

Al transferir una jornada a otro equipo, el sistema notificará al conductor asignado:
- Modelo de datos ligero / persistido: `NotificacionConductor` o tabla de notificaciones con campos `id`, `conductorId` (o `usuarioId`), `tipo` ('TRANSFERENCIA_FLOTA'), `titulo`, `mensaje`, `leida` (boolean @default(false)), `metadata` (Json con `{ vehiculoOrigenPatente, vehiculoDestinoPatente, motivo, jornadaId }`), `createdAt`.
- Se genera dentro de la misma transacción de la transferencia en `FleetService.transferirJornadas`.
- Exposición API: `GET /api/conductores/notificaciones` y `PATCH /api/conductores/notificaciones/:id/leida` para consultar y descartar.
- Integración UI en `TabletConductorView`: aviso/banner in-app con las novedades y cambio de equipo asignado.

### D14. Rate Limiting en endpoints de flota (`/api/flota`)

Para proteger la integridad del servicio y evitar abusos o condiciones de carrera forzadas:
- Middleware de rate limiting aplicado en `backend/src/routes/flota.routes.ts`:
  - Operaciones de lectura (`GET`): hasta 120 solicitudes por minuto por usuario/IP.
  - Operaciones de escritura/mutación (`POST`, `PATCH`): hasta 30 solicitudes por minuto por usuario/IP.
- En caso de exceder el umbral, se retorna código HTTP 429 con cabecera `Retry-After: <segundos>` y cuerpo estructurado `{ error: { code: 'RATE_LIMITED', message: 'Límite de solicitudes superado...' } }`.

### D15. Conservación de columnas legadas (Sin fase contract en este change)

Se ratifica formalmente que la fase contract (DROP de `activo`, `bloqueadoPorSeguridad`, `motivoBloqueo`) queda **100% fuera de este change**:
- Las columnas legadas permanecen en la base de datos marcadas como `@deprecated`.
- No se ejecutan migraciones destructivas ni scripts de limpieza de columnas.
- La compatibilidad binaria/esquema queda intacta durante todo el ciclo de vida de este change.

## Risks / Trade-offs

- Tipos: `types/auth.ts` → agregar `'OPERACIONES'` a `RolUsuario` (alinear con Prisma; ver R5). Nuevo `types/fleet.ts`: `TipoEquipo`, `EstadoEquipo`, `OrigenBloqueo`, `Equipo`, `OperacionesAfectadas`.
- Servicio API: `services/fleetApi.ts` (mismo cliente/`credentials: 'include'` que usan los demás módulos), manejo de `{error:{code,message}}`.
- `App.tsx`: `const puedeVerFlota = ['SUPERADMIN','ADMIN','JEFE_OPERACIONES'].includes(usuario.rol)`; ruta `/flota` con `ProtectedRoute allowedRoles={['SUPERADMIN','ADMIN','JEFE_OPERACIONES']}`; ítem «Flota» (icono Lucide `Truck`) en **los tres bloques de navegación** existentes (desktop/mobile/otros). La ruta por defecto por rol no cambia (JEFE sigue en `/operaciones`).
- Componentes (carpeta `components/fleet/`): `FleetManagementPanel` (contenedor, estado y llamadas), `FleetTable` (`.table-container`), `FleetFormModal` (crear/editar; `Modal` canónico), `FleetStatusDialog` (deshabilitar: motivo obligatorio; si hay operaciones activas, lista de afectadas y selector de equipo destino **obligatorio** — el botón «Confirmar» permanece deshabilitado hasta elegirlo y no existe opción «No transferir»; habilitar: confirmación simple, deshabilitado con tooltip para JEFE en bloqueos de checklist), `FleetTransferDialog` (reasignar jornadas activas de un equipo ya `DESHABILITADO`: lista de jornadas con casillas y selector de destino; se ofrece como acción «Reasignar operaciones» en la fila cuando `operaciones-afectadas` devuelve jornadas). Reutilizar `.btn`, `.badge` (HABILITADO verde/DESHABILITADO rojo; badge secundario para origen «Seguridad»), referencia visual `UserManagementPanel`.
- Estados: `loading` (skeleton/spinner con `aria-busy`), `error` (mensaje + botón «Reintentar»), `empty` (CTA «Agregar equipo» y variante «sin resultados» con filtros), `data`. Filtros por tipo y estado, búsqueda; en mobile la tabla se convierte en tarjetas (responsive).
- Flujo de deshabilitar: abrir diálogo → `GET /:id/operaciones-afectadas` (estado loading propio) → si no hay operaciones, solo motivo → confirmar `PATCH /:id/estado`; con operaciones, mostrar advertencia y selector obligatorio (candidatos con `tieneConflicto` deshabilitados; si no hay candidatos, mensaje «No hay equipos habilitados disponibles» y no se puede confirmar). Errores 409 (`FLEET_TRANSFER_REQUIRED`, `FLEET_TRANSFER_INVALID_TARGET`, `FLEET_STATE_CONFLICT`) se muestran en el diálogo sin cerrarlo. Tras éxito, refrescar lista y mostrar resumen de transferencia.
- Accesibilidad: `role="dialog"`, `aria-modal`, `aria-live` para errores, labels asociados, foco inicial en motivo.
- La UI solo oculta; la autorización real es del backend. Sin librerías nuevas (Lucide ya existe).

### D8. Seguridad

- `authenticate` + `authorize` en todas las rutas; sin acceso público; sin `DELETE`.
- Validación Zod estricta (`.strict()` rechaza campos no previstos, evita mass assignment, p. ej. enviar `estado` en `PATCH /:id`); IDs `uuid`; query params validados contra enum.
- Prisma parametriza; el único SQL crudo (`FOR UPDATE`) usa tagged template con ids validados (sin interpolación manual).
- Errores sin stack ni mensajes de Prisma; logs vía `utils/logger` sin motivo libre completo ni PII.
- Motivo/observaciones son texto libre: se renderizan siempre como texto en React (sin `dangerouslySetInnerHTML`), longitud acotada.
- Rate limiting: el proyecto no tiene middleware global verificado en `index.ts`; se aplica el mismo mecanismo existente si lo hay, y si no queda anotado como deuda (las operaciones requieren sesión autorizada con roles internos, riesgo bajo).
- IP en auditoría desde `req.ip` (confiar en proxy configurado: Nginx/EasyPanel).

### D9. Estrategia de tests (Vitest; sin Supertest)

El repositorio prueba servicios con Vitest (`*.test.ts` en `src/services`) sin Supertest; se sigue ese patrón y se evita agregar dependencias:
- `fleet.service.test.ts` (Prisma mockeado como en tests existentes): crear OK/patente duplicada (P2002)/inválidos, editar con diff de auditoría, deshabilitar sin motivo, deshabilitar sin operaciones (solo motivo), **deshabilitar con operaciones activas sin destino → 409 `FLEET_TRANSFER_REQUIRED` sin cambios**, deshabilitar con destino OK (atómico), destino deshabilitado/inexistente/igual al origen/con conflicto (sin cambios parciales: tx revertida), `POST transferir` sobre equipo `DESHABILITADO` por checklist (no cambia estado del origen; 409 `FLEET_NO_ACTIVE_OPERATIONS` si no hay jornadas), `jornadaIds` ajenas al origen, desvinculación de `inspeccionSalidaId` en `PROGRAMADA` y conservación + auditoría en `EN_CURSO`, `HABILITADO` ya habilitado → 409, JEFE habilitando bloqueo `CHECKLIST_SEGURIDAD` → 403 `FLEET_UNLOCK_FORBIDDEN` y ADMIN/SUPERADMIN → OK, JEFE habilitando bloqueo `MANUAL` → OK, `assertDespachable`.
- `fleet.schema.test.ts`: Zod (tipoEquipo fuera de enum, anio no entero, capacidad negativa, `.strict()`).
- `inspection.service.test.ts` (ampliar): falla crítica persiste `DESHABILITADO/CHECKLIST_SEGURIDAD` y audita; sin falla no cambia estado; equipo deshabilitado rechaza `/salida`; `evaluarInspeccionSalida` sigue pura.
- Autorización: test del router montando el `Router` con `authorize` y un `req` simulado (o invocando los handlers) para 401/403 por rol (CONDUCTOR, CLIENTE, COMERCIAL, OPERACIONES) y 200/201 para los 3 roles; verificar ausencia de ruta `DELETE`.
- Migración: script de verificación SQL (conteos) documentado como paso de despliegue, y prueba manual sobre una copia de BD.
- Frontend: lo existente no evidencia framework de tests de UI; se verifica con `tsc`/build y checklist manual de los 4 estados y de roles. Si ya existiera Vitest+RTL en frontend, añadir tests del `FleetManagementPanel`.

## Risks / Trade-offs

### Riesgos abiertos

- **R3 – Migración** → Backfill puede clasificar mal `activo=0` antiguos como `MANUAL`; se revisa conteo antes/después y respaldo. Columnas antiguas permanecen hasta la migración contract; durante esa ventana las columnas antiguas pueden divergir del estado nuevo (nadie debe leerlas; se documenta/«deprecated» en comentario del schema). El drop final es destructivo y requiere autorización explícita. Cuidado con `prisma migrate dev` creando drift si la BD de producción se creó con `db push` previamente (verificar `_prisma_migrations`; usar `migrate resolve` si fuera necesario).
- **R4 – Concurrencia** → Deshabilitar mientras otro proceso crea/asigna una jornada: mitigado con `SELECT ... FOR UPDATE` sobre `vehiculos` en la transferencia, y la guardia `assertDespachable` debe ejecutarse dentro de la misma tx del creador de jornada con `FOR UPDATE` (documentado para el futuro endpoint de jornadas). Ventana residual: jornada creada milisegundos antes del commit no figura en la vista previa; el servidor recalcula las jornadas activas en la tx y, si aparecen jornadas nuevas sin destino, responde 409 `FLEET_TRANSFER_REQUIRED` sin cambios. Doble-click/doble admin → 409 `FLEET_STATE_CONFLICT`. Último-escritor-gana en edición de características (sin `updatedAt` optimista); aceptable por baja frecuencia (podría añadirse `If-Unmodified-Since`).
- **R5 – Rol OPERACIONES faltante en frontend** → `RolUsuario` frontend no incluye `OPERACIONES` aunque existe en Prisma; un usuario con ese rol hoy cae en tipos incoherentes. Se agrega al tipo (cambio mínimo); no obtiene acceso a Flota ni a otras rutas (ya no está en ningún `allowedRoles`), por lo que `getDefaultRoute()` debe revisar un fallback para ese rol (hoy `*` redirige a la ruta por defecto → posible bucle si no existe destino permitido). Verificar y definir destino (p. ej. `/login` con mensaje) antes de implementar.
- **R6 – Alcance de roles** → Crear/editar para JEFE_OPERACIONES sigue siendo un supuesto del proposal; centralizado en la constante `ROLES_GESTION_FLOTA` (backend) y el flag `puedeVerFlota` (frontend) para cambiarlo en un solo punto.
- **R7 – Jornadas activas en equipo `DESHABILITADO` por bloqueo de checklist o migración** → Esas vías no pasan por `PATCH estado` y pueden dejar jornadas colgadas; se resuelven con `POST /:id/transferir` (D12) y la UI las expone con «Reasignar operaciones». Mientras no se transfieran, `assertDespachable` impide despachar.
- **R8 – Inspecciones no persistidas** → El bloqueo se persiste, pero el vínculo causal con una `InspeccionSalida_F_GMT` no existe; motivo y auditoría son la evidencia.
- **R9 – Datos sin consumidores futuros** → `estadoCambiadoPorId` FK a `Usuario`: si se eliminara un usuario (no hay borrado) quedaría `SetNull`.

## Migration Plan

1. Respaldo de BD de producción.
2. `prisma migrate dev` en local → migración 1 (expand + backfill); revisar SQL generado a mano.
3. Actualizar `seed.ts` (no escribir campos legados; poblar `tipoEquipo`).
4. CI: `prisma validate`, `tsc`, `npm test`.
5. Producción: `prisma migrate deploy` (nunca `db push`), luego desplegar backend y frontend. Verificar conteos del backfill.
6. Tras un release estable y aprobación explícita: migración 2 (contract) que dropea las 3 columnas legadas.
7. **Rollback:** antes de contract, revertir despliegue de código (esquema retrocompatible); el estado nuevo se ignora. Después de contract, restore desde backup.

## Open Questions

Ninguna pregunta abierta pendiente para este change; todas las decisiones operativas, de notificación, de rate limiting y de ciclo de migración se encuentran formalmente cerradas.
