# Spec Delta: document-dossier

## MODIFIED Requirements

### Requirement: Indexación Automática y Descarga Limpia de Paquetes ZIP
El sistema SHALL compilar en el paquete comprimido ZIP del expediente exclusivamente archivos físicos reales existentes en el volumen de almacenamiento local (`STORAGE_PATH`), incluyendo los PDFs oficiales generados, las fotografías originales de terreno y el manifiesto JSON estructurado, prohibiendo de manera terminante la inclusión de archivos simulados o extensiones ficticias `.txt`.

#### Scenario: Descarga completa del paquete ZIP con documentos y fotos físicas reales
- **GIVEN** una orden de servicio finalizada con actas PDF y fotografías de faena persistidas físicamente en disco
- **WHEN** un usuario autorizado solicita la descarga del archivo ZIP mediante `GET /api/expedientes/:ordenId/descargar-zip`
- **THEN** el sistema verifica la existencia física de cada archivo indexado en `STORAGE_PATH`, empaqueta en streaming los archivos reales junto con el manifiesto `MANIFIESTO_<FOLIO>.json`, y transmite el ZIP con encabezados `Content-Type: application/zip` y nombre normalizado.

#### Scenario: Resiliencia ante archivos faltantes en disco sin romper el streaming
- **GIVEN** un registro documental en base de datos cuyo archivo físico fue suprimido o no se encuentra disponible en disco
- **WHEN** el proceso de empaquetado ZIP itera sobre la lista de documentos del expediente
- **THEN** el sistema omite de manera segura el archivo faltante mediante comprobación previa con `fs.existsSync`, registra una advertencia en el log de auditoría y completa la generación del ZIP con los demás archivos íntegros sin interrumpir la conexión HTTP.

### Requirement: Streaming de Descarga Individual de Archivos del Expediente
El sistema SHALL proveer una ruta REST para la descarga individual en streaming de cualquier documento o fotografía del expediente, validando previamente el aislamiento por cliente (Tenant Isolation) y la existencia física del archivo binario en el volumen de disco persistente.

#### Scenario: Descarga individual autorizada con archivo existente en disco
- **GIVEN** un usuario autenticado con permisos sobre la orden solicitando un archivo específico vía `GET /api/expedientes/:ordenId/documentos/:documentoId/descargar`
- **WHEN** el archivo existe físicamente en la ruta resuelta bajo `STORAGE_PATH`
- **THEN** el sistema transmite el archivo binario mediante streaming nativo utilizando los encabezados HTTP apropiados (`Content-Type`, `Content-Disposition`, `Content-Length`).

#### Scenario: Bloqueo de descarga por archivo inexistente o violación de aislamiento
- **GIVEN** una solicitud de descarga donde el archivo físico no existe en disco o el usuario pertenece a una empresa cliente diferente a la de la orden
- **WHEN** el servidor procesa la petición
- **THEN** el sistema responde con el código de error correspondiente (HTTP 404 `FILE_NOT_FOUND` si no existe en disco, o HTTP 403 `TENANT_ISOLATION_VIOLATION` si no tiene autorización), protegiendo la integridad y confidencialidad del sistema.
