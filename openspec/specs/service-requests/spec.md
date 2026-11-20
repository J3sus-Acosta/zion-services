# service-requests Specification

## Purpose
TBD - created by archiving change zion-services-core-mvp. Update Purpose after archive.

## Requirements

### Requirement: Solicitud de Retiro por Cliente
El sistema SHALL permitir a clientes contractuales y esporádicos (spot) registrar solicitudes formales de retiro de residuos con ubicación, tipo de residuo, cantidad estimada y fecha preferente.

#### Scenario: Creación exitosa de solicitud por cliente contractual
GIVEN un cliente contractual autenticado con contrato vigente
WHEN envía una solicitud de retiro con faena/sucursal autorizada, tipo de residuo y fecha requerida
THEN el sistema crea la solicitud en estado `PENDIENTE_VALIDACION` y envía notificación de confirmación al cliente y a Gestión Comercial.

#### Scenario: Rechazo de solicitud por falta de datos requeridos
GIVEN un cliente autenticado en el portal
WHEN intenta enviar una solicitud omitiendo la ubicación de retiro o el tipo de residuo
THEN el sistema rechaza la solicitud con error 400 indicando los campos obligatorios faltantes.

### Requirement: Clasificación y Validación Comercial
Gestión Comercial SHALL revisar, clasificar y validar la viabilidad comercial y operativa de cada solicitud antes de autorizar su planificación.

#### Scenario: Aprobación comercial de solicitud spot
GIVEN una solicitud de cliente spot en estado `PENDIENTE_VALIDACION`
WHEN el usuario con rol `COMERCIAL` verifica la cotización o aceptación comercial y aprueba la solicitud
THEN la solicitud pasa a estado `APROBADA_COMERCIALMENTE` y queda disponible para generación de Orden de Servicio.

#### Scenario: Rechazo o solicitud de aclaración comercial
GIVEN una solicitud con inconsistencias de residuos o fuera de cobertura contractual
WHEN el usuario comercial rechaza o solicita aclaración con motivo justificado
THEN el sistema actualiza la solicitud a `RECHAZADA` o `OBSERVADA` y notifica por correo al cliente con el motivo.
