# Spec: Document Dossier

## ADDED Requirements

### Requirement: Expediente Digital Unificado por Atención
El sistema SHALL gestionar un expediente documental único por cada Orden de Servicio, admitiendo incorporación progresiva de archivos, control de versiones y metadatos de clasificación.

#### Scenario: Carga y categorización de documento en el expediente
GIVEN un usuario con permisos o un conductor en terreno
WHEN adjunta un archivo categorizado (ej. `GUIA_DESPACHO`, `HOJA_SEGURIDAD`, `TICKET_PESAJE`, `ACTA_RECEPCION`)
THEN el sistema valida tipo y peso del archivo, lo almacena en el volumen seguro persistente y registra autor, fecha y versión en el expediente.

### Requirement: Descarga Consolidada en Archivo ZIP
El sistema SHALL permitir la generación y descarga en tiempo real de un archivo comprimido (.zip) con todos los documentos aprobados del expediente de una atención.

#### Scenario: Generación exitosa de paquete ZIP del expediente
GIVEN un usuario autorizado (interno o cliente) consultando una atención
WHEN solicita la descarga del expediente completo
THEN el sistema empaqueta dinámicamente los documentos a los que el usuario tiene permiso de visualización, genera el archivo ZIP estructurado y lo entrega para descarga.
