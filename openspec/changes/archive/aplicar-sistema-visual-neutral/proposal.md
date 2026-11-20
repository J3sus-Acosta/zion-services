# Proposal: Adoptar Sistema de Diseño Visual y Paleta de Colores Neutral

## Why
Estandarizar la interfaz con una estética moderna, limpia y profesional basada en Tailwind CSS v4, shadcn/ui y tokens OKLCH neutrales de alto contraste y soporte fluido para Light y Dark mode, libre de assets específicos o logos.

## What Changes
- Configuración de tokens semánticos en espacio OKLCH (background, foreground, primary, secondary, muted, accent, destructive, border, ring, chart y sidebar).
- Integración de Tailwind CSS v4 con `@theme inline` y `@custom-variant dark`.
- Definición de escala de redondeos (`--radius: 0.625rem` / 10px base) y utilidades de ergonomía táctil (`touch-target`, `no-scrollbar`).
- Estandarización de tipografía `Geist Sans` y `Geist Mono`.
- Sin dependencias de logos ni fotografías externas.

## Capabilities
### New Capabilities
- `visual-design-system`: Tokens de color semánticos (Light / Dark mode), variables de layout, botones y componentes estilizados con `class-variance-authority`.

## Impact
- Actualización de `globals.css` (o archivo CSS principal).
- Instalación de utilidades (`tw-animate-css`, `clsx`, `tailwind-merge`, `class-variance-authority`).
- Consistencia visual en toda la UI.