# document-dossier Specification

## Purpose
Gestión y custodia del expediente digital unificado de cada orden de servicio en Zion Services, integrando documentos regulatorios oficiales en PDF, firmas electrónicas, evidencias fotográficas y descargas consolidadas en ZIP.

## Requirements

### Requirement: Expediente Digital Completo con Respaldo Gráfico Integral
El sistema SHALL compilar en el expediente digital de cada atención tanto los documentos reglamentarios como toda la evidencia fotográfica capturada durante la jornada: fotos 360° del camión (salida y retorno), fotos de faena en proceso, verificación de EPP de operarios, guías de despacho y SIDREP certificado por romana.

#### Scenario: Incorporación de evidencias gráficas y documentales al expediente
GIVEN una atención en ejecución
WHEN se cargan las fotos 360° del vehículo, la firma de inicio, las fotos de trabajo y EPP, la firma de recepción y el SIDREP sellado
THEN el expediente digital indexa cada ítem con su categoría, marca de tiempo y usuario responsable, manteniéndolo accesible en línea.

### Requirement: Generación y Descarga de Expediente Consolidado en ZIP
El sistema SHALL generar dinámicamente un archivo ZIP con todos los documentos y fotografías de la atención, clasificados ordenadamente en carpetas internas (`/documentos`, `/fotos_camion`, `/fotos_faena`).

#### Scenario: Descarga de paquete ZIP completo por cliente o auditoría
GIVEN una atención finalizada
WHEN un usuario autorizado solicita la descarga del expediente
THEN el sistema genera un archivo ZIP estructurado que contiene todos los archivos PDF e imágenes en alta resolución asociados a la orden.

### Requirement: Indexación Automática y Descarga Limpia de Paquetes ZIP
El sistema SHALL compilar en el paquete comprimido ZIP del expediente exclusivamente archivos físicos reales existentes en el volumen de almacenamiento local (`STORAGE_PATH`), incluyendo los PDFs oficiales generados, las fotografías originales de terreno y el manifiesto JSON estructurado, prohibiendo de manera terminante la inclusión de archivos simulados o extensiones ficticias `.txt`.

#### Scenario: Descarga completa del paquete ZIP con documentos oficiales
- **GIVEN** una solicitud de descarga del expediente completo de una orden
- **WHEN** el usuario descarga el archivo ZIP
- **THEN** el paquete contiene los documentos PDF oficiales con firma y código QR, las fotografías originales de terreno y el manifiesto JSON de autenticidad.

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

#### Scenario: Descarga de archivo individual autorizada
- **GIVEN** un usuario autenticado solicitando un archivo específico del expediente
- **WHEN** pertenece a la empresa cliente correspondiente o es personal operativo de Zion Services
- **THEN** el sistema transmite el archivo con los encabezados HTTP correctos de tipo MIME y nombre de descarga.

#### Scenario: Descarga individual autorizada con archivo existente en disco
- **GIVEN** un usuario autenticado con permisos sobre la orden solicitando un archivo específico vía `GET /api/expedientes/:ordenId/documentos/:documentoId/descargar`
- **WHEN** el archivo existe físicamente en la ruta resuelta bajo `STORAGE_PATH`
- **THEN** el sistema transmite el archivo binario mediante streaming nativo utilizando los encabezados HTTP apropiados (`Content-Type`, `Content-Disposition`, `Content-Length`).

#### Scenario: Bloqueo de descarga por archivo inexistente o violación de aislamiento
- **GIVEN** una solicitud de descarga donde el archivo físico no existe en disco o el usuario pertenece a una empresa cliente diferente a la de la orden
- **WHEN** el servidor procesa la petición
- **THEN** el sistema responde con el código de error correspondiente (HTTP 404 `FILE_NOT_FOUND` si no existe en disco, o HTTP 403 `TENANT_ISOLATION_VIOLATION` si no tiene autorización), protegiendo la integridad y confidencialidad del sistema.
