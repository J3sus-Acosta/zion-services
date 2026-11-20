# Spec: Destination Weighing

## ADDED Requirements

### Requirement: Registro y Preservación de Pesajes en Destino
El sistema SHALL registrar el pesaje de entrada (camión cargado) y el pesaje de salida (camión descargado) en la planta de destino, calculando la cantidad neta y preservando inmutablemente los pesajes brutos originales y sus comprobantes.

#### Scenario: Registro exitoso de pesajes y cálculo de residuo neto
GIVEN un camión ingresando a la planta de destino final tras realizar el retiro en el cliente
WHEN el conductor o el operador registra `pesoEntrada` = 18500 kg y tras descargar registra `pesoSalida` = 12200 kg junto a la foto del ticket
THEN el sistema calcula `pesoNetoDescargado` = 6300 kg, almacena ambos pesajes originales con unidad, fecha, hora y ticket, y marca la visita como `DESCARGA_COMPLETA`.

#### Scenario: Rechazo por pesajes inconsistentes o negativos
GIVEN el registro de pesaje en destino
WHEN el operador intenta registrar un `pesoSalida` mayor o igual que el `pesoEntrada`
THEN el sistema rechaza la transacción indicando que el peso de salida tras la descarga debe ser estrictamente menor al peso de entrada.

### Requirement: Registro de Antecedentes y Documentación SIDREP
El sistema SHALL registrar y relacionar los antecedentes, códigos y documentos del Sistema de Declaración y Seguimiento de Residuos Peligrosos (SIDREP) asociados a cada ciclo de transporte en destino.

#### Scenario: Vinculación de antecedentes SIDREP al ciclo de transporte
GIVEN una descarga completada en planta de destino
WHEN se ingresa el número de folio/declaración SIDREP y se adjunta el comprobante emitido
THEN el sistema asocia el antecedente SIDREP a la Orden de Servicio correspondiente y valida que la documentación regulatoria esté completa para el cierre del ciclo.
