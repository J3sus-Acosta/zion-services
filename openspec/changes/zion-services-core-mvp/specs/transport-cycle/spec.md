# Spec: Transport Cycle

## ADDED Requirements

### Requirement: Registro de Hitos Operativos en Terreno
La aplicación responsive del conductor SHALL permitir registrar los hitos cronológicos de cada ciclo de transporte: salida de origen, llegada al cliente, inicio de carga, fin de carga y salida del cliente.

#### Scenario: Registro ordenado de hitos de retiro
GIVEN un conductor ejecutando una jornada activa con inspección aprobada
WHEN marca sucesivamente `Llegada a Cliente`, `Inicio Carga` y `Fin Carga`
THEN el sistema almacena la marca de tiempo, usuario y ubicación reportada, actualizando el estado del ciclo de transporte en tiempo real.

### Requirement: Acta de Recepción Conforme, Observaciones y Negativa de Firma
El conductor SHALL registrar la recepción del servicio en el cliente capturando firma digital del encargado, o registrando recepción con observaciones, o dejando constancia expresa de negativa de firma sin falsear conformidad.

#### Scenario: Firma conforme en terreno por encargado de cliente
GIVEN el retiro completado en las instalaciones del cliente
WHEN el encargado del cliente firma digitalmente en el dispositivo móvil del conductor
THEN el sistema genera el acta de recepción en estado `CONFORME` e incorpora la firma con timestamp al expediente digital.

#### Scenario: Registro explícito de negativa de firma o inconformidad
GIVEN una situación donde el cliente no firma por discrepancia o ausencia de encargado
WHEN el conductor selecciona `Sin Firma / Rechazo de Firma` e ingresa la justificación y evidencia fotográfica
THEN el sistema registra el evento como `RECEPCION_SIN_FIRMA` con observaciones obligatorias, alertando a Operaciones sin inventar una aceptación tácita.
