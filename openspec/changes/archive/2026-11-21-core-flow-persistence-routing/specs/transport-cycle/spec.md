# transport-cycle Spec Delta

## MODIFIED Requirements

### Requirement: Registro de Llegada a Faena y Firma de Orden de Trabajo
Al arribar a la dirección del cliente, el conductor SHALL registrar la hora exacta de llegada en la tablet y solicitar al encargado del cliente la autorización de inicio de faena, capturando su firma corta manuscrita exclusivamente mediante trazo en pantalla táctil o stylus e ingresando obligatoriamente su Nombre, Apellido y RUT, sin permitir carga de imágenes externas ni certificados criptográficos.

#### Scenario: Registro de llegada y autorización de inicio de labores
- **GIVEN** el camión posicionado en la instalación del cliente
- **WHEN** el conductor pulsa `Marcar Llegada` y el encargado del cliente ingresa su nombre, apellido, RUT y traza su firma manuscrita corta directamente sobre la pantalla táctil de la tablet
- **THEN** el sistema estampa la hora de llegada, almacena el trazo de la firma y los datos del encargado, cambia el estado a `FAENA_AUTORIZADA` y desbloquea la captura de evidencias fotográficas de faena y EPP.
