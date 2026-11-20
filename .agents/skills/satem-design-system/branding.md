# SATEM Identidad de Marca & Assets Oficiales

## Assets Oficiales

| Asset | Ruta en proyecto | Uso |
|-------|-----------------|-----|
| `logo-icon.png` | `/public/assets/logo-icon.png` | Isotipo (ícono solo), sidebar colapsado, favicon |
| `logo-full.png` | `/public/assets/logo-full.png` | Logotipo horizontal completo, sidebar expandido, header |
| `satem-signature.png` | `/public/assets/satem-signature.png` | Firma oficial en documentos, reportes PDF |

## Reglas de Uso

### ✅ Permitido
- Usar `logo-icon.png` como favicon y en sidebar colapsado.
- Usar `logo-full.png` en header principal y página de login.
- Ajustar dimensiones respetando la proporción original.
- Aplicar `object-fit: contain` para evitar distorsión.

### ❌ Prohibido
- Crear logotipos artificiales, sustitutos SVG inventados o texto estilizado como logo.
- Cambiar colores del logo.
- Distorsionar proporciones.
- Superponer texto o íconos sobre el logo.

## Dimensiones de Referencia

```
logo-icon.png  → Mostrar a 32×32px (sidebar) o 24×24px (favicon)
logo-full.png  → Mostrar a altura 36px, ancho automático (sidebar expandido)
```

## Uso en React

```tsx
// Sidebar expandido
<img src="/assets/logo-full.png" alt="SATEM" height={36} style={{ objectFit: 'contain' }} />

// Sidebar colapsado / favicon
<img src="/assets/logo-icon.png" alt="SATEM" width={32} height={32} style={{ objectFit: 'contain' }} />
```

## Colores Corporativos SATEM

| Color | HEX | Uso |
|-------|-----|-----|
| Acento SATEM | `#00a896` | Acción principal, links, íconos de marca |
| Fondo profundo | `#0f172a` | Background principal |
| Superficie | `#1e293b` | Cards, sidebar, header |
| Texto principal | `#f8fafc` | Headings, cuerpo |

## Tipografías Corporativas

- **Outfit** (500, 600, 700, 800): Headings, títulos de módulos, KPIs.
- **Inter** (300, 400, 500, 600, 700): Cuerpo, tablas, formularios, hashes, datos.

Importar desde Google Fonts en `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet" />
```
