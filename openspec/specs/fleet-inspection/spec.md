# fleet-inspection Specification

## Purpose
TBD - created by archiving change zion-services-core-mvp. Update Purpose after archive.

## Requirements

### Requirement: Checklist Preoperacional de Salida y Registro Fotográfico 360° en Planta Zion
Antes de salir de la Planta Zion, el conductor y supervisor SHALL completar el checklist preoperacional F-GMT-MAN-004 y capturar obligatoriamente cuatro fotografías del estado exterior del vehículo: Frontal, Lateral Izquierda, Trasera y Lateral Derecha.

#### Scenario: Aprobación de salida con checklist y 4 fotos obligatorias
GIVEN un camión en Planta Zion al inicio de su jornada
WHEN el conductor completa los 80 ítems del checklist F-GMT-MAN-004 sin fallas críticas y captura en la tablet las 4 fotos (Frontal, Lateral Izquierda, Trasera y Lateral Derecha)
THEN el sistema califica la inspección como `CONFORME`, almacena las fotos con fecha y hora, y autoriza la salida del camión de la base.

#### Scenario: Bloqueo de salida por falta de registro fotográfico o falla crítica
GIVEN una inspección donde se reporta un ítem crítico en estado Malo o el conductor intenta marcar salida omitiendo alguna de las 4 fotos obligatorias
WHEN el conductor intenta registrar el inicio de ruta
THEN el sistema bloquea el despacho indicando que el checklist conforme y las 4 fotos perimetrales son requisitos obligatorios.

### Requirement: Autochecklist Diario de Ruta en Viajes Fuera de Santiago
Durante viajes interregionales fuera de Santiago, el conductor SHALL completar cada mañana antes de operar un checklist rápido de autocontrol en ruta a través de la tablet Android, transmitiendo el reporte a la Jefatura de Operaciones en Santiago.

#### Scenario: Autocontrol matutino exitoso en faena remota
GIVEN un camión operando en una región fuera de Santiago en su segundo día de viaje
WHEN el conductor completa la verificación de frenos, neumáticos, luces, estanque y mangueras en la tablet y firma digitalmente
THEN el sistema habilita el inicio de operaciones del día y actualiza el panel de supervisión remota en Santiago con estado `EN_RUTA_OK`.

#### Scenario: Alerta remota por falla mecánica en faena regional
GIVEN un conductor que detecta un problema en una válvula o fuga de líquido en el autocontrol diario en región
WHEN marca la observación en el autochecklist de ruta
THEN el sistema emite una alerta crítica prioritaria en el panel del Jefe de Operaciones en Santiago y bloquea la operación hasta coordinar soporte técnico.

### Requirement: Checklist de Retorno a Planta Zion y Registro Fotográfico de Cierre
Al retornar el camión a la Planta Zion tras culminar la jornada local o el viaje fuera de Santiago, el conductor y supervisor SHALL realizar un checklist de retorno y capturar nuevamente las 4 fotografías perimetrales para auditar la integridad del vehículo.

#### Scenario: Inspección de retorno y comparación visual perimetral
GIVEN un vehículo que arriba a la base central de Zion
WHEN se completa el checklist de retorno y se capturan las 4 fotos finales (Frontal, Lateral Izq, Trasera, Lateral Der)
THEN el sistema registra el `RETORNO_A_PLANTA`, pone a disposición del Jefe de Operaciones la vista comparativa (fotos de salida vs. fotos de llegada) y documenta cualquier daño o herramienta faltante.
