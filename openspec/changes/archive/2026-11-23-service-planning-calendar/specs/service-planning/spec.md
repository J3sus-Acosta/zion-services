# Spec Delta: service-planning

## Purpose
Proporciona capacidades integrales para la planificación visual e interactiva de atenciones operativas en un calendario multi-vista, validación de disponibilidad de camiones y conductores, control de tiempos de traslado intercomunales y reasignación comercial trazable.

## ADDED Requirements

### Requirement: Calendario Interactivo de Planificación Operativa
El sistema SHALL proporcionar en Gestión Comercial una vista de calendario interactivo con modos mes, semana y día, restringido a usuarios con rol COMERCIAL, ADMIN y JEFE_OPERACIONES, permitiendo consultar, filtrar y gestionar las atenciones de servicio programadas.

#### Scenario: Visualización de agenda operativa mensual
- **GIVEN** un usuario autenticado con rol `COMERCIAL` o `JEFE_OPERACIONES`
- **WHEN** accede a la sección de Agenda en Gestión Comercial
- **THEN** el sistema despliega el calendario en vista mensual reflejando las atenciones programadas diferenciadas por estado, camión y sucursal de cliente.

#### Scenario: Alternancia entre vistas de mes, semana y día
- **GIVEN** el usuario en la vista de calendario operativo
- **WHEN** selecciona la pestaña de vista semanal o diaria
- **THEN** la interfaz reconfigura la cuadrícula temporal mostrando el detalle horario de las atenciones asignadas para el intervalo seleccionado.

### Requirement: Detección y Bloqueo de Conflictos por Solapamiento Horario
El sistema SHALL impedir la asignación simultánea de un mismo camión o conductor a múltiples atenciones cuyos intervalos de fecha y horario programado coincidan, notificando el conflicto al operador y bloqueando la persistencia de la asignación.

#### Scenario: Intento de asignación simultánea de camión ocupado
- **GIVEN** un camión asignado a una atención programada de 09:00 a 13:00 en una fecha determinada
- **WHEN** el usuario comercial intenta asignar el mismo camión a otra atención dentro de ese mismo horario
- **THEN** el sistema bloquea la acción, muestra una alerta de colisión horaria y mantiene intacta la agenda previa.

#### Scenario: Intento de asignación de conductor ya ocupado
- **GIVEN** un conductor asignado a una ruta en un intervalo horario específico
- **WHEN** se intenta vincular dicho conductor a una segunda atención con solapamiento temporal
- **THEN** el sistema rechaza la asignación indicando el conflicto de disponibilidad del conductor.

### Requirement: Regla de Advertencia y Forzado con Justificación por Tiempos de Traslado
El sistema SHALL emitir una advertencia cuando el intervalo entre el término estimado de una atención y el inicio de la siguiente para un mismo camión o conductor sea inferior a 4 horas, permitiendo al usuario comercial forzar la asignación únicamente si ingresa una justificación obligatoria.

#### Scenario: Advertencia preventiva por ventana de traslado menor a 4 horas
- **GIVEN** un camión programado para finalizar una atención a las 12:00 en una comuna determinada
- **WHEN** el usuario intenta agendar una nueva atención para el mismo camión a las 14:00 del mismo día
- **THEN** el sistema presenta un modal de advertencia indicando que el margen es menor a las 4 horas requeridas para traslado y solicita justificación para proceder.

#### Scenario: Forzado de asignación con justificación obligatoria registrada
- **GIVEN** la advertencia de margen menor a 4 horas desplegada en pantalla
- **WHEN** el usuario comercial ingresa una justificación explícita y confirma la acción
- **THEN** el sistema permite guardar la asignación y registra la justificación y los datos de la operación en el log de auditoría.

### Requirement: Reasignación Comercial y Notificación In-App a Conductores
El sistema SHALL permitir al usuario comercial reasignar fecha, horario, camión o conductor de una atención programada, generando automáticamente una notificación in-app inmediata para el conductor o conductores involucrados mediante el registro en NotificacionConductor.

#### Scenario: Reasignación de unidad y aviso inmediato al conductor
- **GIVEN** una atención previamente programada con un conductor y vehículo
- **WHEN** el usuario comercial reasigna la atención a un nuevo conductor o modifica la fecha de ejecución
- **THEN** el sistema actualiza la asignación y genera de forma automática un registro en `NotificacionConductor` notificando al conductor asignado sobre los detalles del cambio.

### Requirement: Notificación por Correo Electrónico al Cliente ante Confirmación o Cambio de Agenda
El sistema SHALL enviar automáticamente una notificación por correo electrónico a la dirección registrada del cliente cada vez que una atención programada sea confirmada, reprogramada o reasignada en el calendario operativo.

#### Scenario: Despacho de correo al confirmar solicitud
- **GIVEN** una atención en estado `PENDIENTE_CONFIRMACION`
- **WHEN** el área comercial asigna recursos y confirma la fecha y horario de la atención
- **THEN** el sistema emite un correo electrónico al cliente confirmando la fecha, horario preferente y tipo de servicio acordado.

#### Scenario: Notificación al cliente por reprogramación de servicio
- **GIVEN** una atención ya programada cuya fecha o bloque horario es modificado por Gestión Comercial
- **WHEN** se confirman los cambios en el calendario operativo
- **THEN** el sistema despacha un correo electrónico informativo al contacto del cliente detallando la nueva programación.

### Requirement: Registro de Trazabilidad y Auditoría de Planificación
El sistema SHALL registrar un evento inmutable en AuditoriaEvento ante cualquier asignación forzada, reasignación de recursos, modificación de horario o confirmación de fecha, documentando el usuario responsable, fecha/hora, motivo y valores previos y posteriores.

#### Scenario: Registro de auditoría ante reasignación de recursos
- **GIVEN** una atención modificada por un usuario comercial
- **WHEN** se guardan los cambios en el calendario
- **THEN** el sistema persiste en `AuditoriaEvento` la acción con el identificador del usuario, marca de tiempo, valores anteriores y nuevos asignados.

### Requirement: Catálogo Administrable de Servicios y Plantas de Destino
El sistema SHALL proveer un catálogo administrable de tipos de servicio disponibles y plantas de destino autorizadas, permitiendo a los usuarios con rol comercial y operacional seleccionar opciones válidas durante la planificación de atenciones.

#### Scenario: Selección de servicios y planta autorizada en planificación
- **GIVEN** un operador comercial planificando una atención
- **WHEN** despliega los selectores de tipo de servicio y planta de destino
- **THEN** el sistema ofrece las opciones activas del catálogo (`ServicioCatalogo` y `PlantaDestino`) garantizando la integridad de los datos operacionales.
