# Spec: Fleet Inspection (Actualizado)

## ADDED Requirements

### Requirement: Checklist Preoperacional de Salida (Formato F-GMT-MAN-004)
El conductor asignado SHALL completar digitalmente en la tablet Android el checklist preoperacional corporativo oficial F-GMT-MAN-004 antes de iniciar cualquier despacho desde Planta Zion.

#### Scenario: Aprobación de inspección preoperacional completa
GIVEN un conductor asignado a un camión al inicio de una jornada en Planta Zion
WHEN inspecciona y evalúa como Bueno o No Aplica los 80 ítems distribuidos en Partes Mecánicas (26 ítems), Cabina (20 ítems), Equipamiento del estanque hidrojet/vacío (18 ítems) y Documentos/Señalética (16 ítems)
THEN el sistema registra la inspección preoperacional como `CONFORME`, guarda la firma digital del conductor y del supervisor, y habilita la salida del vehículo.

#### Scenario: Bloqueo automático por falla crítica de seguridad
GIVEN una inspección donde se reporta estado Malo en frenos, luces reglamentarias, dirección, válvulas de seguridad del estanque o extintor vencido
WHEN el conductor registra el hallazgo crítico en la tablet
THEN el sistema califica la inspección como `NO_CONFORME`, bloquea automáticamente el despacho del vehículo en el backend y notifica a Prevención de Riesgos y Jefatura de Operaciones.

### Requirement: Checklist de Retorno a Planta Zion
Al finalizar la jornada o al retornar el camión a la Planta de Zion tras trabajos interregionales fuera de Santiago, el conductor y supervisor SHALL realizar un checklist de retorno para verificar el estado de entrega del vehículo y equipamiento.

#### Scenario: Registro conforme de retorno a planta
GIVEN un camión que ingresa a la Planta Zion tras finalizar sus servicios
WHEN el conductor y el encargado completan el checklist de retorno verificando que no hubo daños en carrocería, estanque ni herramientas
THEN el sistema registra el checklist de retorno como `RETORNO_CONFORME` y da por cerrada la jornada del vehículo.

#### Scenario: Detección de daño o faltante en retorno a planta
GIVEN un vehículo que sufrió un percance menor, daño en mangueras de succión o faltante de herramientas en faena
WHEN se registra la observación y fotografías en el checklist de retorno
THEN el sistema genera un incidente operacional `RETORNO_CON_OBSERVACIONES`, documenta el estado en la bitácora del vehículo y notifica a Mantenimiento.
