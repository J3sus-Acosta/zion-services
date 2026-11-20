# Spec: Service Orders

## ADDED Requirements

### Requirement: Generación de Orden de Servicio (OS)
El sistema SHALL generar automáticamente una Orden de Servicio (OS) formal a partir de una solicitud aprobada comercialmente, asignándole un folio único e inmutable.

#### Scenario: Emisión exitosa de Orden de Servicio
GIVEN una solicitud en estado `APROBADA_COMERCIALMENTE`
WHEN el sistema o el analista comercial confirma la emisión de la orden
THEN se genera una nueva `OrdenDeServicio` con identificador único irrepetible, en estado `LISTA_PARA_PLANIFICAR`, vinculada al cliente, contrato y solicitud original.

#### Scenario: Prohibición de duplicación de OS para una misma solicitud
GIVEN una solicitud que ya cuenta con una Orden de Servicio activa
WHEN se intenta emitir una segunda Orden de Servicio para la misma solicitud
THEN el sistema rechaza la operación informando que la solicitud ya fue emitida previamente.

### Requirement: Inmutabilidad y Trazabilidad de la OS
La Orden de Servicio SHALL mantener un registro de auditoría con la cronología de eventos, personas responsables y especificaciones acordadas de retiro.

#### Scenario: Consulta de trazabilidad de Orden de Servicio
GIVEN una Orden de Servicio emitida
WHEN un usuario autorizado consulta el detalle de la orden
THEN el sistema retorna el historial completo de cambios de estado, fechas, usuario creador y documentos contractuales asociados.
