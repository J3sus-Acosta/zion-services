# destination-weighing Specification

## Purpose
TBD - created by archiving change zion-services-core-mvp. Update Purpose after archive.

## Requirements

### Requirement: Integración y Obtención de Declaración SIDREP desde Ventanilla Única
El sistema SHALL permitir descargar y almacenar la Declaración de Residuos Peligrosos (SIDREP) oficial emitida por el cliente generador a través de la plataforma de Ventanilla Única ambiental.

#### Scenario: Descarga y vinculación inicial de SIDREP emitido por generador
GIVEN una Orden de Servicio planificada cuyo cliente generador ha emitido el SIDREP en Ventanilla Única
WHEN el sistema o el operador consulta/integra con Ventanilla Única mediante folio de declaración
THEN el documento SIDREP oficial en formato PDF queda vinculado a la atención y disponible en la tablet del conductor antes de la salida a terreno.

### Requirement: Captura Fotográfica de Certificación, Timbre y Ticket de Planta de Destino
El conductor en terreno SHALL utilizar la cámara de la tablet Android para capturar la Declaración SIDREP debidamente firmada, fechada y sellada por la romana de la planta de destino, junto al comprobante oficial de pesaje emitido por la planta autorizada.

#### Scenario: Registro de descarga y carga de SIDREP sellado y ticket de romana
GIVEN el camión habiendo completado la descarga en la planta de destino final autorizada
WHEN el conductor recibe el documento SIDREP timbrado con el sello oficial de la romana de destino y el ticket de pesaje
THEN el conductor fotografía ambos documentos con la cámara de la tablet, el sistema los valida y almacena en el expediente digital, y marca el ciclo de transporte como `DESCARGA_CERTIFICADA_DESTINO`.

#### Scenario: Prohibición de cierre de atención sin timbre de romana de destino
GIVEN un ciclo de transporte en planta de destino
WHEN se intenta registrar la salida de destino sin adjuntar la captura legible del SIDREP sellado por la planta
THEN el sistema impide avanzar la atención notificando que la certificación de romana de destino es requisito regulatorio obligatorio.
