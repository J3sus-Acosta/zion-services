# Spec: Document Dossier (Actualizado v3)

## ADDED Requirements

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
