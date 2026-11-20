import { useState } from 'react';
import { Truck, ShieldCheck, FileText, ClipboardList, Camera, MapPin, Building2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'operaciones' | 'tablet' | 'comercial'>('tablet');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Institucional SATEM */}
      <header style={{
        height: 64,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: 'var(--accent-primary)',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 800,
            fontFamily: 'var(--font-heading)'
          }}>
            ZS
          </div>
          <div>
            <h2 style={{ fontSize: '1.125rem', margin: 0 }}>ZION SERVICES</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gestión Ambiental & Residuos Peligrosos</span>
          </div>
        </div>

        {/* Selector de Vistas / Perfiles */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${activeTab === 'tablet' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('tablet')}
          >
            <Truck size={16} /> Tablet Conductor (Android)
          </button>
          <button
            className={`btn ${activeTab === 'operaciones' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('operaciones')}
          >
            <ClipboardList size={16} /> Operaciones
          </button>
          <button
            className={`btn ${activeTab === 'comercial' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('comercial')}
          >
            <Building2 size={16} /> Gestión Comercial & EDP
          </button>
        </div>
      </header>

      {/* Cuerpo Principal */}
      <main style={{ flex: 1, padding: 24, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {activeTab === 'tablet' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: 'var(--text-h2)' }}>Terminal Móvil — Conductor</h1>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Camión RVFL-92 · Conductor: Cristian Sánchez</p>
              </div>
              <span className="badge badge-success">Conectado / Online</span>
            </div>

            {/* Asistente de Pasos en Terreno */}
            <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <ShieldCheck size={20} color="var(--accent-primary)" />
                  <strong>1. Salida de Planta Zion</strong>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Checklist F-GMT-MAN-004 (80 ítems) + 4 fotos 360° del camión.
                </p>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
                  <Camera size={16} /> Iniciar Inspección y Fotos
                </button>
              </div>

              <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <MapPin size={20} color="var(--info)" />
                  <strong>2. Faena en Cliente</strong>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Marcar llegada, firma de Orden de Trabajo por cliente, fotos de succión y EPP.
                </p>
                <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }}>
                  Marcar Llegada a Faena
                </button>
              </div>

              <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <FileText size={20} color="var(--warning)" />
                  <strong>3. Destino & Romana</strong>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Descarga en destino, foto del SIDREP sellado y ticket de romana.
                </p>
                <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }} disabled>
                  Esperando Retiro
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'operaciones' && (
          <div className="card">
            <h2>Panel de Control de Operaciones — Base Central Santiago</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Monitoreo de jornadas locales, campañas interregionales y supervisión remota de autochecklists.
            </p>
          </div>
        )}

        {activeTab === 'comercial' && (
          <div className="card">
            <h2>Gestión Comercial & Liquidaciones (Estados de Pago)</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Consolidación periódica de órdenes de servicio, validación de Órdenes de Compra y expedientes ZIP.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
