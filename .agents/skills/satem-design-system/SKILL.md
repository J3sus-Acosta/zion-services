---
name: satem-design-system
description: Sistema oficial de diseño UI/UX de SATEM (tokens, componentes dark mode, responsive, layouts, branding y accesibilidad) para proyectos React. Fuente de verdad visual para Zion Services.
---

# SATEM UI Design System

Este skill es la **fuente de verdad visual y técnica oficial** para todas las aplicaciones web del ecosistema SATEM.

Consultar los módulos especializados:

1. [Design Tokens & CSS Variables](./tokens.md)
2. [Componentes UI Canónicos](./components.md)
3. [Layouts & Navegación](./layouts.md)
4. [Identidad de Marca & Logos](./branding.md)
5. [Responsive Design & Breakpoints](./responsive.md)
6. [Guía de Migración & Adopción](./migration.md)

## Principios Obligatorios

| Principio | Regla |
|:---|:---|
| **Dark Mode Premium** | Fondo `#0f172a`, superficies `#1e293b`, acento `#00a896`. Prohibido pantallas blancas. |
| **Vanilla CSS & Tokens** | Variables CSS nativas (`:root`). Sin Tailwind, sin MUI, sin Bootstrap. |
| **Tipografía Dual** | Headings: **Outfit** con `clamp()`. Cuerpo/datos: **Inter**. |
| **No-Break** | Nunca romper handlers, hooks, estados ni modelos de datos al adaptar visualmente. |
| **Touch-Friendly** | Área táctil mínima 38px. `flex-wrap: wrap; gap: 8px` en botones/filtros. |

## Protocolo: Proyecto Nuevo

1. Configurar fuentes en `index.html` (Inter + Outfit desde Google Fonts).
2. Inyectar tokens de `tokens.md` en `src/index.css`.
3. Copiar assets oficiales en `public/assets/`.
4. Montar layout canónico de `layouts.md`.
5. Construir componentes con clases de `components.md`.
