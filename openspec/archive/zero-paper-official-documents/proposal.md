# Proposal: zero-paper-official-documents

## Why

Zion Services actualmente sufre una severa dependencia de la comunicación informal por WhatsApp (solicitudes por chat, fotos de faena en baja resolución, reporte de incidencias en audios personales) y del papel físico (talonarios impresos de órdenes de servicio y actas firmadas a mano). Esta brecha operativa genera duplicidad de trabajo, extravío de documentos, retrasos en la facturación y riesgos de fiscalización sanitaria.

Para lograr una operación 100% digital, trazable y sin papel ("Zero-Paper"), este cambio introduce la gestión integral de Clientes y Sucursales en la plataforma, un motor nativo de generación de documentos oficiales en PDF con firma digital táctil y código QR de autenticidad pública, la normalización de la descarga del expediente consolidado en ZIP y una bitácora de novedades operacionales en tiempo real para reemplazar WhatsApp.

## What Changes

- **Gestión Maestra de Clientes y Sucursales (CRM)**:
  - Creación de rutas y controladores REST `/api/empresas-clientes` y `/api/sucursales` con validación Zod (algoritmo Módulo 11 para RUT chileno, georreferenciación y contactos).
  - Eliminación de anti-patrones y datos hardcodeados/dummy en `solicitudes.routes.ts`, `user-management.service.ts` y `MultiServiceRequestWizard.tsx`.
  - Nueva vista de interfaz de usuario `ClientManagementView` y selectores reactivos `<EmpresaSelect />` y `<SucursalSelect />` con búsqueda predictiva.
- **Motor de Renderizado Documental PDF Oficial (PDFKit + QR)**:
  - Instalación de `pdfkit` y `qrcode` en backend para renderizado ultraligero y streaming nativo.
  - Implementación de 4 plantillas oficiales maquetadas con identidad corporativa SATEM:
    1. **Orden de Servicio (OS)**: Emitida automáticamente al confirmar y agendar la atención.
    2. **Guía de Despacho (GD)**: Documento oficial para traslado de residuos con resolución sanitaria de transporte.
    3. **Orden de Trabajo (OT)**: Detalle técnico y autorización de inicio de faena.
    4. **Acta de Recepción Conforme (ARC)**: Resumen post-faena con volumen retirado medido, fotos de faena, firma táctil del cliente y código QR de verificación.
  - Pipeline de persistencia de firmas táctiles capturadas desde la tablet y estampado vectorial en el PDF.
  - Endpoint público de verificación de autenticidad `GET /api/documentos/verificar/:hash` accesible vía QR sin requerir inicio de sesión.
- **Expediente Documental y Descarga ZIP Limpia**:
  - Corrección de `GET /api/expedientes/:ordenId/descargar-zip` para compilar los PDFs oficiales generados y fotos reales, eliminando los archivos mock `.txt`.
  - Endpoint de descarga individual para cada documento del expediente.
  - Normalización de URLs frontend mediante variable de entorno `VITE_API_URL` (eliminando `localhost:3000`).
- **Bitácora Operacional de Novedades e Incidencias (Anti-WhatsApp)**:
  - Modelo `BitacoraServicio` para registrar eventos en ruta y faena ("Tráfico pesado", "Acceso denegado/portón cerrado", "Falla de bomba") con fotos y georreferenciación en 1 clic desde la tablet.
  - Timeline en vivo en el Portal del Cliente y módulo de Operaciones para consulta en tiempo real.

## Capabilities

### New Capabilities
- `customer-management`: Gestión centralizada de empresas clientes, sucursales de faena, contactos comerciales/operativos y asignación de tarifas.
- `official-document-generation`: Generación digital de documentos oficiales (Orden de Servicio, Guía de Despacho, Orden de Trabajo y Acta de Recepción Conforme) en PDF con firmas táctiles estampadas y validación pública por código QR.
- `service-logbook`: Registro cronológico y trazable de eventos, novedades e incidencias de terreno para eliminar la coordinación por mensajería externa (WhatsApp).

### Modified Capabilities
- `client-portal`: Integración de la visualización de timeline de novedades en vivo, consulta de actas PDF con firma y código QR, y descarga de expedientes ZIP limpios sin mocks.
- `document-dossier`: Indexación automática de los PDFs generados en el expediente de la orden y streaming de descarga individual y consolidada.

## Impact

- **Backend**:
  - Nuevas dependencias: `pdfkit`, `@types/pdfkit`, `qrcode`, `@types/qrcode`.
  - Nuevas rutas y servicios: `empresa-cliente.routes.ts`, `sucursal.routes.ts`, `document-generator.service.ts`, `qr-verification.service.ts`, `bitacora.routes.ts`.
  - Migración Prisma: Nuevo modelo `BitacoraServicio` y campos de verificación criptográfica (`hashVerificacion`, `qrUrl`) en `DocumentoExpediente`.
- **Frontend**:
  - Nuevos componentes y vistas: `ClientManagementView.tsx`, `EmpresaSelect.tsx`, `SucursalSelect.tsx`, `IncidentReportModal.tsx`, `ServiceTimeline.tsx`.
  - Conexión dinámica a backend mediante `apiClient.ts` y `import.meta.env.VITE_API_URL`.
- **Seguridad**:
  - Validación de Tenant Isolation en todos los endpoints de clientes y expedientes.
  - Verificación pública de documentos por hash SHA-256 sin exponer datos confidenciales innecesarios.
