# SATEM Responsive Design & Breakpoints

## Breakpoints Oficiales

| Breakpoint | Rango | Comportamiento |
|---|---|---|
| Large Desktop | ≥ 1440px | Layout completo, sidebar fijo, grillas de 4 columnas |
| Desktop | 1024px – 1439px | Layout completo, sidebar fijo, grillas de 3-4 columnas |
| Tablet | < 1024px | Sidebar se convierte en drawer flotante con backdrop |
| Mobile Estándar | < 768px | 1 columna, botones apilados, tablas con scroll |
| Small Mobile | < 480px | Padding reducido, tipografía más pequeña |

## Media Queries Canónicas

```css
/* Large Desktop */
@media (min-width: 1440px) { }

/* Tablet → activa drawer */
@media (max-width: 1023px) { }

/* Mobile estándar */
@media (max-width: 767px) { }

/* Small Mobile */
@media (max-width: 479px) { }
```

## Reglas Anti-Overflow

### Regla 1: `min-width: 0` en Flex Children
```css
/* SIEMPRE en hijos directos de flex containers */
.flex-child { min-width: 0; }
```

### Regla 2: Contenedores de Botones y Filtros
```css
.filters-bar,
.action-bar,
.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
```

### Regla 3: Tablas con Scroll Horizontal Protegido
```css
/* Siempre envolver tablas en .table-container */
.table-container {
  width: 100%;
  overflow-x: auto;
}
/* Las tablas tienen min-width para mantener legibilidad */
table { min-width: 600px; }
```

### Regla 4: Imágenes y Media
```css
img, video { max-width: 100%; height: auto; }
```

## Touch Targets
Todos los elementos interactivos (botones, links, inputs) deben tener área táctil mínima de **38px de altura**.

```css
.btn { min-height: 38px; }
.form-input, .form-select { min-height: 38px; }
```

## Comportamiento de Drawer en Tablet/Mobile

```tsx
// Usar estado para controlar el drawer
const [drawerOpen, setDrawerOpen] = useState(false);

// Cerrar drawer al navegar (cambio de ruta)
useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

// Prevenir scroll del body cuando drawer está abierto
useEffect(() => {
  document.body.style.overflow = drawerOpen ? 'hidden' : '';
  return () => { document.body.style.overflow = ''; };
}, [drawerOpen]);
```

## Checklist Responsive por Pantalla

Al crear o modificar cualquier pantalla, verificar:

- [ ] Desktop ≥ 1024px: layout correcto, sin overflow
- [ ] Tablet < 1024px: drawer funcional, grillas colapsadas
- [ ] Mobile < 768px: 1 columna, `flex-wrap: wrap` en botones
- [ ] Tablas en `.table-container` con scroll horizontal
- [ ] Modales con padding reducido (14-18px) en mobile
- [ ] Touch targets ≥ 38px
- [ ] Hijos flex con `min-width: 0`
