# SATEM Design Tokens — CSS Variables

Declarar en `:root` del archivo `src/index.css` del proyecto.

```css
:root {
  /* ========== FONDOS ========== */
  --bg-primary:       #0f172a;
  --bg-surface:       #1e293b;
  --bg-card:          #1e293b;
  --bg-card-hover:    #334155;
  --bg-input:         #0f172a;
  --bg-overlay:       rgba(15, 23, 42, 0.85);

  /* ========== BRAND SATEM ========== */
  --accent-primary:       #00a896;
  --accent-primary-hover: #008f80;
  --accent-glow:          rgba(0, 168, 150, 0.25);

  /* ========== BORDES ========== */
  --border-color: #334155;
  --border-light: #475569;

  /* ========== TEXTOS ========== */
  --text-primary:   #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted:     #64748b;

  /* ========== ESTADOS SEMÁNTICOS ========== */
  --success:    #10b981;
  --success-bg: rgba(16, 185, 129, 0.15);
  --warning:    #f59e0b;
  --warning-bg: rgba(245, 158, 11, 0.15);
  --danger:     #ef4444;
  --danger-bg:  rgba(239, 68, 68, 0.15);
  --info:       #3b82f6;
  --info-bg:    rgba(59, 130, 246, 0.15);

  /* ========== TIPOGRAFÍA ========== */
  --font-heading: 'Outfit', sans-serif;
  --font-sans:    'Inter', sans-serif;

  /* Escala fluida de headings */
  --text-h1: clamp(1.75rem, 4vw, 2.5rem);
  --text-h2: clamp(1.375rem, 3vw, 1.875rem);
  --text-h3: clamp(1.125rem, 2.5vw, 1.5rem);
  --text-h4: clamp(1rem, 2vw, 1.25rem);

  /* ========== RADIOS ========== */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-pill: 9999px;

  /* ========== SOMBRAS ========== */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.3), 0 4px 6px rgba(0,0,0,0.2);
  --shadow-accent: 0 4px 20px rgba(0, 168, 150, 0.3);

  /* ========== TRANSICIONES ========== */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;

  /* ========== Z-INDEX ========== */
  --z-dropdown: 100;
  --z-sticky:   200;
  --z-drawer:   300;
  --z-modal:    400;
  --z-toast:    500;
}

/* Reset base */
*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: var(--font-sans);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  color: var(--text-primary);
  margin: 0;
}

h1 { font-size: var(--text-h1); }
h2 { font-size: var(--text-h2); }
h3 { font-size: var(--text-h3); }
h4 { font-size: var(--text-h4); }
```
