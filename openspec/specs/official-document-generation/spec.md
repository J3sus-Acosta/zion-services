# official-document-generation Specification

## Purpose

Permite generar digitalmente documentos operacionales oficiales en formato PDF con diseño institucional de Zion Services, firmas táctiles estampadas y código QR de verificación pública de autenticidad.

## Requirements

### Requirement: Generación Automática de Orden de Servicio y Guía de Despacho en PDF
El sistema SHALL renderizar en formato PDF descargable la Orden de Servicio al ser agendada y la Guía de Despacho al despachar el camión, incorporando datos de transporte, resolución sanitaria y equipamiento, con membrete y pie institucional exclusivo de Zion Services.

#### Scenario: Emisión de PDF de Orden de Servicio al confirmar atención
- **GIVEN** una atención programada confirmada con recursos asignados
- **WHEN** el sistema procesa la confirmación de la orden
- **THEN** genera el documento PDF de la Orden de Servicio con folio único y lo indexa automáticamente en el expediente.

### Requirement: Estampado de Firma Táctil en Acta de Recepción Conforme
El sistema SHALL capturar la firma táctil digitalizada en la tablet del conductor e insertarla vectorialmente en el PDF del Acta de Recepción Conforme junto con el nombre, RUT del receptor y marca de tiempo.

#### Scenario: Cierre de faena y emisión de acta firmada
- **GIVEN** una faena completada en las instalaciones del cliente
- **WHEN** el receptor firma en el dispositivo móvil y confirma el servicio
- **THEN** el sistema genera el Acta de Recepción Conforme en PDF con la firma estampada, volumen medido y fotografías de respaldo.

### Requirement: Verificación Pública de Autenticidad mediante Código QR
El sistema SHALL estampar en cada documento oficial un código QR enlazado a una URL pública de verificación criptográfica basada en el hash SHA-256 del documento.

#### Scenario: Escaneo de código QR por fiscalizador sanitario
- **GIVEN** un documento oficial emitido por Zion Services (en pantalla o impreso)
- **WHEN** un fiscalizador escanea el código QR con cualquier dispositivo
- **THEN** el navegador abre la página pública de verificación mostrando la autenticidad, folio, fecha y emisor sin requerir credenciales de acceso.
