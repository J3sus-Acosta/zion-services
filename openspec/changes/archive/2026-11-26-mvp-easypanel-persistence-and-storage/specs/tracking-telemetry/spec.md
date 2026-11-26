# Spec Delta: tracking-telemetry

## ADDED Requirements

### Requirement: Persistencia Relacional de Telemetría GPS en MySQL
El sistema SHALL persistir todo reporte de posicionamiento geográfico transmitido desde las tablets en la tabla `registros_telemetria_gps` (`RegistroTelemetriaGPS`) mediante Prisma, registrando latitud, longitud, precisión en metros, velocidad en km/h, rumbo y marca de tiempo exacta, vinculándolo opcionalmente a la jornada y a la orden de servicio activa.

#### Scenario: Ingesta de telemetría GPS desde la tablet del conductor
- **GIVEN** un conductor en ruta con una jornada activa y señal GPS habilitada
- **WHEN** la aplicación tablet transmite periódicamente las coordenadas actuales (latitud, longitud, velocidad, precisión) al endpoint `POST /api/tracking/posicion`
- **THEN** el sistema inserta un registro en la tabla `registros_telemetria_gps` en MySQL y responde con confirmación HTTP 201.

#### Scenario: Consulta de última posición y trazabilidad en vivo
- **GIVEN** una orden de servicio o jornada en curso con registros de telemetría en la base de datos
- **WHEN** el operador o el cliente consulta el endpoint de seguimiento (`GET /api/clientes/ordenes/:id/tracking` o `GET /api/operaciones/flota-en-vivo`)
- **THEN** el sistema recupera el registro de telemetría más reciente (`ORDER BY timestamp DESC LIMIT 1`) de la base de datos y retorna las coordenadas actuales, velocidad y última hora de actualización.

### Requirement: Agregación de Evidencias en Vivo desde Base de Datos
El sistema SHALL construir la galería y el historial de evidencias operacionales en tiempo real consultando directamente las tablas relacionales `documentos_expediente` y `fotos_inspeccion` asociadas a la orden de servicio, prohibiendo el uso de almacenes o colecciones en memoria.

#### Scenario: Consulta de evidencias en vivo para portal cliente sin stores en memoria
- **GIVEN** una orden de servicio con fotos de inspección, firmas de autorización y fotos de faena persistidas en base de datos
- **WHEN** el cliente o el equipo de operaciones consulta las evidencias del servicio en el endpoint de tracking
- **THEN** el sistema realiza un join relacional contra `documentos_expediente` y responde con el listado completo de evidencias reales, incluyendo títulos, categorías, marcas de tiempo y URLs relativas de acceso a los archivos.

#### Scenario: Respeto estricto de Tenant Isolation en tracking y evidencias
- **GIVEN** un usuario autenticado con rol `CLIENTE` perteneciente a la Empresa A
- **WHEN** intenta acceder al tracking o evidencias de una orden de servicio perteneciente a la Empresa B
- **THEN** el sistema intercepta la solicitud mediante el middleware `enforceTenantIsolation` y responde con código HTTP 403 Forbidden (`TENANT_ISOLATION_VIOLATION`), denegando la visualización de coordenadas y evidencias ajenas.

### Requirement: Eliminación de Stores en Memoria y Consistencia tras Reinicio
El sistema SHALL erradicar por completo los objetos globales temporales en memoria (`TELEMETRIA_STORE` y `EVIDENCIAS_STORE`), garantizando que ante un reinicio del proceso Node.js o del contenedor Docker en EasyPanel no se pierda la última posición de los vehículos ni el histórico de evidencias recolectadas.

#### Scenario: Recuperación íntegra de estado tras reinicio de contenedor
- **GIVEN** un contenedor backend que es reiniciado o re-desplegado en EasyPanel mientras existen servicios en curso
- **WHEN** las tablets o el panel de supervisión reanudan sus solicitudes de seguimiento
- **THEN** el sistema responde con la última ubicación persistida en `registros_telemetria_gps` y todas las evidencias en `documentos_expediente` sin pérdida de datos ni discrepancias de estado.
