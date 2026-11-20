# Spec: Journey Routing

## ADDED Requirements

### Requirement: Planificación de Jornadas y Hojas de Ruta
Operaciones SHALL planificar jornadas asignando fecha, vehículo habilitado, conductor y la secuencia ordenada de atenciones a ejecutar.

#### Scenario: Creación de jornada con secuencia válida
GIVEN un vehículo con documentación al día, un conductor habilitado y órdenes de servicio en estado `LISTA_PARA_PLANIFICAR`
WHEN el planificador arma una jornada con ruta ordenada
THEN el sistema genera la `Jornada` y la `HojaDeRuta` con tramos iniciales en estado `PROGRAMADA`.

### Requirement: Invariante Física de Descarga Intermedia Obligatoria
El motor de backend SHALL validar e imponer que un camión jamás pueda realizar dos retiros consecutivos de clientes sin una visita intermedia a planta de destino con pesaje y descarga completa del retiro anterior.

#### Scenario: Intento de planificar o ejecutar dos retiros consecutivos sin descarga intermedia
GIVEN una jornada donde ya se programó o ejecutó el Retiro en Cliente A
WHEN un usuario o sistema intenta agendar o registrar la llegada/retiro en Cliente B sin un tramo previo a Planta de Destino con pesaje y descarga finalizada
THEN el sistema rechaza la transacción con código de error de negocio `INVARIANTE_DESCARGA_PENDIENTE`, bloqueando la acción tanto en planificación como en ejecución en terreno.

#### Scenario: Habilitación legítima del siguiente retiro tras descarga en destino
GIVEN un ciclo de transporte para el Retiro A cuya visita a Planta de Destino fue completada con pesajes de entrada/salida y descarga registrada
WHEN el camión solicita iniciar el tramo hacia el Cliente B
THEN el sistema valida la descarga del servicio anterior y autoriza la navegación y ejecución del Retiro B.
