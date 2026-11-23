# Tasks

## 1. Modelado de Datos y Migraciones Prisma (Especialista: database-prisma)

- [x] 1.1 Modificar `backend/prisma/schema.prisma` para agregar el enum `EstadoAtencion` y los modelos `AtencionProgramada`, `ServicioCatalogo`, `AtencionServicioItem` y `PlantaDestino`, con sus relaciones hacia `SolicitudServicio`, `Vehiculo`, `Conductor`, `OrdenServicio` y `Jornada`, e índices compuestos para colisión horaria. Verificar mediante `npx prisma validate`.
- [x] 1.2 Ejecutar migración de Prisma `npx prisma migrate dev --name add_service_planning_models` para actualizar el esquema en la base de datos MySQL de desarrollo. Verificar que la migración se aplique exitosamente y genere las tablas `atenciones_programadas`, `servicios_catalogo`, `atencion_servicio_items` y `plantas_destino`.
- [x] 1.3 Crear script de inicialización / seed en `backend/prisma/seed-planning.ts` con catálogo base de servicios (`HIDROJET`, `RETIRO_LODOS_MANUAL`, `SUCCION_RILES`) y plantas de destino autorizadas en la Región Metropolitana. Verificar ejecutando `npx ts-node backend/prisma/seed-planning.ts` y comprobando los registros insertados en la base de datos.

## 2. Lógica de Negocio y Detección de Conflictos Backend (Especialista: backend-node)

- [x] 2.1 Crear esquemas de validación Zod en `backend/src/validators/planning.validator.ts` para `solicitudMultiAtencionSchema`, `asignarAtencionSchema`, `reasignarAtencionSchema` y `agendaQuerySchema`, incluyendo refinamiento para exigir justificación ($\ge 10$ caracteres) si `forzarConJustificacion` es verdadero. Verificar mediante tests unitarios en `backend/test/validators/planning.validator.spec.ts`.
- [x] 2.2 Implementar `backend/src/services/catalogo.service.ts` para obtener listas activas de `ServicioCatalogo` y `PlantaDestino`. Verificar mediante test unitario que retorne exclusivamente registros con flag activo.
- [x] 2.3 Implementar algoritmo de detección de solapamiento estricto e intervalo de traslado en `backend/src/services/planning.service.ts`: validar conflicto duro por colisión horaria de camión o conductor ($start_A < end_B \land end_A > start_B$) y advertencia de traslado si el intervalo entre faenas es menor a 4 horas (240 min). Verificar mediante tests unitarios en `backend/test/services/conflict-detection.spec.ts`.
- [x] 2.4 Implementar métodos transaccionales en `backend/src/services/planning.service.ts` para registro multi-atención, confirmación/asignación con generación de `OrdenServicio` y reasignación operativa. Verificar con tests de integración de servicios con base de datos de prueba.
- [x] 2.5 Integrar despacho de notificaciones y auditoría en `backend/src/services/planning.service.ts`: emisión de `NotificacionConductor`, registro inmutable en `AuditoriaEvento` (con usuario y justificación) y llamada al servicio de correo al cliente ante cambios de agenda. Verificar mediante tests unitarios con mocks de notificación y auditoría.

## 3. Controladores REST, Rutas y Autorización RBAC (Especialista: backend-node)

- [x] 3.1 Implementar controladores `backend/src/controllers/planning.controller.ts` y `backend/src/controllers/catalogo.controller.ts` manejando respuestas HTTP 200, 201, 400 y 409 con códigos de error estructurados (`ERROR_SOLAPAMIENTO_HORARIO`, `WARNING_INTERVALO_TRASLADO`). Verificar mediante tests con Supertest.
- [x] 3.2 Crear y proteger las rutas en `backend/src/routes/planning.routes.ts` y `backend/src/routes/catalogo.routes.ts` aplicando middleware de autenticación JWT y roles RBAC (`COMERCIAL`, `ADMIN`, `JEFE_OPERACIONES` para planificación; `CLIENTE` para solicitudes multi-atención). Verificar con tests de autorización HTTP 403 para roles no autorizados.
- [x] 3.3 Montar los routers en la aplicación Express principal (`backend/src/app.ts` o router central). Verificar realizando una petición HTTP GET de prueba a `/api/planning/agenda` y comprobando respuesta con status esperado.

## 4. Frontend: Wizard de Solicitud Multi-Atención en Portal de Clientes (Especialista: frontend-react)

- [x] 4.1 Crear componente `MultiServiceRequestWizard.tsx` en `frontend/src/components/client/` permitiendo seleccionar sucursal, múltiples servicios del catálogo y múltiples fechas/horarios preferentes con estado inicial `PENDIENTE_CONFIRMACION`. Verificar renderizado de los 3 pasos del wizard en modo interactivo.
- [x] 4.2 Integrar el wizard en `ClientPortalView.tsx` conectándolo con la API `POST /api/planning/solicitudes-multi` y manejando estados de carga, error y éxito con componentes canónicos del SATEM Design System. Verificar enviando una solicitud real de 3 fechas consecutivas y confirmando la recepción en backend.

## 5. Frontend: Calendario Interactivo y Gestión Comercial (Especialista: frontend-react)

- [x] 5.1 Implementar custom hook `frontend/src/hooks/useServiceCalendar.ts` para gestionar fechas seleccionadas, modo de vista (mes, semana, día), filtros de flota/conductor y fetching reactivo de atenciones. Verificar mediante tests de hook con React Testing Library.
- [x] 5.2 Desarrollar componentes de visualización modular bajo `frontend/src/components/commercial/calendar/`: `ServiceCalendar.tsx`, `CalendarGridMonth.tsx`, `CalendarGridWeek.tsx` y `CalendarGridDay.tsx` respetando tokens Dark Mode Premium de SATEM Design System. Verificar renderizado correcto y cambio fluido entre vistas mes/semana/día.
- [x] 5.3 Desarrollar modales interactivos `AssignmentModal.tsx` (para asignación y reasignación de unidad/conductor) y `OverrideWarningDialog.tsx` (para advertencia de intervalo < 4h con campo de justificación obligatoria). Verificar que ante respuesta HTTP 409 con advertencia se abra el diálogo solicitando justificación para reintentar con `forzarConJustificacion: true`.
- [x] 5.4 Integrar la pestaña 'Agenda' en `CommercialManagementView.tsx` habilitando el acceso condicional para roles `COMERCIAL`, `ADMIN` y `JEFE_OPERACIONES`. Verificar que la pestaña sea visible y operativa al autenticarse con el rol adecuado.

## 6. Testing Integral y Regresión (Especialista: tester)

- [x] 6.1 Ejecutar suite completa de tests de integración para el flujo de planificación: creación de solicitud multi-atención -> consulta en calendario -> bloqueo por solapamiento -> forzado de traslado con justificación -> reasignación y auditoría. Verificar que todos los tests pasen exitosamente con `npm test`.
- [x] 6.2 Validar que la regla de notificación in-app inserte correctamente el registro en `notificaciones_conductor` y que las acciones críticas queden persistidas en `auditoria_eventos`. Verificar consultando los registros resultantes tras la ejecución de las pruebas.

## 7. Revisión de Calidad, Seguridad y Diseño SATEM (Especialista: quality-reviewer)

- [x] 7.1 Realizar revisión estática de código verificando TypeScript strict (`npx tsc --noEmit`), ausencia de tipos `any`, controladores delgados y manejo centralizado de errores. Verificar que no existan errores ni advertencias de compilación.
- [x] 7.2 Auditar interfaces frontend creadas (`ServiceCalendar`, modales, wizard) para garantizar cumplimiento estricto del SATEM Design System: variables CSS oficiales, contraste mínimo 4.5:1 en dark mode, responsive design y sin inclusión de librerías CSS externas. Verificar visualmente y mediante linter.

## Workflow follow-up

- Archivar el change `service-planning-calendar` con `openspec archive service-planning-calendar` tras la aprobación de los reviews.
- Verificar el estado final sincronizado en las especificaciones maestras del repositorio.
