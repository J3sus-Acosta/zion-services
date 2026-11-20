# transport-cycle Specification

## Purpose
TBD - created by archiving change zion-services-core-mvp. Update Purpose after archive.

## Requirements

### Requirement: Registro de Llegada a Faena y Firma de Orden de Trabajo
Al arribar a la dirección del cliente, el conductor SHALL registrar la hora exacta de llegada en la tablet Android y solicitar al encargado del cliente la firma digital de la Orden de Trabajo que autoriza el inicio de faena.

#### Scenario: Registro de llegada y autorización de inicio de labores
GIVEN el camión posicionado en la instalación del cliente
WHEN el conductor pulsa `Marcar Llegada` y el cliente revisa las condiciones y firma en la tablet la Orden de Trabajo
THEN el sistema estampa la hora de llegada, almacena la firma digital y el RUT del cliente, cambia el estado a `FAENA_AUTORIZADA` y desbloquea el módulo de evidencia fotográfica de faena.

### Requirement: Evidencia Fotográfica de Trabajo en Proceso y Uso de EPP
Inmediatamente después de firmada la Orden de Trabajo, el sistema SHALL permitir al conductor capturar y subir fotografías del trabajo en ejecución y de la verificación del uso de implementos de seguridad (EPP) por parte de la cuadrilla.

#### Scenario: Carga exitosa de fotografías de faena y seguridad laboral
GIVEN una faena con Orden de Trabajo firmada por el cliente
WHEN el conductor toma fotografías de la succión/limpieza en proceso y del personal operando con sus cascos, lentes, guantes, overol y arnés reglamentarios
THEN el sistema almacena las imágenes en el expediente digital con marca de tiempo y coordenadas GPS para respaldo ante inspecciones y clientes.

### Requirement: Acta de Recepción Conforme y Cierre de Faena en Tablet
Al concluir la extracción y limpieza, el cliente SHALL validar el trabajo firmando en la tablet el acta de recepción conforme, o registrando observaciones detalladas o constancia de negativa de firma sin falsear conformidad.

#### Scenario: Firma digital de recepción conforme en pantalla
GIVEN la succión concluida y las fotos de faena cargadas
WHEN el cliente valida los trabajos y firma la recepción conforme en la tablet
THEN el sistema genera el acta firmada, actualiza el estado a `RETIRO_COMPLETADO` y notifica por correo electrónico a Gestión Comercial y al cliente.

#### Scenario: Registro de recepción con observaciones o rechazo de firma
GIVEN una discrepancia o negativa del encargado a firmar la recepción
WHEN el conductor registra la causa en la tablet adjuntando foto de respaldo
THEN el sistema graba el estado como `RECEPCION_OBSERVADA` o `RECEPCION_SIN_FIRMA` y envía una alerta inmediata a Operaciones.
