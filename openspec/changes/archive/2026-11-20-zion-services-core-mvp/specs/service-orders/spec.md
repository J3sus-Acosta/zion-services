# Spec: Service Orders (Actualizado)

## ADDED Requirements

### Requirement: Generación de Orden de Servicio y Autorización de Inicio de Trabajo
El sistema SHALL generar la Orden de Servicio digital con folio único inmutable y requerir la firma digital de autorización en la tablet Android del conductor por parte del cliente antes de iniciar cualquier faena de succión o limpieza.

#### Scenario: Emisión y carga de Orden de Servicio en tablet
GIVEN una solicitud aprobada comercialmente
WHEN el sistema emite la Orden de Servicio
THEN queda asignada a la jornada correspondiente y se sincroniza en la tablet del conductor asignado con datos de cliente, residuos a succionar y equipos requeridos.

#### Scenario: Autorización digital de inicio de trabajo por el cliente en faena
GIVEN el camión posicionado en la instalación del cliente
WHEN el encargado del cliente revisa las condiciones de seguridad y firma en la pantalla de la tablet la autorización de inicio
THEN el sistema estampa la firma, RUT y hora exacta, autorizando el encendido de bombas de hidrojet/succión y cambiando el estado a `FAENA_EN_EJECUCION`.
