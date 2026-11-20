# SATEM Guía de Migración & Adopción

## Principio No-Break

**La adaptación visual nunca debe romper:**
- handlers de eventos
- hooks de React
- estados de componentes
- llamadas a la API
- modelos de datos
- validaciones existentes

## Proceso de Migración (8 pasos)

### Paso 1 — Auditoría de Colores Hardcodeados

Detectar y mapear colores arbitrarios a variables SATEM:

| Hardcoded | Variable SATEM |
|-----------|---------------|
| `#1a1a2e`, `#16213e`, `#0d1117` | `var(--bg-primary)` |
| `#2d2d44`, `#21262d`, `#161b22` | `var(--bg-surface)` |
| `#1a1a2e` (card) | `var(--bg-card)` |
| Verdes de acción (`#00b4d8`, `#0ea5e9`) | `var(--accent-primary)` |
| Grises de texto oscuro | `var(--text-secondary)` |
| Rojos de error | `var(--danger)` |
| Verdes de éxito | `var(--success)` |
| Amarillos de warning | `var(--warning)` |

### Paso 2 — Inyectar Tokens en `src/index.css`

Copiar el contenido de `tokens.md` al inicio del archivo CSS principal.

### Paso 3 — Ajustar Contenedor Raíz

Aplicar fondo y tipografía base a `body` y `#root`:

```css
body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-sans);
}
```

### Paso 4 — Estandarizar Botones

Reemplazar clases de botón propietarias por `.btn .btn-primary/secondary/danger`.

**No tocar** los `onClick` handlers ni el estado que controlan.

### Paso 5 — Envolver Tablas

Detectar `<table>` sin contenedor. Envolver en `<div className="table-container">`.

### Paso 6 — Estandarizar Modales

Reemplazar modales propietarios con `<Modal>` canónico.

Verificar que el `onClose` del modal existente se pase correctamente.

### Paso 7 — Ajustar Layout Principal

Aplicar clases de `.app-container`, `.sidebar`, `.main-content`, `.header`.

Verificar que el drawer móvil funciona en < 1024px.

### Paso 8 — Prueba de Integridad

```
✓ Todos los formularios mantienen sus callbacks de submit
✓ Ninguna llamada a la API fue alterada
✓ Ninguna validación fue eliminada
✓ Vista en 375px (mobile) correcta
✓ Vista en 768px (tablet) correcta
✓ Vista en 1440px (desktop) correcta
```

## Lo que NO se debe hacer durante una migración

- Cambiar nombres de props o tipos.
- Modificar lógica de negocio.
- Eliminar estados o reducers.
- Cambiar la estructura de datos.
- Renombrar funciones o endpoints.
- Introducir Tailwind, MUI o Bootstrap.
