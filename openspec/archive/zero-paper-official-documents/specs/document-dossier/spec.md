# Spec Delta: document-dossier

## ADDED Requirements

### Requirement: Indexación Automática y Descarga Limpia de Paquetes ZIP
El sistema SHALL compilar en el paquete comprimido ZIP del expediente únicamente archivos reales y verificados (PDFs oficiales generados, manifiesto JSON y fotografías de faena), prohibiendo la generación de archivos de texto mock `.txt`.

#### Scenario: Descarga completa del paquete ZIP con documentos oficiales
- **GIVEN** una solicitud de descarga del expediente completo de una orden
- **WHEN** el usuario descarga el archivo ZIP
- **THEN** el paquete contiene los documentos PDF oficiales con firma y código QR, las fotografías originales de terreno y el manifiesto JSON de autenticidad.

### Requirement: Streaming de Descarga Individual de Archivos del Expediente
El sistema SHALL proveer una ruta REST para la descarga individual en streaming de cualquier archivo del expediente con validación estricta de aislamiento por cliente (Tenant Isolation).

#### Scenario: Descarga de archivo individual autorizada
- **GIVEN** un usuario autenticado solicitando un archivo específico del expediente
- **WHEN** pertenece a la empresa cliente correspondiente o es personal operativo de Zion Services
- **THEN** el sistema transmite el archivo con los encabezados HTTP correctos de tipo MIME y nombre de descarga.
