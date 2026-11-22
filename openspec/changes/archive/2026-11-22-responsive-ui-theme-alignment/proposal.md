# Proposal: Responsive UI & Theme Alignment

## Why

Durante las pruebas de control de calidad y validación de campo en diversas resoluciones (laptops estándar de 1366x768, tablets táctiles de 1024x768 / 1280x800 y dispositivos móviles) y bajo alternancia de temas claro/oscuro del SATEM Design System, se identificaron tres inconsistencias visuales y de usabilidad de alta prioridad que afectan la operatividad del sistema:

1. **Desbordamiento horizontal en la cabecera principal (`AppLayout`) para perfiles con múltiples privilegios**:
   Cuando un usuario con rol `SUPERADMIN` o con múltiples privilegios accede a la plataforma, la barra de navegación superior renderiza simultáneamente todos los módulos del sistema (`Tablet Conductor`, `Jefe Operaciones`, `Gestión Comercial`, `Gestión Usuarios` y `Portal Cliente`) con etiquetas completas dentro de un contenedor rígido. En pantallas con ancho inferior a 1200px, el ancho total excede el ancho del viewport, forzando un scroll horizontal en la ventana y dejando el botón de "Cerrar Sesión" fuera del área visible. En dispositivos móviles (<640px), la navegación desaparece por completo (`hidden sm:flex`), dejando al usuario sin mecanismo directo de alternancia de módulos.

2. **Desalineación visual asimétrica en la columna de acciones de la grilla de usuarios (`UserManagementPanel`)**:
   En la tabla de usuarios registrados, los botones de acción contextual (`Clave`, `Rol`, y `Habilitar/Deshabilitar`) se agrupan mediante un contenedor flex alineado a la derecha (`justify-end`). Debido a que las etiquetas de acción poseen longitudes de texto dispares ("Deshabilitar" de 12 caracteres vs "Habilitar" de 9 caracteres) y carecen de anchos mínimos u homogeneidad dimensional, las filas de usuarios activos empujan los botones de `Clave` y `Rol` aproximadamente 24 píxeles más hacia la izquierda que en las filas de usuarios inactivos. Esta asimetría quebranta la cadencia visual, la prolijidad del diseño corporativo SATEM y la precisión en la interacción rápida del administrador.

3. **Inconsistencia temática en el visualizador de mapa de flota operativa (`OperationsFleetMap`)**:
   Al alternar la interfaz entre Modo Oscuro y Modo Claro mediante el selector de tema de la cabecera, la vista del Portal de Clientes adapta adecuadamente sus mapas satelitales y superficies a tokens claros (`--card`, `--muted/30`, gradientes adaptativos). Por el contrario, en el módulo de Jefe de Operaciones (`OperationsFleetMap.tsx`), el contenedor del mapa satelital posee valores rígidos en `bg-slate-950` y gradientes radiales fijos `#020617`, así como etiquetas emergentes en `bg-black/90`. Al activar el tema claro, el mapa permanece como una caja oscura desalineada del resto de la interfaz diurna, reduciendo la armonía visual y el cumplimiento de accesibilidad WCAG AA.

Esta propuesta define las especificaciones, arquitectura técnica y tareas necesarias para dotar a la plataforma SATEM de una barra de navegación responsive y resiliente sin desbordamientos, un layout perfectamente homogéneo en la administración de usuarios, y una adaptación temática total en los mapas de telemetría de operaciones.

## What Changes

- **Barra de Navegación Universal Responsive y Resiliente (`user-auth`)**:
  - Implementación de un diseño adaptable con tres escalones de breakpoint:
    - *Desktop Amplio (>= 1200px)*: Segmented pill bar con icono y nombre completo para todos los módulos autorizados.
    - *Tablets y Pantallas Medianas (768px a 1199px)*: Contenedor con distribución compacta, etiquetas sintetizadas/dinámicas y menú desplegable de desborde controlado (overflow dropdown) para módulos secundarios cuando el rol tiene 4 o más accesos simultáneos.
    - *Móviles (< 768px)*: Menú móvil compacto accesible con preservación continua del branding ZS, selector de tema y botón de "Cerrar Sesión" permanentemente anclado y visible sin desplazamiento horizontal.
  - Garantía de `shrink-0` e invariante de visibilidad para los controles críticos de la cabecera (Branding ZS, Estado de Sincronización Offline, Selector de Tema y Botón de Cerrar Sesión), prohibiendo cualquier desbordamiento del viewport horizontal (`overflow-x: hidden`).

- **Layout Homogéneo y Simétrico de Acciones en Gestión de Usuarios (`user-auth`)**:
  - Estructuración de anchos fijos y uniformes para cada botón de la columna de acciones en `UserManagementPanel.tsx`:
    - Botón de restablecimiento de contraseña (`Clave`): ancho mínimo/fijo estandarizado.
    - Botón de reasignación de rol (`Rol`): ancho mínimo/fijo estandarizado.
    - Botón de conmutación de estado (`Habilitar` / `Deshabilitar`): contenedor de ancho fijo unificado (garantizando que la diferencia de caracteres entre ambas palabras no afecte la posición horizontal de los botones precedentes).
  - Anclaje simétrico en una cuadrícula CSS (`grid`) o flexbox con celdas de tamaño homogéneo y cabecera de tabla con ancho explícito (`w-[270px]`), logrando una alineación vertical perfecta columna a columna en todas las filas de la tabla sin importar si el usuario está activo o inactivo.

- **Adaptabilidad y Coherencia Temática Claro/Oscuro en Mapa de Operaciones (`journey-routing`)**:
  - Sustitución de colores y estilos hexadecimales rígidos (`bg-slate-950`, `#020617`, `bg-black/90`) por tokens semánticos del SATEM Design System (`--background`, `--surface`, `--card`, `--muted`, `--border`, `--foreground`).
  - Implementación de una cuadrícula cartográfica dinámica sensible a la clase `.dark`:
    - En Modo Claro: superficie suave (`bg-slate-100` / `bg-muted/40`), trama de cuadrícula cartográfica sutil con contraste controlado y ruta vehicular legible con contraste superior a 4.5:1.
    - En Modo Oscuro: superficie premium dark (`bg-slate-950`), trama cartográfica cian/azul y resplandor radar estético SATEM.
  - Tarjetas flotantes de telemetría, marcadores de base/cliente y popover del camión adaptados a `bg-card/95` y bordes semánticos, garantizando legibilidad diurna y nocturna sin alterar coordenadas ni telemetría en tiempo real.

## Capabilities

### Modified Capabilities

- `user-auth`: Navegación superior universal adaptativa con prevención estricta de desbordamiento horizontal en resoluciones medianas/móviles para usuarios multirrol (`SUPERADMIN`), preservación incondicional del botón de Logout y alineación geométrica homogénea en la columna de acciones de la administración de usuarios.
- `journey-routing`: Monitoreo y trazabilidad cartográfica de flota en operaciones con soporte bicromático nativo (Modo Claro / Modo Oscuro) mediante tokens semánticos de SATEM Design System, manteniendo paridad de diseño con el Portal de Clientes.

## Impact

- **Frontend**:
  - `src/App.tsx`: Refactorización de `AppLayout` integrando navegación responsive con breakpoints fluidos, menú desplegable para módulos excedentes en resoluciones intermedias (<1200px) y menú móvil táctil (<768px), asegurando visibilidad constante de branding, theme toggle y logout.
  - `src/components/admin/UserManagementPanel.tsx`: Ajuste de la columna "Acciones" con layout simétrico, anchos mínimos fijos para botones de Clave, Rol y Habilitar/Deshabilitar, garantizando alineación vertical estricta.
  - `src/components/operations/OperationsFleetMap.tsx`: Sustitución de fondos y estilos oscuros fijos por tokens CSS adaptativos para Modo Claro y Modo Oscuro en contenedor de mapa, popovers, marcadores y telemetría.
- **Backend & Modelos**:
  - Sin impacto breaking en endpoints de API ni esquema de Prisma.
  - Compatibilidad total con endpoints existentes `/api/usuarios`, `/api/operaciones/flota-en-vivo` y `/api/auth/logout`.
- **Accesibilidad & UI/UX**:
  - Cumplimiento de WCAG 2.1 AA en ratios de contraste para el mapa operativo en Modo Claro.
  - Cumplimiento de estándar táctil SATEM (touch target >= 38px) en navegación responsive y acciones de usuario.
