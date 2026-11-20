# SATEM Componentes UI Canónicos

## Botones

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  min-height: 38px;
  border-radius: var(--radius-md);
  border: none;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
  white-space: nowrap;
}
.btn:active { transform: scale(0.98); }

.btn-primary {
  background: var(--accent-primary);
  color: #fff;
}
.btn-primary:hover { background: var(--accent-primary-hover); }

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
.btn-secondary:hover { background: var(--bg-card-hover); }

.btn-danger {
  background: var(--danger);
  color: #fff;
}
.btn-danger:hover { background: #dc2626; }

.btn-icon {
  padding: 9px;
  background: var(--bg-card);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.btn-icon:hover { color: var(--text-primary); background: var(--bg-card-hover); }

/* Contenedor de grupo de botones */
.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
```

## Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid transparent;
}

.badge-success { color: var(--success); background: var(--success-bg); border-color: rgba(16,185,129,0.3); }
.badge-warning { color: var(--warning); background: var(--warning-bg); border-color: rgba(245,158,11,0.3); }
.badge-danger  { color: var(--danger);  background: var(--danger-bg);  border-color: rgba(239,68,68,0.3); }
.badge-info    { color: var(--info);    background: var(--info-bg);    border-color: rgba(59,130,246,0.3); }
```

## Cards & KPIs

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
  transition: border-color var(--transition-base), box-shadow var(--transition-base);
}
.card:hover {
  border-color: var(--accent-primary);
  box-shadow: var(--shadow-accent);
}

.kpi-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kpi-value {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
}
.kpi-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}
```

## Tablas Responsivas

```css
.table-container {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

thead tr {
  background: var(--bg-primary);
}

th {
  padding: 12px 16px;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

td {
  padding: 14px 16px;
  font-size: 0.875rem;
  color: var(--text-primary);
  border-top: 1px solid var(--border-color);
}

tbody tr:hover { background: var(--bg-card-hover); }
```

## Formularios

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input,
.form-select,
.form-textarea {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  padding: 10px 14px;
  min-height: 38px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-glow);
}

.form-textarea { resize: vertical; min-height: 100px; }
```

## Modal (React Component Pattern)

```tsx
// Modal.tsx
import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = '580px' }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
```

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: 16px;
}

.modal-dialog {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-body { padding: 20px; }
```
