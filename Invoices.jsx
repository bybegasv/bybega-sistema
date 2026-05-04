import { useState } from 'react'
import { useData } from '../context/DataContext'

function InvoicePreview({ inv, client, order, settings, onClose, onMarkPaid }) {
  const usd = n => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fdate = d => { if (!d) return '—'; return new Date(d + 'T12:00:00').toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  const s = settings

  const printInvoice = () => {
    const box = document.getElementById('inv-print-content')
    if (!box) return
    const w = window.open('', '_blank', 'width=800,height=900')
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${inv.number}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;padding:40px;color:#1a1714;background:#fff}
    .inv-company{font-family:'Cormorant Garamond',serif;font-size:28px;color:#b8974a;letter-spacing:2px}
    table{width:100%;border-collapse:collapse}th,td{padding:8px 12px;font-size:12px;text-align:left}
    thead{background:#f9f7f4}tfoot td{font-weight:500;font-size:14px;padding-top:10px}
    hr{border:none;border-top:2px solid #b8974a;margin:16px 0}
    @media print{@page{margin:1cm}}</style></head><body>
    ${box.innerHTML}
    <script>window.onload=function(){window.print()}<\/script></body></html>`)
    w.document.close()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box lg">
        <div id="inv-print-content">
          <div className="inv-preview">
            <div className="inv-header">
              <div>
                <div className="inv-company">{s.company || 'bybega'}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.7 }}>
                  {s.address}<br />NIT: {s.nit}<br />{s.phone} · {s.email}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 500 }}>FACTURA</div>
                <div style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--gold)', marginTop: 4 }}>{inv.number}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Fecha: {fdate(inv.date)}</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  {inv.paid ? <span style={{ color: 'var(--success)' }}>✓ PAGADA</span> : <span style={{ color: 'var(--danger)' }}>PENDIENTE</span>}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 6 }}>DATOS DEL CLIENTE</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{client?.name} {client?.surname}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.7 }}>
                  {client?.nit ? `NIT: ${client.nit}` : ''}<br />
                  {client?.email}<br />{client?.phone}<br />
                  {client?.shipping_addr || client?.city}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 6 }}>REFERENCIA</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
                  Pedido: #{String(inv.order_id).padStart(3,'0')}<br />
                  {inv.notes}
                </div>
              </div>
            </div>

            <table>
              <thead><tr><th>Descripción</th><th style={{ textAlign: 'center' }}>Cant.</th><th style={{ textAlign: 'right' }}>Precio unit.</th><th style={{ textAlign: 'right' }}>Subtotal</th></tr></thead>
              <tbody>
                {(order?.items || []).map((item, i) => (
                  <tr key={i}>
                    <td>{item.name}</td>
                    <td style={{ textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ textAlign: 'right' }}>{usd(item.price)}</td>
                    <td style={{ textAlign: 'right' }}>{usd(item.sub)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3} style={{ textAlign: 'right', paddingTop: 12, fontSize: 12, color: 'var(--muted)' }}>Subtotal</td><td style={{ textAlign: 'right', paddingTop: 12 }}>{usd(inv.subtotal)}</td></tr>
                <tr><td colSpan={3} style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>IVA {inv.iva_rate}%{inv.iva_rate === 0 ? ' (Exento)' : ''}</td><td style={{ textAlign: 'right' }}>{usd(inv.iva_amt)}</td></tr>
                <tr style={{ borderTop: '1px solid rgba(0,0,0,.1)' }}>
                  <td colSpan={3} style={{ textAlign: 'right', paddingTop: 10, fontSize: 15, fontWeight: 500 }}>TOTAL USD</td>
                  <td style={{ textAlign: 'right', paddingTop: 10, fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: 'var(--gold)' }}>{usd(inv.total)}</td>
                </tr>
              </tfoot>
            </table>

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{s.company} · Joyería artesanal</div>
                {s.slogan}<br />{s.instagram}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid rgba(0,0,0,.15)', marginTop: 40, paddingTop: 8, fontSize: 11, color: 'var(--muted)' }}>Firma y sello del cliente</div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          {!inv.paid && <button className="btn btn-success" onClick={() => { onMarkPaid(inv.id); onClose() }}>✓ Marcar pagada</button>}
          <button className="btn btn-gold" onClick={printInvoice}>🖨 Imprimir / PDF</button>
        </div>
      </div>
    </div>
  )
}

export default function Invoices() {
  const { invoices, orders, clients, settings, markInvoicePaid, openDelivery, deliveries, usd, fdate } = useData()
  const [viewing, setViewing] = useState(null)

  const totalPaid = invoices.filter(i => i.paid).reduce((a, i) => a + Number(i.total), 0)
  const totalPending = invoices.filter(i => !i.paid).reduce((a, i) => a + Number(i.total), 0)
  const hasDelivery = id => deliveries?.some(d => d.invoice_id === id)

  return (
    <div className="page">
      <div className="ph">
        <div><div className="pt"><span>Facturas</span></div><div className="ps">El Salvador · IVA 13%</div></div>
      </div>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="sc"><div className="sc-label">Total facturado</div><div className="sc-value">{usd(totalPaid + totalPending)}</div></div>
        <div className="sc"><div className="sc-label">Cobrado</div><div className="sc-value">{usd(totalPaid)}</div><div className="sc-badge bg-g">pagadas</div></div>
        <div className="sc"><div className="sc-label">Por cobrar</div><div className="sc-value">{usd(totalPending)}</div><div className="sc-badge bg-r">impagas</div></div>
      </div>

      <div className="tw">
        <table>
          <thead><tr><th>Número</th><th>Cliente</th><th>Pedido</th><th>Fecha</th><th>Subtotal</th><th>IVA</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{inv.number}</td>
                <td>{clients.find(c => c.id === inv.client_id)?.name || '—'} {clients.find(c => c.id === inv.client_id)?.surname || ''}</td>
                <td style={{ fontSize: 11, color: 'var(--muted)' }}>#{String(inv.order_id).padStart(3,'0')}</td>
                <td>{fdate(inv.date)}</td>
                <td>{usd(inv.subtotal)}</td>
                <td>{inv.iva_rate ? `${inv.iva_rate}% (${usd(inv.iva_amt)})` : 'Exento'}</td>
                <td style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, color: 'var(--gold)' }}>{usd(inv.total)}</td>
                <td>{inv.paid ? <span className="tag tg-g">Pagada</span> : <span className="tag tg-r">Impaga</span>}</td>
                <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '8px 14px' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setViewing(inv)}>Ver</button>
                  {!inv.paid && <button className="btn btn-success btn-sm" onClick={() => markInvoicePaid(inv.id)}>✓ Cobrada</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewing && (
        <InvoicePreview
          inv={viewing}
          client={clients.find(c => c.id === viewing.client_id)}
          order={orders.find(o => o.id === viewing.order_id)}
          settings={settings}
          onMarkPaid={markInvoicePaid}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}
