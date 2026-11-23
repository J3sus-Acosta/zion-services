# Spec Delta

## Purpose

Gestionar la flota de equipos de Zion (camiones, camionetas y maquinaria): catálogo, alta y edición de características, y habilitación/deshabilitación con motivo, trazabilidad y continuidad de operaciones activas.

## ADDED Requirements

### Requirement: Catálogo de equipos de flota
El sistema SHALL exponer el listado y detalle de equipos con patente, tipoEquipo (`CAMION`, `CAMIONETA`, `MAQUINARIA`, `OTRO`), marca, modelo, anio, capacidadEstanqueM3, equipoHidrojet, equipoVacio, observaciones, estado (`HABILITADO`/`DESHABILITADO`) y motivo del estado, con filtros por tipoEquipo y estado.

#### Scenario: Listado de flota
- **GIVEN** un usuario autorizado y equipos registrados
- **WHEN** consulta el catálogo
- **THEN** el sistema devuelve los equipos con sus características y estado, incluidos los deshabilitados

#### Scenario: Filtro por estado y tipo
- **GIVEN** equipos de distintos tipos y estados
- **WHEN** el usuario filtra por tipoEquipo `MAQUINARIA` y estado `DESHABILITADO`
- **THEN** el sistema devuelve solo los equipos que cumplen ambos criterios

### Requirement: Alta y edición de equipos con validaciones
El sistema SHALL permitir crear y editar equipos validando toda entrada en servidor: patente obligatoria y única, tipoEquipo dentro del enumerado, marca y modelo obligatorios, anio entero válido, capacidadEstanqueM3 numérica no negativa, equipoHidrojet y equipoVacio booleanos. Un equipo nuevo SHALL quedar en estado `HABILITADO`. Los errores SHALL responder `{ error: { code, message } }`.

#### Scenario: Alta exitosa
- **GIVEN** un usuario con permiso de gestión de flota
- **WHEN** envía datos válidos de un equipo con patente no registrada
- **THEN** el sistema lo crea en estado `HABILITADO` y registra un evento de auditoría

#### Scenario: Patente duplicada
- **GIVEN** un equipo existente con patente `ABCD12`
- **WHEN** se intenta crear otro equipo con esa patente
- **THEN** el sistema rechaza la solicitud con error de conflicto y no crea el equipo

#### Scenario: Datos inválidos
- **WHEN** se envía un tipoEquipo fuera del enumerado, un anio no entero o una capacidad negativa
- **THEN** el sistema rechaza la solicitud con error de validación y detalle del campo

#### Scenario: Edición de características
- **GIVEN** un equipo existente
- **WHEN** un usuario autorizado modifica sus características con datos válidos
- **THEN** el sistema persiste los cambios y registra auditoría con los valores previos y nuevos

### Requirement: Estado único habilitado/deshabilitado con motivo
Cada equipo SHALL tener un único estado, `HABILITADO` o `DESHABILITADO`, que unifica la deshabilitación administrativa y el bloqueo por seguridad. Deshabilitar SHALL exigir un motivo no vacío. Un equipo `DESHABILITADO` SHALL NOT ser asignable a nuevas jornadas ni a nuevos despachos. Habilitar SHALL dejar el estado `HABILITADO` y registrar quién lo hizo.

#### Scenario: Deshabilitar con motivo
- **GIVEN** un equipo `HABILITADO` sin operaciones activas
- **WHEN** un usuario autorizado lo deshabilita indicando un motivo
- **THEN** el sistema lo deja `DESHABILITADO` con el motivo y registra auditoría

#### Scenario: Deshabilitar sin motivo
- **WHEN** se intenta deshabilitar un equipo sin motivo
- **THEN** el sistema rechaza la solicitud con error de validación y el estado no cambia

#### Scenario: Habilitar un equipo
- **GIVEN** un equipo `DESHABILITADO`
- **WHEN** un usuario autorizado lo habilita
- **THEN** el sistema lo deja `HABILITADO`, limpia el motivo vigente y registra auditoría

#### Scenario: Asignación de equipo deshabilitado
- **GIVEN** un equipo `DESHABILITADO`
- **WHEN** se intenta asignarlo a una jornada nueva
- **THEN** el sistema rechaza la asignación indicando que el equipo está deshabilitado y su motivo

### Requirement: Permisos por rol en la gestión de flota
El sistema SHALL autorizar en servidor la creación, edición y habilitación/deshabilitación de equipos solo a `ADMIN`, `SUPERADMIN` y `JEFE_OPERACIONES`, y toda ruta SHALL requerir autenticación. Cada deshabilitación SHALL registrar su origen (`MANUAL` o `CHECKLIST_SEGURIDAD`); los bloqueos `CHECKLIST_SEGURIDAD` SHALL poder levantarlos solo `ADMIN` y `SUPERADMIN`.

#### Scenario: Jefe de Operaciones deshabilita equipo
- **GIVEN** un usuario autenticado con rol `JEFE_OPERACIONES`
- **WHEN** deshabilita un camión o maquinaria con motivo
- **THEN** el sistema acepta la operación con origen `MANUAL`

#### Scenario: Jefe levanta bloqueo manual
- **GIVEN** un equipo deshabilitado con origen `MANUAL`
- **WHEN** `JEFE_OPERACIONES` lo habilita
- **THEN** el sistema acepta la operación

#### Scenario: Jefe intenta levantar bloqueo de checklist
- **GIVEN** un equipo deshabilitado con origen `CHECKLIST_SEGURIDAD`
- **WHEN** `JEFE_OPERACIONES` intenta habilitarlo
- **THEN** el sistema responde 403 y el equipo permanece `DESHABILITADO`

#### Scenario: Administrador levanta bloqueo de checklist
- **GIVEN** un equipo deshabilitado con origen `CHECKLIST_SEGURIDAD`
- **WHEN** `ADMIN` o `SUPERADMIN` lo habilita
- **THEN** el sistema acepta la operación y registra auditoría

#### Scenario: Rol no autorizado
- **GIVEN** un usuario con rol `CONDUCTOR` o `CLIENTE`
- **WHEN** intenta crear, editar o deshabilitar un equipo
- **THEN** el sistema responde 403 con `{ error: { code, message } }` y no modifica datos

#### Scenario: Sin autenticación
- **WHEN** se invoca la API de flota sin sesión válida
- **THEN** el sistema responde 401

### Requirement: Transferencia obligatoria al deshabilitar con operaciones activas
El sistema SHALL impedir deshabilitar un equipo con jornadas activas (`PROGRAMADA` o `EN_CURSO`) sin transferirlas a otro equipo `HABILITADO`, y SHALL informar antes las operaciones afectadas. Sin operaciones activas solo se exige motivo.

#### Scenario: Aviso de operaciones afectadas
- **GIVEN** un equipo con una jornada `EN_CURSO` y órdenes asociadas
- **WHEN** el usuario inicia la deshabilitación
- **THEN** el sistema muestra las jornadas y órdenes afectadas y exige elegir un equipo habilitado de reemplazo

#### Scenario: Deshabilitar con transferencia
- **GIVEN** un equipo con operación activa y otro equipo `HABILITADO`
- **WHEN** el usuario confirma con motivo y selecciona el equipo destino
- **THEN** el sistema deshabilita el origen y transfiere jornada, órdenes y expediente al destino en una sola transacción, con auditoría de la transferencia

#### Scenario: Deshabilitar sin destino
- **GIVEN** un equipo con jornadas activas
- **WHEN** el usuario intenta deshabilitarlo sin seleccionar equipo destino
- **THEN** el sistema responde 409 y el equipo permanece `HABILITADO`

#### Scenario: Destino no válido
- **WHEN** el equipo destino está `DESHABILITADO`, no existe o es el mismo equipo de origen
- **THEN** el sistema rechaza la operación completa sin cambios parciales

### Requirement: Reasignación de operaciones de un equipo ya deshabilitado
El sistema SHALL permitir reasignar las jornadas activas de un equipo ya `DESHABILITADO` (p. ej. por bloqueo de checklist o datos migrados) a otro equipo `HABILITADO` sin cambiar el estado del origen.

#### Scenario: Reasignar operaciones de un equipo bloqueado
- **GIVEN** un equipo `DESHABILITADO` con jornadas activas y otro equipo `HABILITADO`
- **WHEN** un usuario autorizado solicita transferir sus jornadas al equipo habilitado
- **THEN** el sistema transfiere las jornadas en una transacción con auditoría y el origen permanece `DESHABILITADO`

#### Scenario: Reasignar sin operaciones activas
- **WHEN** se solicita la reasignación de un equipo sin jornadas activas
- **THEN** el sistema responde 409 sin cambios

### Requirement: Tratamiento de inspecciones en la transferencia
Al transferir una jornada, el sistema SHALL tratar su inspección de salida según el estado de la jornada: en `PROGRAMADA` se desvincula y el equipo nuevo repite el checklist F-GMT; en `EN_CURSO` se conserva la original.

#### Scenario: Transferencia de jornada programada
- **GIVEN** una jornada `PROGRAMADA` con `inspeccionSalidaId` del equipo origen
- **WHEN** se transfiere a otro equipo
- **THEN** el sistema desvincula `inspeccionSalidaId` y exige al equipo nuevo completar el checklist F-GMT antes de salir

#### Scenario: Transferencia de jornada en curso
- **GIVEN** una jornada `EN_CURSO` con inspección de salida registrada
- **WHEN** se transfiere a otro equipo
- **THEN** el sistema conserva la inspección original asociada a la jornada

### Requirement: Auditoría de la gestión de flota
El sistema SHALL registrar en `AuditoriaEvento` los eventos de creación, edición, habilitación, deshabilitación y transferencia de operaciones, incluyendo usuario, equipo, motivo y detalle de cambios, sin datos sensibles.

#### Scenario: Registro de evento
- **WHEN** un usuario crea, edita, habilita o deshabilita un equipo
- **THEN** existe un evento con usuarioId, acción, recurso `Vehiculo`, recursoId, detalles y fecha/hora

#### Scenario: Auditoría de transferencia
- **WHEN** se transfiere una operación entre equipos
- **THEN** el evento registra equipo origen, equipo destino, y las jornadas u órdenes transferidas

### Requirement: Sin eliminación de equipos
El sistema SHALL NOT permitir eliminar equipos; la baja SHALL ser lógica mediante el estado `DESHABILITADO`, preservando historial de jornadas e inspecciones.

#### Scenario: Intento de eliminación
- **WHEN** se solicita eliminar un equipo
- **THEN** el sistema no ofrece ni ejecuta la eliminación y el equipo conserva su historial

### Requirement: Módulo Flota en la interfaz
El frontend SHALL ofrecer un módulo «Flota» con ruta propia e ítem de navegación visible solo a los roles autorizados, que liste equipos y permita crear, editar y habilitar/deshabilitar, con estados `loading`, `error`, `empty` y datos, siguiendo el SATEM Design System.

#### Scenario: Acceso por rol
- **GIVEN** un usuario `JEFE_OPERACIONES`, `ADMIN` o `SUPERADMIN`
- **WHEN** ingresa a la aplicación
- **THEN** ve el ítem «Flota» y puede abrir su ruta; otros roles son redirigidos

#### Scenario: Estados de carga, error y vacío
- **WHEN** el listado está cargando, falla la API o no hay equipos
- **THEN** la UI muestra respectivamente un indicador de carga, un mensaje de error con reintento y un estado vacío

#### Scenario: Confirmación de deshabilitación con operaciones activas
- **GIVEN** un equipo con operaciones activas
- **WHEN** el usuario pulsa deshabilitar
- **THEN** la UI exige motivo, lista operaciones afectadas y permite confirmar solo tras elegir un equipo habilitado de reemplazo

### Requirement: Notificación al conductor por transferencia de jornada
El sistema SHALL persistir una notificación in-app para el conductor de cada jornada transferida, consultable y marcable como leída desde la vista de tablet del conductor.

#### Scenario: Notificación por conductor afectado
- **GIVEN** una transferencia que afecta jornadas de dos conductores
- **WHEN** la transferencia se confirma
- **THEN** el sistema crea una notificación por conductor con patentes de equipo origen y destino, motivo y fecha

#### Scenario: Conductor ve solo las suyas
- **GIVEN** notificaciones de transferencia de varios conductores
- **WHEN** un conductor consulta sus notificaciones en la tablet
- **THEN** el sistema devuelve solo las propias y permite marcarlas como leídas

#### Scenario: Transferencia fallida sin notificación
- **WHEN** la transferencia falla y se revierte la transacción
- **THEN** el sistema no crea ninguna notificación

### Requirement: Rate limiting de la API de flota
El sistema SHALL limitar las solicitudes a `/api/flota` por usuario autenticado (por IP si no lo está): lectura hasta 120 por minuto y escritura o transferencia hasta 30 por minuto.

#### Scenario: Exceso en escritura
- **GIVEN** un usuario que alcanzó el límite de escritura del minuto
- **WHEN** envía otra solicitud de escritura o transferencia
- **THEN** el sistema responde 429 con cabecera `Retry-After` y `{ error: { code: 'RATE_LIMITED', message } }`

#### Scenario: Exceso en lectura
- **GIVEN** un usuario que superó 120 lecturas en un minuto
- **WHEN** consulta el catálogo de nuevo
- **THEN** el sistema responde 429 con `Retry-After` y código `RATE_LIMITED`

#### Scenario: Uso normal
- **WHEN** un usuario opera dentro de los límites
- **THEN** el sistema procesa las solicitudes sin restricción
