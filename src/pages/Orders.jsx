import { useState } from 'react'
import { useData } from '../context/DataContext'

function OrderModal({ order, clients, products, opportunities, onSave, onClose }) {
  const [clientId, setClientId] = useState(order?.client_id || clients[0]?.id || '')
  const [oppId, setOppId] = useState(order?.opp_id || '')
  const [date, setDate] = useState(order?.date || new Date().toISOString().slice(0,10))
  const [status, setStatus] = useState(order?.status || 'borrador')
  const [ivaRate, setIvaRate] = useState(order?.iva_rate ?? 13)
  const [notes, setNotes] = useState(order?.notes || '')
  const [store, setStore] = useState(order?.store || 'ambas')
  const [items, setItems] = useState(order?.items?.length ? order.items : [{ product_id:'', name:'', price:0, qty:1, sub:0 }])

  const setProduct = (idx, pid) => {
    const p = products.find(x => x.id === pid)
    if (!p) return
    const updated = items.map((it, i) => i === idx ? { product_id: p.id, name: p.name, price: Number(p.price), qty: it.qty || 1, sub: Number(p.price) * (it.qty || 1) } : it)
    setItems(updated)
  }
  const setQty = (idx, q) => {
    const updated = items.map((it, i) => i === idx ? { ...it, qty: parseInt(q) || 1, sub: it.price * (parseInt(q) || 1) } : it)
    setItems(updated)
  }
  const addItem = () => setItems(p => [...p, { product_id:'', name:'', price:0, qty:1, sub:0 }])
  const removeItem = (idx) => setItems(p => p.length > 1 ? p.filter((_, i) => i !== idx) : p)

  const valid = items.filter(i => i.product_id && i.qty > 0)
  const subtotal = valid.reduce((a, i) => a + i.sub, 0)
  const ivaAmt = subtotal * (ivaRate / 100)
  const total = subtotal + ivaAmt
  const usd = n => '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  const submit = () => {
    if (!valid.length) return alert('Agrega al menos un producto')
    onSave({ client_id: clientId, opp_id: oppId || null, items: valid, subtotal, iva_rate: ivaRate, iva_amt: ivaAmt, total, status, date, notes })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box lg">
        <div className="modal-title">{order ? `Editar pedido #${String(order.id).padStart(3,'0')}` : 'Nuevo pedido'}</div>
        <div className="fr">
          <div className="fg"><label>Cliente</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.surname}</option>)}
            </select>
          </div>
          <div className="fg"><label>Fecha</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        </div>
        <div className="fr">
          <div className="fg"><label>Oportunidad vinculada</label>
            <select value={oppId} onChange={e => setOppId(e.target.value)}>
              <option value="">— Ninguna —</option>
              {opportunities.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
          <div className="fg"><label>Estado</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              {['borrador','confirmado','proceso','listo','entregado','cancelado'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="fg">
          <label>Productos del pedido</label>
          {items.map((it, idx) => (
            <div className="oi-row" key={idx}>
              <select value={it.product_id} onChange={e => setProduct(idx, e.target.value)}>
                <option value="">— Producto —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} · {usd(p.price)}</option>)}
              </select>
              <input type="number" min="1" value={it.qty} onChange={e => setQty(idx, e.target.value)} placeholder="Cant." />
              <input value={it.sub ? usd(it.sub) : ''} readOnly style={{ background: '#f9f7f4' }} placeholder="Subtotal" />
              <button className="oi-del" onClick={() => removeItem(idx)}>✕</button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={addItem}>+ Agregar producto</button>
        </div>

        <div className="fg"><label>IVA</label>
          <select value={ivaRate} onChange={e => setIvaRate(parseInt(e.target.value))}>
            <option value={0}>Sin IVA (Exento)</option>
            <option value={13}>IVA 13%</option>
          </select>
        </div>

        <div className="oi-total">
          Subtotal: <strong>{usd(subtotal)}</strong> &nbsp;|&nbsp;
          IVA {ivaRate}%: <strong>{usd(ivaAmt)}</strong> &nbsp;|&nbsp;
          <span style={{ color: 'var(--gold)', fontFamily: 'Cormorant Garamond, serif', fontSize: 18 }}>TOTAL: {usd(total)}</span>
        </div>

        <div className="fr">
          <div className="fg"><label>Tienda</label>
            <select value={store} onChange={e => setStore(e.target.value)}>
              <option value="ambas">Ambas tiendas</option>
              <option value="tienda1">Tienda 1</option>
              <option value="tienda2">Tienda 2</option>
            </select>
          </div>
        </div>
        <div className="fg"><label>Notas</label><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={submit}>Guardar pedido</button>
        </div>
      </div>
    </div>
  )
}

export default function Orders() {
  const { orders, clients, products, opportunities, invoices, saveOrder, createInvoice, clientName, usd, fdate, statusBadge } = useData()
  const [modal, setModal] = useState(null)

  const hasInvoice = id => invoices.some(i => i.order_id === id)

  return (
    <div className="page">
      <div className="ph">
        <div><div className="pt"><span>Pedidos</span></div><div className="ps">{orders.length} pedidos registrados</div></div>
        <button className="btn btn-gold" onClick={() => setModal('new')}>+ Nuevo pedido</button>
      </div>

      <div className="tw">
        <table>
          <thead><tr><th>#</th><th>Cliente</th><th>Fecha</th><th>Items</th><th>Subtotal</th><th>IVA</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{String(o.id).padStart(3,'0')}</td>
                <td>{clientName(o.client_id)}</td>
                <td>{fdate(o.date)}</td>
                <td style={{ fontSize: 12 }}>{(o.items || []).map(i => `${i.name} x${i.qty}`).join(', ')}</td>
                <td>{usd(o.subtotal)}</td>
                <td>{o.iva_rate ? `${o.iva_rate}%` : '—'}</td>
                <td style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, color: 'var(--gold)' }}>{usd(o.total)}</td>
                <td>{statusBadge(o.status)}</td>
                <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '8px 14px' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setModal(o)}>Ver</button>
                  {!hasInvoice(o.id)
                    ? <button className="btn btn-gold btn-sm" onClick={() => createInvoice(o)}>→ Factura</button>
                    : <span className="tag tg-g" style={{ fontSize: 10, alignSelf: 'center' }}>Facturado</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <OrderModal
          order={modal === 'new' ? null : modal}
          clients={clients} products={products} opportunities={opportunities}
          onSave={d => saveOrder(d, modal?.id || null)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
