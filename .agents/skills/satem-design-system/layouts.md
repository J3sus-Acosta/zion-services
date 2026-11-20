# SATEM Layouts & Navegación

## AppLayout (Backoffice)

```
┌─────────────────────────────────────────────┐
│  HEADER (sticky top, h: 64px)               │
│  [Logo] [Breadcrumbs]      [User / Notif]   │
├──────────────┬──────────────────────────────┤
│              │                              │
│  SIDEBAR     │  MAIN CONTENT               │
│  (240px)     │  max-width: 1600px           │
│  sticky      │  padding: 24px              │
│              │                              │
│  nav items   │                              │
│              │                              │
└──────────────┴──────────────────────────────┘
```

```css
.app-container {
  display: flex;
  min-height: 100vh;
  background: var(--bg-primary);
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.header {
  position: sticky;
  top: 0;
  height: 64px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  z-index: var(--z-sticky);
}

.content-body {
  flex: 1;
  padding: 24px;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
}
```

## Drawer Móvil (< 1024px)

```css
/* Overlay backdrop */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  z-index: var(--z-drawer);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-base);
}
.drawer-backdrop.open {
  opacity: 1;
  pointer-events: all;
}

/* Sidebar convertido en drawer */
@media (max-width: 1023px) {
  .sidebar {
    position: fixed;
    left: -260px;
    top: 0;
    height: 100vh;
    width: 240px;
    z-index: calc(var(--z-drawer) + 1);
    transition: left var(--transition-base);
  }
  .sidebar.open { left: 0; }
}
```

## Rejillas de Contenido

```css
.grid-4  { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.grid-3  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.grid-2  { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.grid-split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.grid-form-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }

@media (max-width: 1023px) {
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
  .grid-3 { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 767px) {
  .grid-4, .grid-3, .grid-2, .grid-split, .grid-form-2 {
    grid-template-columns: 1fr;
  }
}
```

## Patrón Master-Detail

```css
.master-detail {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 0;
  min-height: calc(100vh - 64px);
}

.master-panel {
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
}

.detail-panel {
  padding: 24px;
  overflow-y: auto;
}

@media (max-width: 1023px) {
  .master-detail { grid-template-columns: 1fr; }
  .master-panel { border-right: none; border-bottom: 1px solid var(--border-color); }
}
```

## Page Header

```css
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.page-title {
  font-family: var(--font-heading);
  font-size: var(--text-h2);
  font-weight: 700;
  color: var(--text-primary);
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 4px;
}
```
