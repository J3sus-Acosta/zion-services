# journey-routing Specification

## Purpose
TBD - created by archiving change zion-services-core-mvp. Update Purpose after archive.

## Requirements

### Requirement: Enrutamiento por Modalidad: Local Santiago vs. Viaje Interregional
Operaciones SHALL programar jornadas clasificadas en modalidad `LOCAL_SANTIAGO` o `VIAJE_INTERREGIONAL`, aplicando reglas de secuenciación adaptadas al alcance geográfico de la operación.

#### Scenario: Enrutamiento estricto en modalidad Local Santiago
GIVEN una jornada configurada como `LOCAL_SANTIAGO`
WHEN se programa la hoja de ruta
THEN el sistema impone la invariante física estricta: cada retiro de un cliente debe ir seguido inmediatamente de un tramo a planta de destino con descarga y certificación de SIDREP antes de autorizar cualquier otro retiro en la ciudad.

#### Scenario: Enrutamiento con traslados consecutivos en Viaje Interregional
GIVEN un camión asignado a una campaña fuera de Santiago en modalidad `VIAJE_INTERREGIONAL`
WHEN la hoja de ruta programa múltiples traslados o servicios consecutivos en la zona durante días continuos
THEN el sistema autoriza la ejecución de los servicios planificados en región, manteniendo el seguimiento de cada atención y postergando la descarga en planta autorizada de destino según la planificación logística regional.
