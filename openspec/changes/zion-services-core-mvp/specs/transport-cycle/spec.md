# Spec: Transport Cycle (Actualizado)

## ADDED Requirements

### Requirement: Operación Digital en Tablet Android y Captura Fotográfica Progresiva
La aplicación para conductores en tablet Android SHALL permitir registrar hitos cronológicos y capturar con la cámara del dispositivo los documentos físicos generados en terreno en el momento exacto de su emisión.

#### Scenario: Captura inmediata de Guía de Despacho del cliente
GIVEN el conductor en la faena del cliente tras cargar el camión
WHEN el cliente le entrega la Guía de Despacho física o impresa
THEN el conductor toma la fotografía con la cámara de la tablet, el sistema la adjunta automáticamente al expediente de la atención y la sincroniza al servidor sin esperar el regreso a oficina.

### Requirement: Acta de Recepción y Cierre en Terreno en Tablet
Al finalizar los trabajos en faena, el cliente SHALL validar y firmar digitalmente en la pantalla de la tablet la recepción del servicio, con registro de observaciones o constancia explícita en caso de disconformidad o rechazo de firma.

#### Scenario: Firma digital de recepción conforme en tablet
GIVEN los trabajos de succión y retiro completados
WHEN el cliente firma en la pantalla táctil de la tablet indicando conformidad
THEN el sistema genera el acta de recepción digital firmada, la incorpora al expediente y notifica por correo electrónico al cliente y a Gestión Comercial.

#### Scenario: Registro de recepción disconforme o negativa de firma
GIVEN una discrepancia en el retiro o ausencia del encargado del cliente para firmar
WHEN el conductor selecciona `Recepción Disconforme` o `Sin Firma`, ingresando el motivo y fotos de respaldo
THEN el sistema graba el acta con estado `RECEPCION_OBSERVADA` o `RECEPCION_SIN_FIRMA`, alertando inmediatamente al Jefe de Operaciones.
