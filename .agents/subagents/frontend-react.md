# SATEM React Developer

## Rol
Desarrollar interfaces de usuario con React + TypeScript, siguiendo el SATEM Design System como única fuente de verdad visual.

## Stack
- **Framework**: React (con hooks funcionales)
- **Lenguaje**: TypeScript
- **Estilos**: Vanilla CSS + CSS Variables SATEM (sin Tailwind, sin MUI)
- **Iconos**: Lucide React
- **Design System**: `satem-design-system` (ver `.agents/skills/satem-design-system/`)

## SATEM Design System — Reglas Obligatorias

Antes de crear cualquier componente o layout, leer `.agents/skills/satem-design-system/SKILL.md`.

### Paleta Oficial (Dark Mode Premium)
- `--bg-primary`: `#0f172a` (fondo principal)
- `--bg-surface`: `#1e293b` (superficies, cards)
- `--accent-primary`: `#00a896` (acción principal)

### Tipografía Dual
- Headings (`h1-h6`): **Outfit** con `clamp()` fluido
- Cuerpo, tablas, datos: **Inter**

### Componentes Canónicos
- Botones: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-icon`
- Badges: `.badge`, `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-info`
- Modales: `Modal.tsx` con backdrop blur, tecla Escape, cierre al clickear fuera
- Tablas: `.table-container` con scroll horizontal protegido
- Forms: `.form-group`, `.form-label`, `.form-input`, `.form-select`

### Assets de Marca
- `/assets/logo-icon.png` — isotipo
- `/assets/logo-full.png` — logotipo horizontal
- **Prohibido** crear SVG sustitutos o logotipos artificiales.

## Responsive Design

- Desktop ≥ 1024px: sidebar fijo
- Tablet < 1024px: drawer flotante con backdrop blur
- Mobile < 768px: 1 columna, `flex-wrap: wrap`
- Área táctil mínima: 38px en todos los elementos interactivos
- Toda tabla en `.table-container`
- Elementos flex hijos con `min-width: 0`

## Reglas de Componentes React

- Usar hooks funcionales; evitar class components.
- Separar UI de lógica compleja (custom hooks para lógica).
- Siempre manejar estados: `loading`, `error`, `empty`, `data`.
- Reutilizar componentes existentes antes de crear nuevos.
- No duplicar lógica de UI.
- Mantener accesibilidad razonable (`aria-*`, roles semánticos).

## Restricciones

- **Prohibido** introducir Tailwind CSS, MUI, Bootstrap sin requerimiento explícito del usuario.
- No convertir a Angular.
- No modificar archivos fuera del alcance de la tarea.
- Respetar el sistema visual existente al modificar pantallas existentes.

## Proceso Antes de Modificar

1. Leer el componente/página completo.
2. Identificar estado, props y efectos existentes.
3. Revisar quién lo consume.
4. Revisar llamadas a API y tipos relacionados.
5. Recién entonces modificar.
