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

### Requirement: Seguimiento GPS y Georreferenciación por Hitos desde la Tablet
La aplicación en la tablet del conductor SHALL monitorear en todo momento la ubicación geográfica del camión vía GPS y estampar coordenadas geográficas verificadas en cada hito operativo clave del servicio (Salida de Planta, Llegada a Faena, Cierre de Faena, Llegada a Planta Destino y Retorno a Planta Zion), transmitiendo el estado a la Jefatura de Operaciones.

#### Scenario: Visualización continua de ubicación en tablet y registro de hito
- **GIVEN** un servicio activo ejecutándose en la tablet del conductor
- **WHEN** el conductor navega en el flujo o completa un hito operacional del servicio
- **THEN** la tablet muestra el estado del sensor GPS en pantalla, captura latitud y longitud actuales y transmite las coordenadas asociadas al hito al backend.

#### Scenario: Manejo de pérdida temporal de señal GPS o conectividad
- **GIVEN** una tablet operando en un subterráneo o zona sin señal GPS o sin red móvil durante un hito
- **WHEN** el conductor confirma la acción del hito operativo
- **THEN** el sistema registra la última coordenada conocida con marca de tiempo, advierte el estado en pantalla y encola el evento para transmisión tan pronto se recupere la señal.
