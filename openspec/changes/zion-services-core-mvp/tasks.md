# Tasks: Implementación Zion Services Core MVP (Actualizado)

## 1. Scaffolding y Configuración Base del Monolito

- [ ] 1.1 Configurar estructura de monorepo (`backend/` Express/TypeScript y `frontend/` React/Vite/TypeScript) y verificar compilación base con `npm run build`.
- [ ] 1.2 Configurar Prisma ORM con MySQL 8 y verificar sintaxis de conexión mediante `npx prisma validate`.
- [ ] 1.3 Configurar variables de entorno y logger estructurado auditando no exposición de credenciales.

## 2. Modelo de Datos Prisma y Migraciones

- [ ] 2.1 Definir modelos de `Usuario`, `Rol`, `EmpresaCliente`, `SucursalFaena`, `ContratoCliente` y `EstadoDePago` en `schema.prisma`.
- [ ] 2.2 Definir modelos de `Vehiculo`, `Conductor`, `InspeccionSalida_F_GMT` (con los 80 ítems del checklist) e `InspeccionRetornoPlanta`.
- [ ] 2.3 Definir modelos de `SolicitudServicio`, `OrdenServicio`, `Jornada`, `HojaDeRuta`, `CicloTransporte`, `AutorizacionFaena` y `ActaRecepcion`.
- [ ] 2.4 Definir modelos de `VisitaDestino`, `CertificacionSIDREP`, `ExpedienteDocumental`, `Documento` e `HistorialEstado`.
- [ ] 2.5 Ejecutar la migración inicial estructurada con `npx prisma migrate dev --name init_zion_schema` y verificar integridad de tablas.

## 3. Seguridad, Autenticación y Tenant Isolation

- [ ] 3.1 Implementar autenticación JWT con HTTP-only cookies y rotación de refresh tokens.
- [ ] 3.2 Implementar middleware de autorización RBAC (`ADMIN`, `OPERACIONES`, `COMERCIAL`, `CONDUCTOR`, `CLIENTE`).
- [ ] 3.3 Implementar middleware de Tenant Isolation que impida a clientes acceder a datos o expedientes de otras empresas.

## 4. Dominio Comercial: Solicitudes, Órdenes y Estados de Pago

- [ ] 4.1 Implementar endpoints de creación de solicitudes de retiro (spot y contrato) con validación Zod.
- [ ] 4.2 Implementar flujo de revisión y aprobación comercial emitiendo Orden de Servicio con folio inmutable.
- [ ] 4.3 Implementar servicio de corte y generación de `EstadoDePago` periódico (quincenal/mensual) agrupando múltiples órdenes de servicio.
- [ ] 4.4 Implementar validación de Orden de Compra (OC) obligatoria para clientes contractuales antes de habilitar para facturación.

## 5. Flota y Checklists Bipolares (Salida F-GMT-MAN-004 y Retorno)

- [ ] 5.1 Implementar endpoint para registro del checklist preoperacional `F-GMT-MAN-004` (80 ítems) con bloqueo automático del camión ante fallas críticas.
- [ ] 5.2 Implementar protocolo de subsanación y desbloqueo auditado por Jefatura de Operaciones y Prevención de Riesgos.
- [ ] 5.3 Implementar endpoint para checklist de retorno vehicular a Planta Zion (auditoría de herramientas, mangueras y estado general tras viajes locales o interregionales).

## 6. Motor de Jornadas y Validación de Invariante de Descarga

- [ ] 6.1 Implementar planificación de jornadas locales y viajes interregionales fuera de Santiago con pernoctación en ruta.
- [ ] 6.2 Implementar motor de validación `JourneyValidationService` que bloquee estrictamente cualquier intento de retiro en cliente sin haber completado la descarga y certificación SIDREP del retiro anterior.
- [ ] 6.3 Escribir tests unitarios que verifiquen que el intento de iniciar un segundo retiro consecutivo retorne `INVARIANTE_DESCARGA_PENDIENTE`.

## 7. Terreno en Tablet Android: Firmas Digitales y Captura Fotográfica

- [ ] 7.1 Implementar módulo web responsive para tablet Android con canvas táctil para firma digital de inicio de faena por el cliente.
- [ ] 7.2 Implementar firma digital de recepción en pantalla táctil con opciones: conforme, disconforme con observaciones o constancia explícita de negativa de firma.
- [ ] 7.3 Implementar captura directa con cámara de tablet para Guías de Despacho, hojas de seguridad y comprobantes en terreno con compresión en cliente.

## 8. Destino: Ventanilla Única y Certificación SIDREP

- [ ] 8.1 Implementar conector/descarga del documento oficial SIDREP emitido por el generador desde Ventanilla Única.
- [ ] 8.2 Implementar endpoint de registro de llegada a planta de destino y subida de fotografía del SIDREP timbrado por romana y ticket de pesaje.
- [ ] 8.3 Validar que el ciclo de transporte no pueda cerrarse sin la evidencia fotográfica del timbre de romana en el SIDREP.

## 9. Expediente Digital Zero-Paper y Descarga ZIP

- [ ] 9.1 Implementar `FileStoragePort` con adaptador a volumen Docker persistente en el VPS.
- [ ] 9.2 Implementar servicio de expediente digital que compile en tiempo real todos los documentos subidos durante la atención.
- [ ] 9.3 Implementar empaquetador dinámico en archivo ZIP de todo el expediente de la atención para auditorías y descarga del cliente.

## 10. Frontend React con SATEM Design System y Cultura Zion

- [ ] 10.1 Inyectar tokens oficiales SATEM (Dark Mode `#0f172a`, acento `#00a896`, Outfit/Inter) en `src/index.css`.
- [ ] 10.2 Construir layout para tablet de conductores optimizado para ergonomía táctil (botones ≥ 38px, navegación por pasos).
- [ ] 10.3 Construir interfaz de Backoffice para Operaciones (planificación de jornadas, mapa de hitos, revisión de checklists).
- [ ] 10.4 Construir interfaz de Gestión Comercial (aprobación de solicitudes, generación de Estados de Pago periódicos y control de OC).
- [ ] 10.5 Construir Portal de Clientes con consulta de solicitudes, tracking de hitos y descarga de Estados de Pago con paquete ZIP.

## 11. Despliegue en VPS con EasyPanel y Validación E2E

- [ ] 11.1 Crear `Dockerfile` optimizado (multi-stage para Node y Nginx) y `docker-compose.yml` con volúmenes persistentes para MySQL y `/uploads`.
- [ ] 11.2 Configurar plantilla y variables de entorno en EasyPanel.
- [ ] 11.3 Ejecutar validación end-to-end simulando el ciclo completo en tablet: Checklist F-GMT-MAN-004 -> Salida -> Faena (Firma inicio + Guía de Despacho + Firma recepción) -> Destino (SIDREP sellado + Ticket romana) -> Siguiente retiro -> Retorno y Checklist de llegada.
