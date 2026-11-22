# fleet-inspection Specification

## Purpose
TBD - created by archiving change zion-services-core-mvp. Update Purpose after archive.

## Requirements

### Requirement: Checklist Preoperacional de Salida y Registro Fotográfico 360° en Planta Zion
Antes de salir de Planta Zion, el conductor SHALL completar el checklist preoperacional F-GMT-MAN-004 de 80 ítems y capturar 4 fotos perimetrales obligatorias (Frontal, Lateral Izq, Trasera, Lateral Der). La tablet Android/iOS SHALL persistir localmente las respuestas y fotografías durante la jornada activa ante recargas de página, y sincronizar inmediatamente la inspección completada al backend, incorporándola al expediente documental.

#### Scenario: Aprobación de salida con checklist y 4 fotos obligatorias
- **GIVEN** un camión en Planta Zion al inicio de su jornada
- **WHEN** el conductor completa en la tablet los ítems del checklist F-GMT-MAN-004 sin fallas críticas y captura las 4 fotos (Frontal, Lateral Izquierda, Trasera y Lateral Derecha)
- **THEN** el sistema califica la inspección como `CONFORME`, almacena las fotos con fecha, hora y geolocalización, autoriza la salida del camión y asocia inmediatamente las fotos al expediente documental.

#### Scenario: Bloqueo de salida por falta de registro fotográfico o falla crítica
- **GIVEN** una inspección donde se reporta un ítem crítico en estado Malo o el conductor intenta marcar salida omitiendo alguna de las 4 fotos obligatorias
- **WHEN** el conductor intenta registrar el inicio de ruta en la tablet
- **THEN** el sistema bloquea el despacho indicando que el checklist conforme y las 4 fotos perimetrales son requisitos obligatorios.

#### Scenario: Operación offline del checklist y sincronización automática
- **GIVEN** una tablet sin conexión a internet en el patio de maniobras de Planta Zion
- **WHEN** el conductor completa el checklist y captura las 4 fotos perimetrales
- **THEN** la tablet almacena la inspección localmente en IndexedDB y la sincroniza automáticamente con el servidor e indexa en el expediente documental una vez restablecida la conectividad.

#### Scenario: Persistencia local durante jornada activa ante recarga o cierre accidental
- **GIVEN** un conductor completando el checklist o capturando las 4 fotos perimetrales en una tablet Android o iOS durante su jornada
- **WHEN** el navegador se recarga, la aplicación se minimiza o la pestaña se cierra y vuelve a abrirse
- **THEN** la tablet recupera inmediatamente el estado del checklist y las fotos previamente capturadas desde el almacenamiento local sin requerir reinicio del proceso.

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
Al retornar el camión a la Planta Zion tras culminar la jornada local o el viaje fuera de Santiago, el conductor SHALL realizar en la tablet el checklist de retorno e ingresar kilometraje final y capturar nuevamente las 4 fotografías perimetrales para auditar la integridad del vehículo.

#### Scenario: Inspección de retorno y comparación visual perimetral
- **GIVEN** un vehículo que arriba a la base central de Zion
- **WHEN** el conductor completa el checklist de retorno en la tablet y se capturan las 4 fotos finales (Frontal, Lateral Izq, Trasera, Lateral Der)
- **THEN** el sistema registra el `RETORNO_A_PLANTA`, pone a disposición del Jefe de Operaciones la vista comparativa (fotos de salida vs. fotos de llegada) y documenta cualquier daño o herramienta faltante.
