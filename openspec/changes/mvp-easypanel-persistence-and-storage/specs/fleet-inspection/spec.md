# Spec Delta: fleet-inspection

## MODIFIED Requirements

### Requirement: Checklist Preoperacional de Salida y Registro Fotográfico 360° en Planta Zion
Antes de iniciar operaciones desde la base central de Zion, el conductor SHALL completar el checklist preoperacional F-GMT-MAN-004 de 80 ítems y capturar las 4 fotos perimetrales obligatorias (Frontal, Lateral Izquierda, Trasera y Lateral Derecha). El backend SHALL persistir transaccionalmente la inspección en la tabla `inspecciones_salida_fgmt` mediante Prisma, guardar los archivos de las 4 fotografías en el volumen local de disco persistente (`/app/uploads/inspecciones/`), registrar las filas en la tabla `fotos_inspeccion` con sus rutas relativas cortas (< 191 caracteres), e indexarlas de inmediato en el `ExpedienteDocumental`. Si se reporta una falla crítica, el sistema SHALL actualizar el estado del camión a `DESHABILITADO` persistiendo el motivo del bloqueo.

#### Scenario: Aprobación de salida con persistencia de checklist y 4 fotos perimetrales
- **GIVEN** un camión en Planta Zion y un conductor autenticado
- **WHEN** el conductor envía el formulario F-GMT-MAN-004 sin fallas críticas junto con las 4 fotos perimetrales en Base64 o Data URL
- **THEN** el sistema evalúa la conformidad, decodifica y escribe los 4 archivos de imagen en `/app/uploads/inspecciones/`, crea el registro `InspeccionSalida_F_GMT`, inserta las 4 entradas en `FotoInspeccion`, las indexa en el expediente documental, califica la inspección como `CONFORME` y autoriza la salida.

#### Scenario: Bloqueo de salida por falla crítica con persistencia en flota
- **GIVEN** una inspección preoperacional donde se marca al menos un ítem crítico como defectuoso
- **WHEN** el conductor envía la inspección al backend
- **THEN** el sistema califica el resultado como `NO_CONFORME`, persiste la inspección en base de datos, actualiza el registro del camión en la tabla `vehiculos` al estado `DESHABILITADO` con el motivo detallado de la falla crítica, y responde bloqueando el despacho del vehículo.

#### Scenario: Rechazo por omisión de fotos perimetrales obligatorias
- **GIVEN** un intento de registro de inspección de salida donde falta cualquiera de las 4 fotografías requeridas (Frontal, Lateral Izq, Trasera, Lateral Der)
- **WHEN** el payload llega al backend
- **THEN** el sistema rechaza la solicitud con código HTTP 400 (`INVALID_INSPECTION_PAYLOAD`), exigiendo la presencia y validez de las 4 vistas perimetrales para poder proceder.

### Requirement: Checklist de Retorno a Planta Zion y Registro Fotográfico de Cierre
Al retornar el camión a la Planta Zion tras culminar la jornada, el conductor SHALL completar en la tablet el checklist de retorno, registrando kilometraje final, horómetro final, estado de herramientas, daños detectados y capturando nuevamente las 4 fotografías perimetrales de cierre. El backend SHALL persistir transaccionalmente el registro en la tabla `inspecciones_retorno_planta`, almacenar las fotos físicas en disco persistente, registrarlas en `FotoInspeccion` e indexarlas en el expediente de la orden o jornada correspondiente.

#### Scenario: Persistencia de inspección de retorno y fotos comparativas finales
- **GIVEN** un camión que arriba a la base central de Zion al término de sus atenciones
- **WHEN** el conductor envía el reporte de retorno con kilometraje, horómetro, inventario de herramientas y las fotos de cierre
- **THEN** el sistema guarda las fotos físicas en el disco local persistente, crea el registro `InspeccionRetornoPlanta` en MySQL, asocia las imágenes en `FotoInspeccion`, actualiza el estado de la jornada a `FINALIZADA` y pone a disposición del Jefe de Operaciones la comparativa visual de salida versus llegada.
