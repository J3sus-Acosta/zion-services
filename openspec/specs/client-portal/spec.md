# client-portal Specification

## Purpose
TBD - created by archiving change zion-services-core-mvp. Update Purpose after archive.

## Requirements

### Requirement: Consolidación Periódica en Estados de Pago (EDP)
Gestión Comercial SHALL consolidar múltiples Órdenes de Servicio completadas de un mismo cliente en un único Estado de Pago periódico (quincenal o mensual) para su revisión y habilitación a facturación.

#### Scenario: Generación exitosa de Estado de Pago consolidado
GIVEN un conjunto de Órdenes de Servicio ejecutadas con expedientes completos para un cliente durante una quincena o mes
WHEN Gestión Comercial genera el corte de liquidación
THEN el sistema agrupa las atenciones en un `EstadoDePago` consolidado, detalla cantidades y montos acordados en contrato, y emite la prefactura para aprobación del cliente.

#### Scenario: Validación de Orden de Compra previa a facturación
GIVEN un cliente contractual que exige Orden de Compra (OC) para emitir factura
WHEN el Estado de Pago se encuentra aprobado
THEN el sistema exige adjuntar la OC correspondiente antes de habilitar el botón de facturación formal.

### Requirement: Portal de Clientes con Tenant Isolation Estricto
El cliente SHALL acceder únicamente a sus datos, sus solicitudes de retiro, sus órdenes de servicio y a sus Estados de Pago consolidados, sin visibilidad alguna sobre otros clientes.

#### Scenario: Consulta de Estado de Pago y expedientes por el cliente
GIVEN un cliente autenticado en el portal
WHEN consulta sus atenciones del período
THEN visualiza el Estado de Pago emitido y puede descargar con un clic el paquete ZIP consolidado con todos los respaldos (SIDREP sellado, guías de despacho y actas firmadas en tablet).
