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
