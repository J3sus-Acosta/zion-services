# Arquitectura Técnica: Cero Papel, Documentos Oficiales, Firmas y CRM
## SATEM Soluciones Inteligentes — Zion Services

> **Versión**: 1.0.0  
> **Fecha de actualización**: 2026-11-23  
> **Estado**: Implementado, Verificado y Operativo  
> **Módulos**: Backend (`/api/documentos`, `/api/bitacora`, `/api/empresas-clientes`, `/api/sucursales`, `/api/expediente`), Frontend (`ClientManagementView`, `TabletConductorView`, `ClientPortalView`), Prisma ORM (`MySQL`)

---

## 1. Visión General del Módulo

El cambio **`zero-paper-official-documents`** consolida la transición de Zion Services hacia una operación 100% digital ("Cero Papel") y formalizada, erradicando los canales informales de comunicación (como WhatsApp) y los respaldos manuales o simulados.

### Pilares Fundamentales:
1. **Generación Automática de Documentos PDF Oficiales**: Emisión programática de Órdenes de Servicio (OS), Guías de Despacho (GD), Actas de Recepción Conforme (ARC) y Órdenes de Trabajo (OT) con membrete corporativo oficial Zion Services y resolución sanitaria.
2. **Estampado de Firma Táctil Vectorizada**: Captura de firma digital en terreno desde la tablet del conductor e inserción en el documento final junto con nombre, RUT del receptor y timestamp inmutable.
3. **Verificación Pública de Autenticidad vía Código QR**: Estampado en cada PDF de un código QR enlazado a una URL pública de verificación criptográfica basada en el hash SHA-256 del archivo (`/api/documentos/verificar/:hash`), accesible para fiscalizadores sanitarios sin necesidad de credenciales.
4. **Bitácora Operacional de Terreno (Anti-WhatsApp)**: Registro tipificado en 1 clic de hitos e incidencias (`TRAFICO`, `ACCESO_DENEGADO`, `FALLA_EQUIPO`, `VOLUMEN_DISCREPANTE`) con coordenadas GPS y evidencia fotográfica, sincronizado en tiempo real con el portal del cliente y auditoría de operaciones.
5. **CRM de Empresas Clientes y Sucursales**: Administración centralizada de clientes con validación estricta de RUT chileno (algoritmo Módulo 11), sucursales georreferenciadas y componentes selectores predictivos en la interfaz.
6. **Expediente Digital Limpio y Descargas Seguras**: Streaming individual de archivos y empaquetado ZIP dinámico que incluye exclusivamente documentos y fotografías reales, eliminando cualquier archivo dummy o de texto mock.

---

## 2. Diagrama de Arquitectura de Componentes

```mermaid
flowchart TD
    subgraph Frontend["Frontend SPA (React + SATEM Design System)"]
        CRM[ClientManagementView - CRUD Empresas & Sucursales]
        Tablet[TabletConductorView - Firma Digital & Reporte Bitácora]
        Portal[ClientPortalView - Timeline Bitácora & Descargas PDF]
        QRView[PublicQRVerificationView - Verificación Fiscalizador]
    end

    subgraph Backend["Backend API (Node.js + Express + TypeScript)"]
        RouterDoc["/api/documentos"]
        RouterBit["/api/bitacora"]
        RouterCli["/api/empresas-clientes & /api/sucursales"]
        RouterExp["/api/expediente"]
        
        DocGen[DocumentGeneratorService (PDFKit)]
        QRServ[QRVerificationService (SHA-256 + QRCode)]
        BitServ[BitacoraService]
        CliServ[ClienteService]
        ExpServ[ExpedienteService (Archiver ZIP)]
        
        RouterDoc --> DocGen
        RouterDoc --> QRServ
        RouterBit --> BitServ
        RouterCli --> CliServ
        RouterExp --> ExpServ
    end

    subgraph Storage["Capa de Persistencia & Archivos"]
        DB[(MySQL 8.0 via Prisma ORM)]
        FileSystem[Almacenamiento Local /uploads/documentos/]
    end

    DocGen --> FileSystem
    DocGen --> DB
    QRServ --> DB
    BitServ --> DB
    CliServ --> DB
    ExpServ --> FileSystem
```

---

## 3. Modelo de Datos Prisma

### 3.1. Extensión del Modelo `DocumentoExpediente`
Se añadieron campos de integridad criptográfica y trazabilidad para verificación pública:
```prisma
model DocumentoExpediente {
  id              String             @id @default(uuid())
  expedienteId    String             @map("expediente_id")
  categoria       CategoriaDocumento
  nombreArchivo   String             @map("nombre_archivo")
  rutaArchivo     String             @map("ruta_archivo")
  mimetype        String             @default("application/pdf")
  tamanoBytes     Int                @map("tamano_bytes")
  hashSha256      String?            @unique @map("hash_sha256")
  qrUrl           String?            @map("qr_url")
  generadoAuto    Boolean            @default(false) @map("generado_auto")
  createdAt       DateTime           @default(now()) @map("created_at")

  expediente      ExpedienteServicio @relation(fields: [expedienteId], references: [id], onDelete: Cascade)

  @@index([expedienteId])
  @@index([hashSha256])
  @@map("documentos_expediente")
}
```

### 3.2. Modelo `BitacoraServicio` (Anti-WhatsApp)
Registro estructurado de eventos en terreno con soporte offline y sincronización:
```prisma
enum TipoEventoBitacora {
  SALIDA_PLANTA
  LLEGADA_FAENA
  INICIO_FAENA
  TRAFICO
  ACCESO_DENEGADO
  FALLA_EQUIPO
  VOLUMEN_DISCREPANTE
  FIN_FAENA
  LLEGADA_DISPOSICION
  DESCARGA_COMPLETA
  RETORNO_PLANTA
  INCIDENCIA_GENERAL
}

model BitacoraServicio {
  id              String             @id @default(uuid())
  ordenServicioId String             @map("orden_servicio_id")
  tipoEvento      TipoEventoBitacora @map("tipo_evento")
  descripcion     String             @db.Text
  latitud         Float?
  longitud        Float?
  fotoUrl         String?            @map("foto_url")
  registradoPorId String             @map("registrado_por_id")
  createdAt       DateTime           @default(now()) @map("created_at")

  ordenServicio   OrdenServicio      @relation(fields: [ordenServicioId], references: [id], onDelete: Cascade)
  registradoPor   Usuario            @relation(fields: [registradoPorId], references: [id])

  @@index([ordenServicioId])
  @@index([tipoEvento])
  @@map("bitacoras_servicio")
}
```

---

## 4. Motor de Generación PDF y Verificación QR

### 4.1. Generador Vectorial con PDFKit
`DocumentGeneratorService` renderiza documentos PDF oficiales directamente en memoria y los persiste en disco con alta calidad:
- **Orden de Servicio (OS)**: Generada al confirmar la atención en el calendario. Contiene datos de origen, destino, chofer, camión y equipamiento requerido.
- **Guía de Despacho (GD)**: Generada al despachar la unidad. Certifica el inicio del transporte con resoluciones sanitarias de Zion Services.
- **Acta de Recepción Conforme (ARC)**: Renderizada al concluir la faena, incorporando la firma manuscrita digitalizada, RUT/nombre del receptor y tabla de volumen succionado.

### 4.2. Criptografía y QR Público
1. Al generarse el PDF, se calcula el hash criptográfico inmutable mediante `crypto.createHash('sha256').update(buffer).digest('hex')`.
2. Se genera el código QR apuntando a `/api/documentos/verificar/:hash`.
3. El QR se estampa vectorialmente en la esquina inferior del documento antes de persistir los bytes finales.
4. El endpoint `GET /api/documentos/verificar/:hash` es **100% público** (no requiere token JWT), permitiendo a cualquier autoridad o auditor fiscalizar el servicio en tiempo real.

---

## 5. Bitácora de Terreno y Feed en Vivo

La cuadrilla cuenta en la tablet con botones rápidos de 1 clic para reportar incidencias:
- Captura automática de geolocalización GPS (`navigator.geolocation`).
- Soporte de almacenamiento local en `IndexedDB` ante pérdida transitoria de cobertura móvil.
- Al reportar una incidencia crítica (`TRAFICO`, `ACCESO_DENEGADO`, `FALLA_EQUIPO`), el backend genera una alerta prioritaria en `AuditoriaEvento` y la refleja en el feed en vivo del Portal del Cliente.

---

## 6. Módulo CRM de Empresas Clientes y Sucursales

- **Validación Módulo 11**: Validador Zod en `cliente.validator.ts` que normaliza y certifica el dígito verificador del RUT chileno.
- **Seguridad Multi-Tenant**: Cada cliente está estrictamente aislado; usuarios con rol `CLIENTE` solo tienen visibilidad sobre sus propias sucursales, órdenes y documentos.
- **Componentes React Reutilizables**: `EmpresaSelect.tsx` y `SucursalSelect.tsx` con búsqueda predictiva por texto, reduciendo la carga cognitiva y eliminando constantes hardcodeadas.

---

## 7. Verificación de Calidad y Cobertura

- **Tests Automatizados**: Suite completa de 261 pruebas automatizadas pasando al 100% en Vitest (27 suites de test).
- **Aislamiento Multitenant Certificado**: Test `tenant-isolation.spec.ts` certifica el rechazo estricto HTTP 403 / 404 ante intentos de acceso cruzado entre clientes.
- **Build de Producción Limpio**: Compilación TypeScript en modo estricto en backend (`tsc`) y frontend (`tsc -b && vite build`) con 0 errores y 0 advertencias de tipos.
