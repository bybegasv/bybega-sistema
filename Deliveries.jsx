import { useState } from 'react'
import { useData } from '../context/DataContext'

function DeliveryModal({ delivery, invoices, clients, onSave, onClose }) {
  const getClient = (invId) => {
    const inv = invoices.find(i => i.id === invId)
    return inv ? clients.find(c => c.id === inv.client_id) : null
  }
  const getItems = (invId) => {
    // items from context orders would be ideal; this is a text fallback
    return delivery?.items || ''
  }

  const [f, setF] = useState({
    invoice_id: delivery?.invoice_id || invoices[0]?.id || '',
    date: delivery?.date || new Date().toISOString().slice(0,10),
    address: delivery?.address || '',
    items: delivery?.items || '',
    status: delivery?.status || 'pendiente',
    received: delivery?.received || '',
    notes: delivery?.notes || ''
  })
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleInvChange = (invId) => {
    const client = getClient(invId)
    setF(p => ({ ...p, invoice_id: invId, address: client?.shipping_addr || client?.city || p.address }))
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box lg">
        <div className="modal-title">{delivery ? 'Editar' : 'Nueva'} entrega</div>
        <div className="fr">
          <div className="fg"><label>Factura asociada</label>
            <select value={f.invoice_id} onChange={e => handleInvChange(e.target.value)}>
              {invoices.map(i => {
                const c = clients.find(x => x.id === i.client_id)
                return <option key={i.id} value={i.id}>{i.number} · {c?.name} {c?.surname}</option>
              })}
            </select>
          </div>
          <div className="fg"><label>Fecha de entrega</label><input type="date" value={f.date} onChange={e => s('date', e.target.value)} /></div>
        </div>
        <div className="fg"><label>Dirección de entrega</label><input value={f.address} onChange={e => s('address', e.target.value)} placeholder="Dirección completa" /></div>
        <div className="fg"><label>Productos entregados</label><textarea rows={2} value={f.items} onChange={e => s('items', e.target.value)} placeholder="Anillo Eternal Gold x1, Collar Infinity x1…" /></div>
        <div className="fr">
          <div className="fg"><label>Estado</label>
            <select value={f.status} onChange={e => s('status', e.target.value)}>
              {['pendiente','en camino','entregado'].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div className="fg"><label>Nombre de quien recibe</label><input value={f.received} onChange={e => s('received', e.target.value)} placeholder="Nombre completo" /></div>
        </div>
        <div className="fg"><label>Notas</label><textarea rows={2} value={f.notes} onChange={e => s('notes', e.target.value)} /></div>
        <div style={{ background: '#f9f7f4', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
          ✦ Al marcar como "entregado" se confirma que el cliente recibió los productos en perfecto estado.
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={() => {
            const inv = invoices.find(i => i.id === f.invoice_id)
            onSave({ ...f, order_id: inv?.order_id || null, client_id: inv?.client_id || null })
            onClose()
          }}>Guardar entrega</button>
        </div>
      </div>
    </div>
  )
}

export default function Deliveries() {
  const { deliveries, invoices, clients, saveDelivery, fdate, statusBadge } = useData()
  const [modal, setModal] = useState(null)

  const getInvNum = id => invoices.find(i => i.id === id)?.number || '—'
  const getClientName = invId => {
    const inv = invoices.find(i => i.id === invId)
    const c = clients.find(x => x.id === inv?.client_id)
    return c ? `${c.name} ${c.surname}` : '—'
  }

  return (
    <div className="page">
      <div className="ph">
        <div><div className="pt"><span>Entregas</span></div><div className="ps">Formulario de entrega de productos</div></div>
        <button className="btn btn-gold" onClick={() => setModal('new')}>+ Nueva entrega</button>
      </div>

      <div className="tw">
        <table>
          <thead><tr><th>Fecha</th><th>Cliente</th><th>Factura</th><th>Dirección</th><th>Productos</th><th>Estado</th><th>Recibido por</th><th>Acciones</th></tr></thead>
          <tbody>
            {deliveries.length ? deliveries.map(d => (
              <tr key={d.id}>
                <td>{fdate(d.date)}</td>
                <td>{getClientName(d.invoice_id)}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{getInvNum(d.invoice_id)}</td>
                <td style={{ fontSize: 12, maxWidth: 180 }}>{d.address}</td>
                <td style={{ fontSize: 12 }}>{d.items}</td>
                <td>{statusBadge(d.status)}</td>
                <td>{d.received || '—'}</td>
                <td><button className="btn btn-outline btn-sm" onClick={() => setModal(d)}>Editar</button></td>
              </tr>
            )) : (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 28 }}>Sin entregas registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <DeliveryModal
          delivery={modal === 'new' ? null : modal}
          invoices={invoices} clients={clients}
          onSave={d => saveDelivery(d, modal?.id || null)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
