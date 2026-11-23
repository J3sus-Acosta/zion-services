# Spec Delta

## MODIFIED Requirements

### Requirement: Checklist Preoperacional de Salida y Registro Fotográfico 360° en Planta Zion
Antes de salir de Planta Zion, el conductor SHALL completar el checklist preoperacional F-GMT-MAN-004 de 80 ítems y capturar 4 fotos perimetrales obligatorias (Frontal, Lateral Izq, Trasera, Lateral Der). La tablet Android/iOS SHALL persistir localmente las respuestas y fotografías durante la jornada activa ante recargas de página, y sincronizar inmediatamente la inspección completada al backend, incorporándola al expediente documental. Cuando la inspección reporte una falla crítica, el sistema SHALL deshabilitar el equipo mediante el estado único `DESHABILITADO` de la flota, persistiendo el motivo del bloqueo; mientras esté deshabilitado el equipo SHALL NOT despacharse.

#### Scenario: Aprobación de salida con checklist y 4 fotos obligatorias
- **GIVEN** un camión en Planta Zion al inicio de su jornada
- **WHEN** el conductor completa en la tablet los ítems del checklist F-GMT-MAN-004 sin fallas críticas y captura las 4 fotos (Frontal, Lateral Izquierda, Trasera y Lateral Derecha)
- **THEN** el sistema califica la inspección como `CONFORME`, almacena las fotos con fecha, hora y geolocalización, autoriza la salida del camión y asocia inmediatamente las fotos al expediente documental.

#### Scenario: Bloqueo de salida por falta de registro fotográfico o falla crítica
- **GIVEN** una inspección donde se reporta un ítem crítico en estado Malo o el conductor intenta marcar salida omitiendo alguna de las 4 fotos obligatorias
- **WHEN** el conductor intenta registrar el inicio de ruta en la tablet
- **THEN** el sistema bloquea el despacho indicando que el checklist conforme y las 4 fotos perimetrales son requisitos obligatorios y, en caso de falla crítica, deja el equipo `DESHABILITADO` con el motivo del bloqueo.

#### Scenario: Bloqueo de salida por equipo deshabilitado
- **GIVEN** un equipo en estado `DESHABILITADO` por cualquier causa (administrativa o por checklist)
- **WHEN** el conductor intenta registrar el inicio de ruta con ese equipo
- **THEN** el sistema bloquea el despacho e informa el motivo vigente de la deshabilitación.

#### Scenario: Operación offline del checklist y sincronización automática
- **GIVEN** una tablet sin conexión a internet en el patio de maniobras de Planta Zion
- **WHEN** el conductor completa el checklist y captura las 4 fotos perimetrales
- **THEN** la tablet almacena la inspección localmente en IndexedDB y la sincroniza automáticamente con el servidor e indexa en el expediente documental una vez restablecida la conectividad.

#### Scenario: Persistencia local durante jornada activa ante recarga o cierre accidental
- **GIVEN** un conductor completando el checklist o capturando las 4 fotos perimetrales en una tablet Android o iOS durante su jornada
- **WHEN** el navegador se recarga, la aplicación se minimiza o la pestaña se cierra y vuelve a abrirse
- **THEN** la tablet recupera inmediatamente el estado del checklist y las fotos previamente capturadas desde el almacenamiento local sin requerir reinicio del proceso.
