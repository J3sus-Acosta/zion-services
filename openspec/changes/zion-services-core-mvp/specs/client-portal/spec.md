# Spec: Client Portal

## ADDED Requirements

### Requirement: Portal de Seguimiento y Aislamiento de Clientes
El sistema SHALL proporcionar un portal seguro para clientes donde cada empresa solo tenga visibilidad estricta de sus propias sucursales, solicitudes, atenciones y documentos autorizados.

#### Scenario: Prevención estricta de acceso cruzado entre clientes (Tenant Isolation)
GIVEN un usuario autenticado perteneciente al Cliente A
WHEN intenta acceder a los detalles, órdenes o documentos de una atención perteneciente al Cliente B
THEN el sistema deniega el acceso con código 403 Forbidden y registra un evento de advertencia de seguridad en la auditoría.

### Requirement: Visualización de Estados por Hitos Desacoplados
El cliente SHALL poder consultar el avance de su atención mediante hitos de estado claros (Solicitado, Planificado, En Ruta, En Faena, En Traslado a Destino, Descargado, Documentación Completa), sin exponer datos internos de costos o márgenes.

#### Scenario: Consulta de estado en tiempo real por el cliente
GIVEN una atención cuyo camión ha registrado la llegada a la faena del cliente
WHEN el usuario del cliente ingresa al portal a revisar su servicio
THEN el sistema muestra el estado operacional `EN_FAENA_RETIRO` con la hora de llegada, ocultando trazados de otros clientes o datos de tarifas internas.
