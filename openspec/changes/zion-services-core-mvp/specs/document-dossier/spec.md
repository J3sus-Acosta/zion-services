# Spec: Document Dossier (Actualizado)

## ADDED Requirements

### Requirement: Digitalización Progresiva en Terreno (Zero-Paper)
El sistema SHALL asegurar que todos los documentos físicos generados o recibidos durante la atención sean capturados y subidos al expediente digital en el mismo instante por el conductor usando la tablet Android, eliminando el escaneo tardío de documentos en oficina.

#### Scenario: Incorporación progresiva de documentos al expediente
GIVEN una atención en progreso
WHEN se ejecutan secuencialmente: 1) Descarga de SIDREP de Ventanilla Única, 2) Firma de inicio de faena en tablet, 3) Foto de Guía de Despacho del cliente, 4) Firma de recepción en tablet, y 5) Foto de SIDREP sellado por romana de destino
THEN cada documento queda registrado en el expediente en tiempo real, permitiendo a Operaciones y Gestión Comercial monitorear la documentación sin esperar la llegada física del camión a oficina.

### Requirement: Generación y Descarga de Expediente Consolidado en ZIP
El sistema SHALL generar dinámicamente un archivo ZIP con todos los documentos válidos de la atención clasificados por tipo para auditorías ambientales y respaldo del cliente.

#### Scenario: Descarga de expediente completo en archivo comprimido
GIVEN una Orden de Servicio completada
WHEN el cliente o el equipo comercial solicita descargar el expediente
THEN el sistema empaqueta en segundos todos los PDFs e imágenes de respaldo en un archivo ZIP nombrado con el folio de la OS y el nombre del cliente.
