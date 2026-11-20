# Spec: Fleet Inspection

## ADDED Requirements

### Requirement: Checklist Preoperacional Obligatorio
El conductor asignado a un camión SHALL completar satisfactoriamente un checklist preoperacional digital antes de iniciar cualquier jornada de transporte.

#### Scenario: Aprobación de inspección vehicular completa
GIVEN un conductor asignado a un camión habilitado al inicio de una jornada
WHEN completa todos los puntos del checklist preoperacional sin observaciones críticas
THEN la inspección queda registrada como `CONFORME` y el camión queda habilitado para salir de planta Zion.

#### Scenario: Bloqueo de salida por hallazgo crítico en inspección
GIVEN una inspección donde se reporta falla en frenos, luces o fugas de fluidos calificadas como críticas
WHEN el conductor registra el hallazgo crítico en el checklist
THEN el sistema marca la inspección como `NO_CONFORME`, bloquea automáticamente el despacho del vehículo e impide registrar la salida de planta.

### Requirement: Levantamiento de Observaciones Auditado
Cualquier excepción o subsanación de una inspección rechazada SHALL requerir autorización explícita de la Jefatura de Operaciones con motivo documentado.

#### Scenario: Autorización excepcional de salida tras subsanación mecánica
GIVEN un camión bloqueado por inspección fallida que fue corregida por taller mecánico
WHEN el Jefe de Operaciones registra la orden de trabajo de reparación y autoriza el desbloqueo
THEN el sistema registra el desbloqueo con fecha, hora, usuario autorizante y justificación, habilitando la salida del vehículo.
