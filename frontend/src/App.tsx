import { useState } from 'react';
import {
  Truck,
  ShieldCheck,
  FileText,
  ClipboardList,
  Camera,
  MapPin,
  Building2,
  CheckCircle,
  Download,
  Eye,
  Lock
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'tablet' | 'operaciones' | 'comercial' | 'cliente'>('tablet');

  // Estado del flujo Tablet Conductor
  const [pasoTablet, setPasoTablet] = useState<number>(1);
  const [fotosTomadas, setFotosTomadas] = useState<number>(0);
  const [otFirmada, setOtFirmada] = useState<boolean>(false);
  const [fotosFaena, setFotosFaena] = useState<number>(0);
  const [recepcionFirmada, setRecepcionFirmada] = useState<boolean>(false);
  const [sidrepSellado, setSidrepSellado] = useState<boolean>(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Institucional SATEM */}
      <header
        style={{
          height: 64,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 'var(--z-sticky)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              background: 'var(--accent-primary)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 800,
              fontFamily: 'var(--font-heading)'
            }}
          >
            ZION
          </div>
          <div>
            <h2 style={{ fontSize: '1.125rem', margin: 0 }}>ZION SERVICES</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Gestión Ambiental & Residuos Peligrosos · SATEM
            </span>
          </div>
        </div>

        {/* Selector de Perfiles y Vistas */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className={`btn ${activeTab === 'tablet' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('tablet')}
          >
            <Truck size={16} /> Tablet Conductor
          </button>
          <button
            className={`btn ${activeTab === 'operaciones' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('operaciones')}
          >
            <ClipboardList size={16} /> Operaciones & 360°
          </button>
          <button
            className={`btn ${activeTab === 'comercial' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('comercial')}
          >
            <Building2 size={16} /> Gestión Comercial & EDP
          </button>
          <button
            className={`btn ${activeTab === 'cliente' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('cliente')}
          >
            <Lock size={16} /> Portal Clientes
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main style={{ flex: 1, padding: 24, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {/* ========================================================= */}
        {/* 1. VISTA TABLET ANDROID PARA CONDUCTORES */}
        {/* ========================================================= */}
        {activeTab === 'tablet' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 'var(--text-h2)' }}>Terminal Móvil de Terreno</h1>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Camión RVFL-92 (Estanque 12m³) · Conductor: Cristian Sánchez · OS-000561
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="badge badge-success">Tablet Android Online</span>
                <span className="badge badge-info">Modalidad: Local Santiago</span>
              </div>
            </div>

            {/* Asistente Secuencial de Terreno */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {/* Paso 1 */}
              <div
                className="card"
                style={{
                  border: pasoTablet === 1 ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  opacity: pasoTablet >= 1 ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <ShieldCheck size={20} color="var(--accent-primary)" />
                  <h3>1. Salida Planta Zion</h3>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Checklist F-GMT-MAN-004 (80 ítems) + 4 fotos 360° obligatorias del camión.
                </p>
                <div style={{ margin: '12px 0', fontSize: '0.875rem' }}>
                  Fotos capturadas: <strong>{fotosTomadas} / 4</strong>
                </div>
                {fotosTomadas < 4 ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => setFotosTomadas((prev) => Math.min(4, prev + 1))}
                  >
                    <Camera size={16} /> Capturar Foto ({fotosTomadas + 1}/4)
                  </button>
                ) : (
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', borderColor: 'var(--success)', color: 'var(--success)' }}
                    onClick={() => setPasoTablet(2)}
                  >
                    <CheckCircle size={16} /> Salida Autorizada → Ir a Faena
                  </button>
                )}
              </div>

              {/* Paso 2 */}
              <div
                className="card"
                style={{
                  border: pasoTablet === 2 ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  opacity: pasoTablet >= 2 ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <MapPin size={20} color="var(--info)" />
                  <h3>2. Faena en Cliente (Horse Chile)</h3>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Llegada, firma de Orden de Trabajo, fotos de succión/EPP y firma de recepción.
                </p>

                {!otFirmada ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 8 }}
                    disabled={pasoTablet < 2}
                    onClick={() => setOtFirmada(true)}
                  >
                    Firma de Inicio OT (Cliente en Pantalla)
                  </button>
                ) : fotosFaena < 2 ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 8 }}
                    onClick={() => setFotosFaena((prev) => prev + 1)}
                  >
                    <Camera size={16} /> Foto Succión & EPPs ({fotosFaena + 1}/2)
                  </button>
                ) : !recepcionFirmada ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 8 }}
                    onClick={() => {
                      setRecepcionFirmada(true);
                      setPasoTablet(3);
                    }}
                  >
                    Firma Recepción Conforme (Cliente)
                  </button>
                ) : (
                  <span className="badge badge-success" style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
                    <CheckCircle size={16} /> Faena Completada
                  </span>
                )}
              </div>

              {/* Paso 3 */}
              <div
                className="card"
                style={{
                  border: pasoTablet === 3 ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  opacity: pasoTablet >= 3 ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <FileText size={20} color="var(--warning)" />
                  <h3>3. Destino & Romana (Bravo Energy)</h3>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Descarga, foto de SIDREP sellado por romana y comprobante oficial de pesaje.
                </p>

                {!sidrepSellado ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 8 }}
                    disabled={pasoTablet < 3}
                    onClick={() => {
                      setSidrepSellado(true);
                      setPasoTablet(4);
                    }}
                  >
                    <Camera size={16} /> Foto SIDREP Timbrado + Ticket Romana
                  </button>
                ) : (
                  <span className="badge badge-success" style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
                    <CheckCircle size={16} /> Descarga Certificada (11.820 KG)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. VISTA BACKOFFICE OPERACIONES & VISOR 360° */}
        {/* ========================================================= */}
        {activeTab === 'operaciones' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h1 style={{ fontSize: 'var(--text-h2)' }}>Panel de Control de Operaciones</h1>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Monitoreo de flota, validación de invariante de descarga y visor comparativo 360°.
              </p>
            </div>

            {/* Comparativa Visual 360° Salida vs Retorno */}
            <div className="card">
              <h3>Auditoría Visual Perimetral del Camión (Salida vs. Retorno a Base)</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Comparación lado a lado de los 4 ángulos para detección inmediata de abolladuras, rayones o percances mecánicos.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 16 }}>
                {['Frontal', 'Lateral Izquierda', 'Trasera', 'Lateral Derecha'].map((angulo) => (
                  <div key={angulo} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>{angulo}</div>
                    <div style={{ background: '#000', height: 120, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                      Foto Salida (OK)
                    </div>
                    <div style={{ background: '#111', height: 120, borderRadius: 6, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                      Foto Retorno (Pendiente)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. VISTA GESTIÓN COMERCIAL & ESTADOS DE PAGO (EDP) */}
        {/* ========================================================= */}
        {activeTab === 'comercial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h1 style={{ fontSize: 'var(--text-h2)' }}>Gestión Comercial & Estados de Pago</h1>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Consolidación quincenal y mensual de órdenes de servicio, validación de Órdenes de Compra y prefacturación.
              </p>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3>Estado de Pago: EDP-2026-11-Q1 (Horse Chile SpA)</h3>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Período: 01 al 15 Noviembre 2026 · RUT: 93.367.000-7</span>
                </div>
                <span className="badge badge-warning">Esperando Orden de Compra (OC)</span>
              </div>

              <div className="table-container">
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: 12 }}>Folio OS</th>
                      <th style={{ padding: 12 }}>Fecha</th>
                      <th style={{ padding: 12 }}>Residuo Retirado</th>
                      <th style={{ padding: 12 }}>Peso Certificado Destino</th>
                      <th style={{ padding: 12 }}>Monto Neto</th>
                      <th style={{ padding: 12 }}>Expediente Digital</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: 12, fontWeight: 600 }}>OS-000561</td>
                      <td style={{ padding: 12 }}>10/11/2026</td>
                      <td style={{ padding: 12 }}>Aguas de lavado con aceites</td>
                      <td style={{ padding: 12 }}>11.820 KG (Bravo Energy)</td>
                      <td style={{ padding: 12 }}>$ 850.000</td>
                      <td style={{ padding: 12 }}>
                        <span className="badge badge-success"><CheckCircle size={12} /> Completo Zero-Paper</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 20, alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div>Neto: <strong>$ 850.000</strong></div>
                  <div>IVA (19%): <strong>$ 161.500</strong></div>
                  <div style={{ fontSize: '1.25rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Total: $ 1.011.500</div>
                </div>
                <button className="btn btn-primary">
                  <FileText size={16} /> Adjuntar OC y Habilitar Factura
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. PORTAL CLIENTES CON DESCARGA ZIP (TENANT ISOLATION) */}
        {/* ========================================================= */}
        {activeTab === 'cliente' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: 'var(--text-h2)' }}>Portal de Clientes — Horse Chile SpA</h1>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Seguimiento de atenciones ambientales, descargas autorizadas y certificados de disposición.
                </p>
              </div>
              <span className="badge badge-info">Tenant: Horse Chile (Faena Los Andes)</span>
            </div>

            <div className="card">
              <h3>Atención OS-000561: Succión de Aguas con Aceite</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Servicio completado el 10/11/2026 por Zion Service SpA. Destino final certificado en Bravo Energy Maipú.
              </p>

              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <button className="btn btn-primary">
                  <Download size={16} /> Descargar Expediente Completo (ZIP)
                </button>
                <button className="btn btn-secondary">
                  <Eye size={16} /> Ver Certificado SIDREP Timbrado (PDF)
                </button>
                <button className="btn btn-secondary">
                  <Eye size={16} /> Ver Ticket de Romana de Destino
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
