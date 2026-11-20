# Spec: Journey Routing (Actualizado)

## ADDED Requirements

### Requirement: Gestión de Jornadas Locales e Interregionales
Operaciones SHALL programar jornadas locales (con retorno diario a planta) y viajes fuera de Santiago (interregionales), permitiendo pernoctación en ruta y difiriendo el checklist de retorno vehicular hasta la llegada definitiva a Planta Zion.

#### Scenario: Programación y ejecución de viaje fuera de Santiago
GIVEN un camión y conductor asignados a una ruta interregional de varios días
WHEN el camión realiza servicios y pernocta en la zona de faena
THEN el sistema mantiene la jornada activa bajo modalidad `VIAJE_INTERREGIONAL`, registrando hitos diarios sin exigir el regreso físico a Planta Zion entre días.

#### Scenario: Cierre definitivo de viaje interregional en Planta Zion
GIVEN el retorno del camión a la Planta de Zion tras culminar todos los trabajos fuera de Santiago
WHEN el vehículo ingresa a la base central de Zion
THEN se activa y ejecuta el checklist de retorno vehicular para auditar la integridad del camión, cerrando formalmente el viaje interregional.

### Requirement: Invariante Física de Descarga Intermedia Obligatoria
El motor de backend SHALL imponer que un camión jamás pueda realizar dos retiros consecutivos de residuos en faenas de clientes sin una visita intermedia a planta de destino con descarga y certificación de SIDREP.

#### Scenario: Rechazo automático de retiros encadenados sin descarga en destino
GIVEN una jornada donde se ejecutó el retiro en el Cliente A
WHEN el conductor o planificador intenta marcar inicio o llegada a Cliente B sin haber registrado la descarga y certificación en planta de destino del retiro A
THEN el backend bloquea la acción con código `INVARIANTE_DESCARGA_PENDIENTE`.
