# Design

## Context
La plataforma Zion Services requiere una arquitectura unificada que cubra desde la autenticación centralizada y administración de usuarios con control de acceso basado en roles (`SUPERADMIN`, `ADMIN`, `JEFE_OPERACIONES`, `CONDUCTOR`, `CLIENTE`), hasta la operación en terreno del conductor (checklist F-GMT-MAN-004 de 80 ítems, cámara multiplataforma, GPS continuo y soporte offline), extendiéndose a la supervisión operativa y a la experiencia del cliente con tracking en tiempo real de su orden y descarga inmediata de expedientes.

Restricciones técnicas:
- Frontend: React + TypeScript, SATEM Design System (CSS variables, Dark Mode obligatorio), sin bibliotecas UI externas (sin Tailwind, sin MUI, sin Bootstrap).
- Backend: Node.js 22+, Express, TypeScript en modo estricto, Prisma ORM, MySQL.
- Seguridad: JWT en cookies HTTP-only seguras, protección CSRF, rotación de tokens y aislamiento estricto de clientes (`enforceTenantIsolation`).
- Dispositivos y Navegadores: Tablets Android, iPads (iOS), Chrome, Safari, Firefox y navegadores WebKit nativos.

## Goals / Non-Goals

**Goals:**
- Implementar una pantalla de inicio de sesión única que autentique a cualquier rol del sistema y lo redirija a su interfaz contextualizada.
- Proveer un panel de administración para `SUPERADMIN` y `ADMIN` para gestionar (CRUD), asignar roles y habilitar/deshabilitar cuentas de usuarios internos y clientes.
- Proveer al conductor un formulario ergonómico para el checklist de salida F-GMT-MAN-004 (80 ítems en 5 categorías con "Todo Conforme") y checklist de retorno a Planta Zion.
- Proveer un componente de cámara universal (WebRTC `getUserMedia` + fallback automático a `<input capture="environment">`) con compresión en cliente.
- Desplegar la ubicación GPS del camión en el panel del Jefe de Operaciones y en el Portal del Cliente durante la ventana activa de su servicio.
- Permitir al cliente visualizar y descargar fotos de faena, firmas y documentos en tiempo real tan pronto el conductor los registre.
- Asegurar persistencia offline-first con IndexedDB en la tablet del conductor ante zonas sin cobertura.

**Non-Goals:**
- No se implementa auto-registro público sin control; toda cuenta de usuario de cliente es creada y habilitada por el Superadmin/Admin de Zion Services.
- No se expone la ubicación del camión al cliente cuando se encuentra en rutas privadas hacia otros clientes o de retorno libre.

## Decisions

### 1. Jerarquía de Roles y Modelo de Usuarios (RBAC)
- **Decisión**: Extender el enum Prisma `RolUsuario` a:
  ```prisma
  enum RolUsuario {
    SUPERADMIN        // Control técnico y operativo total de la plataforma
    ADMIN             // Gestión administrativa de usuarios, contratos y maestros
    JEFE_OPERACIONES  // Despacho de camiones, monitoreo de ruta y auditoría de checklists
    CONDUCTOR         // Operador de terminal móvil en tablet para terreno
    CLIENTE           // Acceso al portal de cliente (órdenes, tracking activo y expedientes)
  }
  ```
- El modelo `Usuario` en Prisma preserva el campo `activo: Boolean @default(true)` para habilitar o suspender cuentas al instante.
- Los endpoints de autenticación emiten tokens JWT en cookies HTTP-only (`accessToken` de 15m y `refreshToken` de 7d con rotación).

### 2. Panel Administrativo de Gestión y Habilitación de Usuarios
- **Decisión**: Desarrollar la vista `UserManagementPanel` en frontend y controladores en `/api/usuarios`:
  - Listado de usuarios con filtros por rol, estado (`Activo` / `Inactivo`) y búsqueda por RUT, nombre o empresa.
  - Creación y edición con asignación de rol y vinculación obligatoria a `empresaClienteId` cuando el rol sea `CLIENTE`.
  - Conmutador rápido de activación/habilitación de cuenta (`PATCH /api/usuarios/:id/estado`).
- **Alternativa descartada**: Permitir que los clientes se auto-registren públicamente en la web, ya que el modelo B2B de Zion Services exige verificación contractual previa.

### 3. Tracking GPS con Ventana Activa y Tenant Isolation en Portal Cliente
- **Decisión**: Implementar el endpoint `/api/clientes/ordenes/:id/tracking` protegido con `enforceTenantIsolation`:
  - Verifica que la orden de servicio pertenezca a la empresa cliente autenticada.
  - Verifica que el estado de la orden corresponda a la ventana activa (camión despachado en camino a su faena o ejecutando faena en sus instalaciones).
  - Retorna únicamente la última posición GPS del camión asignado a esa atención. Si la orden no está en ventana activa, el mapa no se despliega o muestra el resumen del servicio.
- En el panel del Jefe de Operaciones, el mapa permite alternar y ver en vivo todas las unidades activas en ruta.

### 4. Disponibilidad Inmediata de Evidencias en Portal Cliente
- **Decisión**: En cuanto el conductor sincroniza una foto o firma desde la tablet, se asocia inmediatamente a la `OrdenServicio` o `FotoInspeccion` en la base de datos. El Portal de Clientes consulta estos recursos directamente vía `/api/clientes/ordenes/:id/expediente-en-vivo`, permitiendo previsualizar las fotografías y descargar el expediente digital en tiempo real sin esperar al cierre administrativo de la orden.

### 5. Checklist de Conductor en 5 Categorías con Marcado Masivo
- **Decisión**: Agrupar los 80 ítems del F-GMT-MAN-004 en:
  1. *Motor, Transmisión y Fluidos*
  2. *Cabina, Mandos e Instrumentación*
  3. *Sistema Eléctrico y Luces*
  4. *Neumáticos, Frenos y Chasis*
  5. *Equipamiento de Faena y Estanque*
  Con botón "Aprobar categoría (Todo Conforme)", registro ágil de anomalías y bloqueo ante fallas críticas; y checklist de retorno al volver a Planta Zion.

### 6. Cámara Universal Multiplataforma (WebRTC + Fallback Nativo)
- **Decisión**: Visor WebRTC interactivo en vivo (`getUserMedia`) con fallback automático a `<input type="file" accept="image/*" capture="environment">` y compresión en cliente vía canvas (JPEG < 500 KB) para compatibilidad total en Android, iOS, Chrome, Safari y Firefox.

### 7. Almacenamiento Offline-First con IndexedDB
- **Decisión**: Almacenar localmente en la tablet checklists en borrador, fotos en blob y coordenadas GPS, con un sincronizador en background que transmite los datos al servidor en cuanto se detecta conexión a internet (`online`).

## Risks / Trade-offs

- **[Riesgo: Exposición indebida de ubicación de camiones a clientes no autorizados]**  
  → *Mitigación*: Validación estricta en servidor en el middleware `enforceTenantIsolation` y restricción temporal a la ventana activa de la orden.
- **[Riesgo: Pérdida de conectividad durante la carga de fotos pesadas]**  
  → *Mitigación*: Compresión previa en canvas a < 500 KB y encolamiento en IndexedDB con reintentos exponenciales.
- **[Riesgo: Intentos de acceso con cuentas deshabilitadas]**  
  → *Mitigación*: Validación en tiempo real del flag `activo` en base de datos en cada refresco de sesión o autenticación.

## Migration Plan
1. Ejecutar migración controlada de Prisma para actualizar `RolUsuario` con `SUPERADMIN` y `JEFE_OPERACIONES`.
2. Implementar endpoints de autenticación y endpoints de gestión de usuarios en backend.
3. Crear pantalla `LoginScreen`, `AuthContext` y `UserManagementPanel` en frontend.
4. Integrar componentes de cámara universal, checklist y GPS en la tablet del conductor.
5. Habilitar la visualización de tracking y descarga de evidencias en tiempo real en el Portal de Clientes y panel de Operaciones.
6. Ejecutar pruebas unitarias y de integración end-to-end con Vitest.
