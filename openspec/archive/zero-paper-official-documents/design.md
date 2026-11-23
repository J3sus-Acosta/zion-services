# Design: zero-paper-official-documents

## Context

Actualmente en el backend existen los modelos Prisma `EmpresaCliente`, `SucursalFaena` y `ContratoCliente`, pero carecen de rutas REST y pantallas de administración en el frontend. Esto forzó datos dummy hardcodeados en el asistente de solicitudes y el gestor de usuarios.

Por otra parte, `TouchSignaturePad.tsx` captura firmas táctiles en canvas, pero el backend solo responde con un JSON simulado sin persistir el archivo ni renderizar un documento PDF oficial. La descarga de expedientes en ZIP utiliza `archiver` en streaming, pero recurre a archivos `.txt` mock ante la inexistencia de PDFs reales y contiene enlaces con `http://localhost:3000` en frontend. Finalmente, no existe un canal unificado para incidencias de ruta/terreno, provocando dependencia de llamadas y WhatsApp.

## Goals / Non-Goals

**Goals:**
- Implementar un CRM completo y seguro de Empresas Clientes y Sucursales con validación estricta de RUT (Módulo 11) y selectores predictivos en frontend.
- Integrar un motor de renderizado PDF ultraligero (`pdfkit`) con estampación de firmas táctiles y códigos QR de verificación pública (`qrcode`).
- Garantizar la emisión de 4 plantillas oficiales SATEM: Orden de Servicio (OS), Guía de Despacho (GD), Orden de Trabajo (OT) y Acta de Recepción Conforme (ARC).
- Normalizar la descarga del expediente ZIP para que incluya exclusivamente documentos oficiales reales y fotos, eliminando archivos `.txt` mock.
- Reemplazar WhatsApp mediante un modelo `BitacoraServicio` y botones de reporte de incidencias en la tablet con timeline en el Portal del Cliente.
- Adaptar las llamadas HTTP del frontend a variables de entorno dinámicas (`VITE_API_URL`).

**Non-Goals:**
- Integración con el Servicio de Impuestos Internos (SII) para Facturación Electrónica DTE (se mantiene como proceso downstream contable).
- Integración con APIs de mensajería externa tipo Twilio/WhatsApp Business API (la meta es canalizar la trazabilidad dentro de la plataforma SATEM).
- Migración a sistemas de almacenamiento S3/Cloud Storage (se consolida en el adaptador de almacenamiento en disco con streaming).

## Decisions

### Decisión 1: Motor de Generación PDF — `PDFKit` vs `Puppeteer` / `Chromium`
- **Elección**: `PDFKit` (+ `@types/pdfkit`).
- **Razón**: `pdfkit` es una librería pura en Node.js, ultrarrápida (<50ms por documento), sin dependencias nativas complejas y consume <15MB de RAM. En contraste, `puppeteer` requiere empaquetar un navegador Chromium que pesa >400MB en la imagen Docker, consume >150MB de RAM por instancia y agrega latencia innecesaria en servidores VPS de recursos moderados.

### Decisión 2: Validación de Autenticidad Pública mediante Código QR y Hash SHA-256
- **Elección**: Generar un hash SHA-256 inmutable de cada documento oficial emitido y codificar en un QR una URL pública: `https://<dominio>/verificar-doc?hash=<hash>`.
- **Razón**: Permite a fiscalizadores sanitarios (SEREMI de Salud, SMA, Municipalidades) y clientes validar en terreno la veracidad del servicio y del residuo transportado sin necesidad de tener usuario o contraseña en la plataforma.

### Decisión 3: Estampado Vectorial y Persistencia de la Firma Táctil
- **Elección**: Convertir el DataURL base64 enviado desde `TouchSignaturePad` a un buffer PNG, almacenarlo de forma segura en `uploads/firmas/` y estamparlo vectorialmente en la sección designada del PDF del Acta de Recepción Conforme.
- **Razón**: Evita la pérdida de evidencia legal y asegura que el documento final represente fielmente la autorización del cliente.

### Decisión 4: Bitácora de Novedades (Anti-WhatsApp) con Soporte Offline
- **Elección**: Modelo relacional `BitacoraServicio` vinculado a `OrdenServicio` con tipos de evento tipificados (`TRAFICO`, `ACCESO_DENEGADO`, `FALLA_EQUIPO`, `VOLUMEN_DISCREPANTE`, `OBSERVACION_GENERAL`), con cola en IndexedDB en la tablet cuando no haya cobertura celular.
- **Razón**: Resuelve de raíz el principal motivo de uso de WhatsApp por los choferes: avisar cuando están parados fuera de la planta del cliente o cuando hay retrasos de tránsito.

## Risks / Trade-offs

- **[Risk]** Dispositivos móviles sin conexión al momento de capturar una incidencia o firma.
  - → *Mitigación*: Extender `OfflineStorageService` para almacenar firmas e incidencias en IndexedDB local y sincronizarlas automáticamente en cuanto retorne la conectividad.
- **[Risk]** Consumo excesivo de memoria al generar ZIPs con múltiples PDFs pesados.
  - → *Mitigación*: Utilizar streaming directo de `archiver` hacia la respuesta HTTP sin retener el archivo completo en memoria RAM del servidor.
- **[Risk]** Intentos de acceso cruzado entre clientes en endpoints de documentos.
  - → *Mitigación*: Middleware de Tenant Isolation estricto que verifica la propiedad de la orden contra el `empresaClienteId` del token JWT.

## Migration Plan

1. Crear y ejecutar migración Prisma controlada (`npx prisma migrate dev --name add_zero_paper_and_crm_models`) para tablas `empresas_clientes`, `sucursales_faenas`, `bitacoras_servicios` y campos de hash de verificación.
2. Instalar dependencias backend (`npm install pdfkit qrcode && npm install -D @types/pdfkit @types/qrcode`).
3. Desplegar endpoints de backend y actualizar seeds con clientes reales del pipeline.
4. Construir y verificar producción con `npm run build` en backend y frontend.
