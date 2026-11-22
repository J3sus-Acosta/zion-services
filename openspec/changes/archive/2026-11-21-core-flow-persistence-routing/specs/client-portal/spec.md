# client-portal Spec Delta

## MODIFIED Requirements

### Requirement: Visualización y Descarga de Expediente y Evidencias en Tiempo Real
El Portal de Clientes SHALL poner a disposición del cliente las fotografías perimetrales, fotografías de faena, firmas táctiles y documentación asociada exclusivamente centralizadas dentro del expediente documental de la atención (sin galería fotográfica independiente en vivo), garantizando que cada evidencia esté disponible para su previsualización y descarga individual o consolidada desde el momento exacto en que el conductor la sincroniza desde la tablet.

#### Scenario: Visualización instantánea de fotografías de faena cargadas por el conductor
- **GIVEN** un servicio en ejecución en las instalaciones del cliente
- **WHEN** el conductor captura y sincroniza cualquier fotografía de faena, EPP o perimetral desde la tablet
- **THEN** la imagen queda inmediatamente indexada y visible para descarga dentro del expediente documental del servicio en el portal de clientes, sin requerir una galería de fotos separada.

#### Scenario: Descarga de expediente completo y evidencias en tiempo real
- **GIVEN** un servicio completado con toda la documentación y firmas registradas
- **WHEN** el cliente solicita la descarga de los antecedentes
- **THEN** el portal permite descargar individualmente cada documento o generar un paquete consolidado con todas las evidencias, firmas y certificados asociados.
