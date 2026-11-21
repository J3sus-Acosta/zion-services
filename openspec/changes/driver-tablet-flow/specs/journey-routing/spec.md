# Spec Delta

## ADDED Requirements

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
