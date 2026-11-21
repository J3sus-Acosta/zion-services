# Spec Delta

## MODIFIED Requirements

### Requirement: Checklist Preoperacional de Salida y Registro Fotográfico 360° en Planta Zion
Antes de salir de la Planta Zion, el conductor SHALL completar en la tablet el checklist preoperacional F-GMT-MAN-004 de 80 ítems agrupados con opción de verificación ágil y capturar obligatoriamente cuatro fotografías exteriores del vehículo (Frontal, Lateral Izquierda, Trasera y Lateral Derecha) mediante la cámara universal multiplataforma del dispositivo.

#### Scenario: Aprobación de salida con checklist y 4 fotos obligatorias
- **GIVEN** un camión en Planta Zion al inicio de su jornada
- **WHEN** el conductor completa en la tablet los ítems del checklist F-GMT-MAN-004 sin fallas críticas y captura las 4 fotos (Frontal, Lateral Izquierda, Trasera y Lateral Derecha)
- **THEN** el sistema califica la inspección como `CONFORME`, almacena las fotos con fecha, hora y geolocalización, y autoriza la salida del camión de la base.

#### Scenario: Bloqueo de salida por falta de registro fotográfico o falla crítica
- **GIVEN** una inspección donde se reporta un ítem crítico en estado Malo o el conductor intenta marcar salida omitiendo alguna de las 4 fotos obligatorias
- **WHEN** el conductor intenta registrar el inicio de ruta en la tablet
- **THEN** el sistema bloquea el despacho indicando que el checklist conforme y las 4 fotos perimetrales son requisitos obligatorios.

#### Scenario: Operación offline del checklist y sincronización automática
- **GIVEN** una tablet sin conexión a internet en el patio de maniobras de Planta Zion
- **WHEN** el conductor completa el checklist y captura las 4 fotos perimetrales
- **THEN** la tablet almacena la inspección localmente en IndexedDB y la sincroniza automáticamente con el servidor una vez restablecida la conectividad.

### Requirement: Checklist de Retorno a Planta Zion y Registro Fotográfico de Cierre
Al retornar el camión a la Planta Zion tras culminar la jornada local o el viaje fuera de Santiago, el conductor SHALL realizar en la tablet el checklist de retorno e ingresar kilometraje final y capturar nuevamente las 4 fotografías perimetrales para auditar la integridad del vehículo.

#### Scenario: Inspección de retorno y comparación visual perimetral
- **GIVEN** un vehículo que arriba a la base central de Zion
- **WHEN** el conductor completa el checklist de retorno en la tablet y se capturan las 4 fotos finales (Frontal, Lateral Izq, Trasera, Lateral Der)
- **THEN** el sistema registra el `RETORNO_A_PLANTA`, pone a disposición del Jefe de Operaciones la vista comparativa (fotos de salida vs. fotos de llegada) y documenta cualquier daño o herramienta faltante.
