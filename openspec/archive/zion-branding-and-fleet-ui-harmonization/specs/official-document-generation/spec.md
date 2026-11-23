# Spec Delta: official-document-generation

## MODIFIED Requirements

### Requirement: Generación Automática de Orden de Servicio y Guía de Despacho en PDF
El sistema SHALL renderizar en formato PDF descargable la Orden de Servicio al ser agendada y la Guía de Despacho al despachar el camión, incorporando datos de transporte, resolución sanitaria y equipamiento, con membrete y pie institucional exclusivo de Zion Services.

#### Scenario: Emisión de PDF de Orden de Servicio al confirmar atención
- **GIVEN** una atención programada confirmada con recursos asignados
- **WHEN** el sistema procesa la confirmación de la orden
- **THEN** genera el documento PDF de la Orden de Servicio con folio único y lo indexa automáticamente en el expediente.
