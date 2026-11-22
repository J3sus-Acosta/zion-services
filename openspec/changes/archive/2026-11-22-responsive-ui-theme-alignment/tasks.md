# Tasks

## 1. Header / Navbar Universal Responsive Layout & Anti-Overflow (`App.tsx`)

- [x] 1.1 Analizar los anchos máximos de los elementos en `AppLayout` (`src/App.tsx`) y definir estructura flexible con `shrink-0` en `Brand`, `ThemeToggle` y `LogoutButton` para eliminar el scroll horizontal forzado.
- [x] 1.2 Implementar sistema de navegación responsive por niveles en `AppLayout`: contenedor desktop extendido (`xl:flex`, >=1200px) con etiquetas completas, y contenedor compacto para pantallas medianas/tablets (`md:flex xl:hidden`, 768px a 1199px) que conserve acceso directo o menú desplegable de desborde sin sobrepasar el ancho disponible.
- [x] 1.3 Implementar menú desplegable móvil táctil (`< 768px`) en `AppLayout` accesible mediante botón hamburguesa/menú (`Menu` de Lucide), desplegando los módulos autorizados del usuario con área táctil mínima de 38px (estándar SATEM Touch-Friendly).
- [x] 1.4 Aplicar guardas contra desbordamiento en el contenedor de cabecera (`overflow-hidden`) y en el contenedor raíz de `AppLayout` (`overflow-x-hidden`), verificando que en resoluciones de 320px, 768px, 1024px y 1200px el botón de "Cerrar Sesión" permanezca 100% visible e interactivo sin scroll horizontal.

## 2. Symmetric and Homogeneous Actions Column Layout (`UserManagementPanel.tsx`)

- [x] 2.1 Fijar el ancho de la cabecera de la columna de acciones en la tabla de `UserManagementPanel.tsx` a un ancho constante `w-[276px] min-w-[276px]` con alineación a la derecha.
- [x] 2.2 Estandarizar las dimensiones fijas del botón 'Clave' (`w-[76px] h-8 justify-center shrink-0`) y botón 'Rol' (`w-[68px] h-8 justify-center shrink-0`) con iconos y etiquetas alineadas simétricamente.
- [x] 2.3 Estandarizar el ancho del botón de conmutación de estado a un ancho fijo uniforme (`w-[114px] h-8 justify-center shrink-0`) para albergar con el mismo espacio físico tanto "Deshabilitar" (activo) como "Habilitar" (inactivo).
- [x] 2.4 Verificar mediante inspección de elementos en navegador que la coordenada horizontal `X` de los botones 'Clave' y 'Rol' permanezca exactamente alineada de forma vertical e idéntica entre filas de usuarios activos e inactivos.
- [x] 2.5 Asegurar que los modales de cambio de contraseña (`modalPasswordUser`) y cambio de rol (`modalRolUser`) mantengan su funcionalidad íntegra sin regresiones en sus handlers ni en la reactividad de la grilla.

## 3. Thematic Alignment & Adaptive Surfaces in Operations Map (`OperationsFleetMap.tsx`)

- [x] 3.1 Reemplazar el fondo fijo oscuro `bg-slate-950` del contenedor cartográfico en `OperationsFleetMap.tsx` por superficies semánticas adaptativas `bg-slate-100 dark:bg-slate-950` con transición suave `transition-colors duration-200`.
- [x] 3.2 Adaptar la cuadrícula cartográfica radial de fondo para sincronizarse con las variables CSS del SATEM Design System (`var(--card)` y `--color-primary-marker` / `--border`), ofreciendo una grilla luminosa técnica en Modo Claro y una grilla cibernética cian en Modo Oscuro.
- [x] 3.3 Adaptar el trazo SVG de la ruta operativa de Santiago para utilizar `currentColor` o clases temáticas (`text-primary dark:text-sky-400`), garantizando contraste superior a 4.5:1 (WCAG AA) sobre la superficie clara.
- [x] 3.4 Adaptar los marcadores de "Planta Zion" y "Faena Cliente" de `bg-black/70` a tarjetas adaptativas semánticas (`bg-card/90 text-card-foreground border border-border shadow-md`), manteniendo paridad visual con `ClientPortalView.tsx`.
- [x] 3.5 Adaptar el popup emergente del camión seleccionado (`bg-black/90 text-white`) a tarjeta semántica `bg-card/95 text-card-foreground border border-border shadow-xl backdrop-blur-md` en Modo Claro y preservando el dark mode premium en Modo Oscuro.
- [x] 3.6 Asegurar contraste WCAG AA en la barra flotante de telemetría inferior (`bg-card/90`, `text-foreground`, `text-muted-foreground`), verificando legibilidad plena de velocidad, precisión GPS y cliente bajo ambos temas.

## 4. System Integration, Visual Regression & TypeScript Verification

- [x] 4.1 Verificar que la alternancia en vivo entre Modo Claro y Modo Oscuro desde la cabecera actualice simultáneamente `OperationsFleetMap` y `ClientPortalView` sin recargas de página ni deselección de camión activo.
- [x] 4.2 Validar la ausencia total de scrollbars horizontales en la ventana del navegador al probar con un usuario `SUPERADMIN` en resoluciones 360px (móvil), 768px (iPad vertical), 1024px (iPad horizontal/laptop compacta) y 1366px (laptop estándar).
- [x] 4.3 Ejecutar verificación de tipado estricto con `tsc --noEmit` en el frontend para corroborar cero errores de TypeScript.
- [x] 4.4 Ejecutar validación estricta de OpenSpec con `npx openspec validate responsive-ui-theme-alignment --strict` y confirmar que todos los artefactos cumplen la especificación al 100%.
