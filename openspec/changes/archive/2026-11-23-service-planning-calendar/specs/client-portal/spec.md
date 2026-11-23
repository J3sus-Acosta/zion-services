# Spec Delta: client-portal

## ADDED Requirements

### Requirement: Solicitud Guiada Multi-Atención en Portal de Clientes
El Portal de Clientes SHALL proveer un formulario guiado para registrar solicitudes de servicio que agrupen una o múltiples fechas de atención programadas (por ejemplo, múltiples retiros en una semana), especificando sucursal, fecha y bloque horario preferente.

#### Scenario: Registro exitoso de solicitud con múltiples fechas de retiro
- **GIVEN** un cliente autenticado en el portal que requiere retiros en días diferenciados dentro de la misma semana
- **WHEN** completa el wizard de solicitud agregando tres atenciones (lunes, miércoles y viernes) con sus respectivas sucursales y horarios
- **THEN** el sistema registra la `SolicitudServicio` vinculando las tres instancias de `ItemAtencionProgramada` bajo el mismo folio de solicitud.

### Requirement: Selección Múltiple de Servicios del Catálogo por Atención
El Portal de Clientes SHALL permitir al cliente seleccionar uno o más servicios del catálogo oficial (tales como hidrojet, retiro manual de lodos o succión de RILes) para cada una de las atenciones configuradas dentro de la solicitud.

#### Scenario: Configuración de servicios específicos para una atención
- **GIVEN** un cliente configurando una atención dentro del formulario guiado
- **WHEN** selecciona los servicios requeridos desde el catálogo disponible
- **THEN** el sistema asocia los servicios seleccionados a dicho ítem de atención y valida los requerimientos de equipamiento asociados.

### Requirement: Estado Inicial Pendiente de Confirmación para Nuevas Atenciones
El sistema SHALL asignar automáticamente el estado PENDIENTE_CONFIRMACION a cada ítem de atención programada registrado por el cliente desde el portal, manteniéndolo visible para el cliente y disponible para revisión y agendamiento por el área comercial.

#### Scenario: Visualización de atenciones pendientes en el portal del cliente
- **GIVEN** una solicitud multi-atención enviada por el cliente
- **WHEN** el cliente consulta el historial de solicitudes en su portal
- **THEN** visualiza cada atención en estado `PENDIENTE_CONFIRMACION` con la indicación de que Gestión Comercial revisará la factibilidad y asignación horaria.
