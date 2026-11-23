# Proposal: Planificación Visual de Servicios y Calendario Operativo

## Why
Actualmente, la coordinación operativa y comercial de Zion Services carece de una herramienta centralizada e interactiva para programar y visualizar atenciones en un calendario mensual, semanal o diario. Esto provoca riesgos de solapamiento de camiones o conductores, demoras en la confirmación de solicitudes de clientes con múltiples fechas de retiro y falta de validación de tiempos mínimos de traslado entre faenas distantes.

## What Changes
- Implementación de un calendario interactivo multi-vista (mes, semana, día) en Gestión Comercial (`CommercialManagementView.tsx`) para roles `COMERCIAL`, `ADMIN` y `JEFE_OPERACIONES`.
- Creación de un formulario guiado en el Portal de Clientes (`ClientPortalView.tsx`) que permite solicitar múltiples atenciones programadas por solicitud (ej. lunes, miércoles y viernes), con selección de servicios del catálogo y planta de destino.
- Validación automática de asignaciones para prevenir solapamientos de horario en un mismo camión o conductor.
- Regla de negocio de 4 horas mínimas entre el término de una atención y el inicio de la siguiente para traslados intercomunales, con advertencia y opción de forzado justificado obligatorio.
- Mecanismo de reasignación y edición de atenciones que despacha notificaciones in-app a conductores (`NotificacionConductor`) y correos electrónicos de confirmación o reprogramación al cliente.
- Trazabilidad y auditoría completa de modificaciones y asignaciones forzadas en `AuditoriaEvento`.
- Catálogo administrable de servicios (`ServicioCatalogo`) y plantas autorizadas (`PlantaDestino`).

## Capabilities

### New Capabilities
- service-planning: Planificación visual e interactiva de servicios, asignación de unidades y conductores con detección de conflictos y alertas de traslado.

### Modified Capabilities
- client-portal: Registro guiado de solicitudes de retiro con múltiples atenciones programadas y selección de servicios.
- service-orders: Vinculación individual de atenciones programadas a órdenes de servicio y jornadas de ruta.

## Impact
- **Backend**: Nuevos endpoints y servicios para planificación (`/api/planning`), gestión de atenciones programadas, catálogos (`ServicioCatalogo`, `PlantaDestino`) y validación de disponibilidad horaria.
- **Base de Datos**: Modelos en Prisma ORM para `SolicitudServicio`, `ItemAtencionProgramada`, `ServicioCatalogo`, `PlantaDestino`, con relaciones a `OrdenServicio`, `Jornada`, `Vehiculo` y `Usuario`.
- **Frontend**: Integración del componente de calendario mensual/semanal/diario en `CommercialManagementView.tsx` y actualización del wizard de solicitud en `ClientPortalView.tsx` bajo el SATEM Design System.
- **Seguridad y Auditoría**: Control de acceso RBAC para roles comerciales y operacionales, y persistencia de eventos de auditoría para asignaciones forzadas.
- **Notificaciones**: Integración con despacho de notificaciones in-app para conductores y servicio de correo electrónico para clientes.
