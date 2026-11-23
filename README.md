# Zion Services — Plataforma de Gestión Operativa, Logística y Tratamiento de RILes

> **SATEM Soluciones Inteligentes SpA**  
> Plataforma integral de gestión para transporte, succión, limpieza hidrojet y disposición final de Residuos Industriales Líquidos (RILes) y lodos.

---

## 1. Visión General del Sistema

**Zion Services** es una solución corporativa de misión crítica desarrollada con arquitectura multi-agente SATEM para digitalizar y automatizar el ciclo logístico y operacional completo de servicios ambientales:

- **Portal de Clientes**: Solicitud guiada de servicios simples o recurrentes (multi-atención), descarga de certificados de disposición y seguimiento en tiempo real.
- **Planificación y Agenda Operativa**: Calendario interactivo multi-vista (mes, semana, día) para asignación de unidades y conductores, con detección algorítmica de solapamiento horario y control preventivo de tiempos de traslado intercomunales (regla de 4 horas).
- **Gestión de Flota e Inspecciones**: Mantenimiento de vehículos y equipos especializados (ej. camión cisterna RVFL-92, equipos de hidrojet), control documental y checklists pre/post operativos.
- **Ruta y Terreno (App de Conductor)**: Jornadas operativas, navegación, manifiesto digital de carga y registro de pesaje en plantas autorizadas.
- **Trazabilidad y Cumplimiento Normativo**: Auditoría inmutable de eventos (`AuditoriaEvento`), notificaciones in-app a conductores (`NotificacionConductor`) y correos automáticos al cliente.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Descripción |
|---|---|---|
| **Backend API** | Node.js v22+ · TypeScript · Express | Arquitectura RESTful en capas (Routes, Controllers, Services, Validators). |
| **ORM & Base de Datos** | Prisma ORM 5.22 · MySQL 8.0 | Esquema relacional fuertemente tipado con migraciones automáticas. |
| **Validación de Datos** | Zod | Esquemas estrictos de validación en runtime para payload de entrada. |
| **Frontend SPA** | React 18 · TypeScript · Vite | Single Page Application rápida y reactiva. |
| **Diseño & UI** | SATEM Design System | Tokens de diseño Dark Mode nativos (Vanilla CSS Variables), accesibilidad y responsive. |
| **Iconografía** | Lucide React | Iconos vectoriales consistentes y ligeros. |
| **Autenticación** | JWT · Cookie HTTP-only `zion_auth_token` | Control de acceso basado en roles (RBAC), fallback dual para migración continua (`zion_auth_token` / `satem_auth_token` / `Bearer`) y Tenant Isolation. |
| **Testing** | Vitest · Supertest | Suites automatizadas unitarias, de integración y E2E. |

---

## 3. Módulo Destacado: Agenda Operativa y Planificación de Servicios

El módulo de planificación incorpora capacidades avanzadas para optimizar la coordinación entre el área comercial y el equipo de operaciones:

```mermaid
graph TD
    Client[Portal Cliente: Solicitud Multi-Atención] -->|Solicita N fechas| AP[Atenciones Programadas (Estado: Pendiente)]
    AP --> Calendar[Gestión Comercial: Calendario Operativo]
    
    subgraph Conflict Engine["Motor de Disponibilidad y Conflictos"]
        Calendar -->|Asignar Vehículo / Conductor| CheckOverlap{¿Colisión Horaria?}
        CheckOverlap -->|Sí: startA < endB && endA > startB| Block[HTTP 409: Bloqueo Estricto]
        CheckOverlap -->|No| CheckTravel{¿Margen < 4 Horas?}
        CheckTravel -->|Sí: intervalo < 240 min| SoftWarn[HTTP 409: Advertencia de Traslado]
        SoftWarn --> Override{¿Justificación >= 10 chars?}
        Override -->|No| Cancel[Rechazado]
        Override -->|Sí| Confirm[Autorización Forzada]
        CheckTravel -->|No: Margen >= 4 Horas| Confirm
    end

    Confirm --> OS[Generación 1:1 Orden de Servicio]
    Confirm --> Jornada[Vinculación a Jornada Conductor]
    Confirm --> Notify[Notificación Conductor in-app + Email Cliente]
    Confirm --> Audit[Persistencia en AuditoriaEvento]
```

### Modelos Prisma Principales de Planificación
- **`AtencionProgramada`**: Entidad central que almacena cada evento operativo, vinculando la `SolicitudServicio`, `SucursalFaena`, `PlantaDestino`, `Vehiculo`, `Conductor` y la `OrdenServicio` emitida.
- **`ServicioCatalogo`**: Catálogo administrable de servicios estándar (ej. `HIDROJET`, `SUCCION_RILES`, `RETIRO_LODOS_MANUAL`).
- **`PlantaDestino`**: Registro de plantas autorizadas de disposición y tratamiento final de RILes en la Región Metropolitana.
- **`AtencionServicioItem`**: Relación N:M que asocia servicios y cantidades a una atención específica.
- **`EstadoAtencionProgramada`**: Enum de estados (`PENDIENTE_CONFIRMACION`, `PROGRAMADA`, `EN_CURSO`, `COMPLETADA`, `CANCELADA`, `REPROGRAMADA`).

Para una descripción técnica exhaustiva, revisa el documento dedicado:  
👉 [Arquitectura Técnica: Planificación y Agenda Operativa](file:///d:/Dev/zion-services/docs/ARQUITECTURA_PLANIFICACION_AGENDA.md).

---

## 4. Módulo Destacado: Cero Papel, Documentación Oficial, Firmas y CRM

El módulo **Cero Papel** digitaliza de punta a punta la documentación reglamentaria, formaliza la comunicación de incidentes y centraliza la gestión comercial:

- **Generador de Documentos Oficiales PDF**: Renderizado vectorial programático de Órdenes de Servicio, Guías de Despacho, Actas de Recepción Conforme y Órdenes de Trabajo con membrete oficial Zion Services y resolución sanitaria.
- **Firma Digital Táctil**: Captura en tablet e inserción vectorial en el Acta de Recepción Conforme con identificación del receptor y marca de tiempo.
- **Verificación Criptográfica por Código QR**: Cada documento PDF incluye un hash SHA-256 y un código QR que apunta a la URL pública `GET /api/documentos/verificar/:hash`, accesible para fiscalizadores sin requerir login.
- **Bitácora de Terreno (Anti-WhatsApp)**: Registro estructurado en 1 clic de hitos y novedades (`TRAFICO`, `ACCESO_DENEGADO`, `FALLA_EQUIPO`, etc.) con coordenadas GPS y fotografías, alertando a Operaciones y al Cliente en vivo.
- **CRM de Clientes y Sucursales**: Administración integral de empresas clientes con validación estricta de RUT chileno (algoritmo Módulo 11) y sucursales georreferenciadas.
- **Expedientes Digitales Limpios**: Streaming de descarga individual y consolidado en ZIP dinámico conteniendo exclusivamente documentos y fotos reales.

Para una descripción técnica exhaustiva, revisa el documento dedicado:  
👉 [Arquitectura Técnica: Cero Papel, Documentos Oficiales, Firmas y CRM](file:///d:/Dev/zion-services/docs/ARQUITECTURA_DOCUMENTOS_OFICIALES_CERO_PAPEL.md).

---

## 5. Módulo Destacado: Gestión de Flota e Inspecciones Operacionales

El módulo de **Gestión de Flota** proporciona control en tiempo real sobre los vehículos (camiones cisterna, tolvas, camionetas) y equipamiento especializado (equipos de succión e hidrojet) de Zion Services:

- **Interfaz Minimalista y Consistente**: Vistas refactorizadas con los componentes canónicos de interfaz (`Card`, `CardHeader`, `CardTitle`, `Badge`, `Button`, `.table-container`), eliminando estilos heterogéneos para una experiencia fluida.
- **Métricas Operacionales en Tiempo Real (KPIs)**: Contadores ejecutivos para `Total Unidades`, `Habilitadas`, `En Mantenimiento/Bloqueadas` con actualización instantánea.
- **Control de Estados Operacionales**: Gestión estricta de estados (`HABILITADO` / `DESHABILITADO`), auditoría de cambios y prevención de despacho de camiones no habilitados o sin checklist vigente.
- **Transferencia y Reasignación de Faenas**: Flujo controlado para reasignar unidades entre bases y contratos operacionales con registro histórico.
- **Identidad de Marca Exclusiva**: Erradicación de marcas y elementos externos, garantizando una presentación corporativa limpia bajo los estándares de Zion Services.

---

## 6. Seguridad, Autenticación y Control de Acceso (RBAC)

La plataforma cuenta con un robusto subsistema de seguridad defensiva y gestión de identidades:

- **Cookie HTTP-Only Oficial (`zion_auth_token`)**: El inicio de sesión emite un token JWT almacenado en cookies seguras (`HttpOnly`, `SameSite=Lax`, `Secure` en producción) para mitigar vectores de ataque XSS y CSRF.
- **Fallback Dual Resiliente**: El middleware de autenticación (`auth.middleware.ts`) prioriza `zion_auth_token`, manteniendo soporte retroactivo para la cookie legacy `satem_auth_token` y cabeceras `Authorization: Bearer <token>`, evitando disrupciones a usuarios en faena.
- **Cierre de Sesión Limpio**: El endpoint `POST /api/auth/logout` invalida y remueve concurrentemente las cookies `zion_auth_token`, `satem_auth_token`, `accessToken` y `refreshToken`.
- **Aislamiento Multitenant (Tenant Isolation)**: Filtro estricto que restringe el acceso de usuarios externos con rol `CLIENTE` únicamente a los datos de su propia empresa contratante.

Para una descripción técnica exhaustiva, revisa el documento dedicado:  
👉 [Arquitectura Técnica: Seguridad, Autenticación y RBAC](file:///d:/Dev/zion-services/docs/ARQUITECTURA_SEGURIDAD_Y_AUTENTICACION.md).

---

## 7. Estructura del Repositorio

```text
zion-services/
├── .agents/                    # Definición de subagentes SATEM y skills
├── backend/                    # Backend Node.js / Express / Prisma
│   ├── prisma/
│   │   ├── migrations/         # Historial de migraciones Prisma
│   │   ├── schema.prisma       # Definición de modelos de base de datos
│   │   ├── seed.ts             # Datos iniciales del sistema
│   │   └── seed-planning.ts    # Catálogo de servicios y plantas de destino
│   ├── src/
│   │   ├── controllers/        # Controladores HTTP (planning, catalogo, etc.)
│   │   ├── middleware/         # Autenticación JWT, RBAC y Tenant Isolation
│   │   ├── routes/             # Enrutadores REST (/api/auth, /api/flota, etc.)
│   │   ├── services/           # Lógica de negocio y detección de conflictos
│   │   └── validators/         # Esquemas de validación Zod
│   ├── test/                   # Tests unitarios de servicios y validadores
│   └── tests/                  # Tests de integración REST y flujos E2E
├── docs/                       # Documentación técnica y diagramas de arquitectura
│   ├── ARQUITECTURA_DOCUMENTOS_OFICIALES_CERO_PAPEL.md
│   ├── ARQUITECTURA_PLANIFICACION_AGENDA.md
│   └── ARQUITECTURA_SEGURIDAD_Y_AUTENTICACION.md
├── frontend/                   # Frontend React / TypeScript / Vite
│   ├── src/
│   │   ├── components/         # Componentes UI canónicos (Card, Badge, Button)
│   │   │   ├── admin/          # ClientManagementView, UserManagementPanel
│   │   │   ├── client/         # MultiServiceRequestWizard, ClientPortalView
│   │   │   ├── commercial/     # ServiceCalendar, AssignmentModal, etc.
│   │   │   ├── fleet/          # FleetManagementPanel, modales de flota
│   │   │   └── ui/             # Componentes canónicos del sistema de diseño
│   │   ├── hooks/              # Custom hooks (useServiceCalendar)
│   │   └── services/           # Clientes HTTP hacia la API REST
└── openspec/                   # Especificaciones OpenSpec (specs, changes, tasks)
```

---

## 8. Puesta en Marcha en Entorno Local

### 6.1 Requisitos Previos
- **Node.js**: v22+
- **npm**: v10+
- **MySQL**: v8.0+

### 6.2 Configuración del Backend

1. Ingresar al directorio del backend e instalar dependencias:
   ```powershell
   cd backend
   npm install
   ```

2. Configurar el archivo `.env` en `backend/.env`:
   ```ini
   PORT=4000
   DATABASE_URL="mysql://usuario:password@localhost:3306/zion_services?schema=public"
   JWT_SECRET="tu-clave-secreta-jwt-super-segura"
   NODE_ENV="development"
   ```

3. Aplicar migraciones y generar cliente Prisma:
   ```powershell
   npx prisma generate
   npx prisma migrate dev
   ```

4. Poblar la base de datos con los seeders iniciales y catálogos de planificación:
   ```powershell
   npm run prisma:seed
   npx ts-node prisma/seed-planning.ts
   ```

5. Iniciar el servidor backend en modo desarrollo:
   ```powershell
   npm run dev
   ```
   *El servidor quedará escuchando en `http://localhost:4000`.*

### 6.3 Configuración del Frontend

1. En una nueva terminal, ingresar al directorio del frontend e instalar dependencias:
   ```powershell
   cd frontend
   npm install
   ```

2. Iniciar el servidor de desarrollo Vite:
   ```powershell
   npm run dev
   ```
   *La aplicación estará accesible en `http://localhost:5173`.*

---

## 9. Pruebas Automatizadas

El proyecto cuenta con suites de pruebas completas ejecutadas con **Vitest**:

```powershell
# Ejecutar todas las pruebas del backend
npm --prefix backend test
```

Las suites cubren:
- **Pruebas Unitarias**: Detección de solapamiento horario y cálculo de márgenes de traslado (`test/services/conflict-detection.spec.ts`), validadores Zod (`test/validators/planning.validator.spec.ts`).
- **Pruebas de Integración y Seguridad**: Autenticación con cookie `zion_auth_token` y fallback dual (`auth.security.test.ts`), endpoints REST, RBAC y emisión 1:1 de OS (`tests/planning.integration.test.ts`).
- **Pruebas E2E**: Flujo integral de solicitud multi-atención, bloqueo por solapamiento, forzado de traslado con justificación obligatoria y reasignación (`tests/planning.e2e-flow.test.ts`).

---

## 10. Metodología Multi-Agente y OpenSpec

Este repositorio opera bajo el estándar de ingeniería **SATEM Multi-Agente + OpenSpec**:
- Las especificaciones funcionales se encuentran en `openspec/specs/`.
- Las propuestas y cambios planificados residen en `openspec/changes/`.
- Para más información sobre el flujo de trabajo y roles de subagentes, consultar [SATEM_AGENT_GUIDE.md](file:///d:/Dev/zion-services/SATEM_AGENT_GUIDE.md).
