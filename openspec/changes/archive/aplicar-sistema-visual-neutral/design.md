# Design: Tokens Semánticos y Fundamentos de UI

## 1. Paleta de Colores (OKLCH Neutral / Monochrome)

### Light Mode (`:root`)
- **Fondo / Superficie:**
  - `background`: `oklch(1 0 0)` (#FFFFFF puro)
  - `card` / `popover`: `oklch(1 0 0)`
  - `sidebar`: `oklch(0.985 0 0)` (Gris ultra claro sutil)
- **Texto / Contenido:**
  - `foreground`: `oklch(0.145 0 0)` (Negro profundo legible)
  - `muted-foreground`: `oklch(0.556 0 0)` (Gris intermedio)
- **Acción & Marca:**
  - `primary`: `oklch(0.205 0 0)` (Negro carbón elegante)
  - `primary-foreground`: `oklch(0.985 0 0)` (Blanco cálido)
- **Secundario & Acento:**
  - `secondary`: `oklch(0.97 0 0)` / `secondary-foreground`: `oklch(0.205 0 0)`
  - `accent`: `oklch(0.97 0 0)` / `accent-foreground`: `oklch(0.205 0 0)`
  - `muted`: `oklch(0.97 0 0)`
- **Bordes & Entradas:**
  - `border`: `oklch(0.922 0 0)`
  - `input`: `oklch(0.922 0 0)`
  - `ring`: `oklch(0.708 0 0)`
- **Feedback & Gráficos:**
  - `destructive`: `oklch(0.577 0.245 27.325)` (Rojo semántico accesible)
  - `chart-1` a `chart-5`: Gradiente tonal de grises desde `oklch(0.87 0 0)` hasta `oklch(0.269 0 0)`.

### Dark Mode (`.dark`)
- **Fondo / Superficie:**
  - `background`: `oklch(0.145 0 0)` (Negro grafito oscuro)
  - `card` / `popover` / `sidebar`: `oklch(0.205 0 0)`
- **Texto / Contenido:**
  - `foreground`: `oklch(0.985 0 0)`
  - `muted-foreground`: `oklch(0.708 0 0)`
- **Acción & Marca:**
  - `primary`: `oklch(0.922 0 0)` (Blanco grisáceo de alto contraste)
  - `primary-foreground`: `oklch(0.205 0 0)`
- **Bordes & Transparencias:**
  - `border`: `oklch(1 0 0 / 10%)`
  - `input`: `oklch(1 0 0 / 15%)`
  - `ring`: `oklch(0.556 0 0)`
- **Feedback:**
  - `destructive`: `oklch(0.704 0.191 22.216)`

## 2. Tipografía y Radios
- **Fuente Principal:** `var(--font-geist-sans)` o sistema `sans-serif` nativo.
- **Fuente Mono:** `var(--font-geist-mono)`.
- **Radio Base:** `0.625rem` (10px).
  - `radius-sm`: `calc(var(--radius) * 0.6)` (6px)
  - `radius-md`: `calc(var(--radius) * 0.8)` (8px)
  - `radius-lg`: `var(--radius)` (10px)
  - `radius-xl`: `calc(var(--radius) * 1.4)` (14px)
  - `radius-2xl`: `calc(var(--radius) * 1.8)` (18px)