# Spec Delta: client-portal

## ADDED Requirements

### Requirement: Consulta y Descarga Directa de Documentos Oficiales en PDF
El Portal de Clientes SHALL permitir la visualización y descarga directa de cada documento PDF oficial generado (Orden de Servicio, Guía de Despacho y Acta de Recepción Conforme con firma y QR) de forma individual.

#### Scenario: Descarga individual de acta firmada por el cliente
- **GIVEN** un cliente autenticado en el portal con una atención cerrada
- **WHEN** hace clic en el botón de descarga del Acta de Recepción Conforme
- **THEN** el sistema entrega inmediatamente el archivo PDF oficial con la firma del receptor estampada.

### Requirement: Feed en Tiempo Real de Novedades y Avance de Faena
El Portal de Clientes SHALL desplegar el feed en tiempo real de los hitos y novedades reportados por la cuadrilla en terreno durante la atención de su sucursal.

#### Scenario: Visualización de incidencia operacional en el portal
- **GIVEN** una cuadrilla que reporta congestión vehicular o retraso justificado
- **WHEN** el cliente revisa el estado de su servicio en curso
- **THEN** observa la alerta con la hora estimada actualizada sin necesidad de contactar al chofer por WhatsApp.
