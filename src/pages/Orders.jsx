import { useState } from 'react'
import { useData } from '../context/DataContext'

const PAY_METHODS = [
  { value: 'cash',     label: 'Efectivo' },
  { value: 'card',     label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'paypal',   label: 'PayPal' },
]
const PAY_LBL = Object.fromEntries(PAY_METHODS.map(m => [m.value, m.label]))

function PaymentRow({ p, onDelete, usd, fdate }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'90px 1fr 110px 110px 28px', gap:8, alignItems:'center', padding:'8px 10px', background:'#f9f7f4', borderRadius:6, marginBottom:6, fontSize:12 }}>
      <span style={{ color:'var(--muted)' }}>{fdate(p.date)}</span>
      <span><span className="tag tg-b" style={{ fontSize:10 }}>{PAY_LBL[p.method] || p.method}</span> {p.reference && <span style={{ color:'var(--muted)' }}>· {p.reference}</span>}</span>
      <span style={{ fontFamily:'Cormorant Garamond, serif', fontSize:16, color:'var(--gold)' }}>{usd(p.amount)}</span>
      <span style={{ fontSize:11, color:'var(--muted)' }}>{p.notes || '—'}</span>
      <button className="oi-del" title="Eliminar" onClick={() => onDelete(p.id)}>✕</button>
    </div>
  )
}

function OrderModal({ order, clients, products, opportunities, onSave, onClose }) {
  const { savePayment, deletePayment, orderPayments, orderPaid, usd, fdate } = useData()
  const [clientId, setClientId] = useState(order?.client_id || clients[0]?.id || '')
  const [oppId, setOppId] = useState(order?.opp_id || '')
  const [date, setDate] = useState(order?.date || new Date().toISOString().slice(0,10))
  const [status, setStatus] = useState(order?.status || 'borrador')
  const [ivaRate, setIvaRate] = useState(order?.iva_rate ?? 13)
  const [notes, setNotes] = useState(order?.notes || '')
  const [store, setStore] = useState(order?.store || 'ambas')
  const [paymentMethod, setPaymentMethod] = useState(order?.payment_method || 'cash')
  const [items, setItems] = useState(order?.items?.length ? order.items : [{ product_id:'', name:'', price:0, qty:1, sub:0 }])

  // Abono nuevo (solo cuando ya existe el pedido)
  const [newPay, setNewPay] = useState({ amount:'', method:'cash', date: new Date().toISOString().slice(0,10), reference:'', notes:'' })
  const [paySaving, setPaySaving] = useState(false)

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

  const paid = order ? orderPaid(order.id) : 0
  const balance = Math.max(0, (order?.total || total) - paid)
  const pays = order ? orderPayments(order.id) : []

  const submit = () => {
    if (!clientId) return alert('Selecciona un cliente')
    if (!valid.length) return alert('Agrega al menos un producto')
    onSave({
      client_id: clientId, opp_id: oppId || null, items: valid,
      subtotal, iva_rate: ivaRate, iva_amt: ivaAmt, total,
      status, date, notes, store, payment_method: paymentMethod
    })
    onClose()
  }

  const addPay = async () => {
    const amt = Number(newPay.amount)
    if (!order) return alert('Primero guarda el pedido')
    if (!amt || amt <= 0) return alert('Monto inválido')
    setPaySaving(true)
    await savePayment({ order_id: order.id, amount: amt, method: newPay.method, date: newPay.date, reference: newPay.reference, notes: newPay.notes })
    setNewPay({ amount:'', method:'cash', date: new Date().toISOString().slice(0,10), reference:'', notes:'' })
    setPaySaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box lg">
        <div className="modal-title">{order ? `Editar pedido #${String(order.id).padStart(3,'0')}` : 'Nuevo pedido'}</div>
        <div className="fr">
          <div className="fg"><label>Cliente</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">— Selecciona cliente —</option>
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
              {['borrador','pendiente','confirmado','proceso','listo','entregado','cancelado'].map(s => <option key={s} value={s}>{s}</option>)}
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

        <div className="fr3">
          <div className="fg"><label>IVA</label>
            <select value={ivaRate} onChange={e => setIvaRate(parseInt(e.target.value))}>
              <option value={0}>Sin IVA (Exento)</option>
              <option value={13}>IVA 13%</option>
            </select>
          </div>
          <div className="fg"><label>Tienda</label>
            <select value={store} onChange={e => setStore(e.target.value)}>
              <option value="ambas">Ambas tiendas</option>
              <option value="tienda1">Tienda 1</option>
              <option value="tienda2">Tienda 2</option>
            </select>
          </div>
          <div className="fg"><label>Método de pago principal</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              <option value="mixed">Mixto (varios)</option>
            </select>
          </div>
        </div>

        <div className="oi-total">
          Subtotal: <strong>{usd(subtotal)}</strong> &nbsp;|&nbsp;
          IVA {ivaRate}%: <strong>{usd(ivaAmt)}</strong> &nbsp;|&nbsp;
          <span style={{ color: 'var(--gold)', fontFamily: 'Cormorant Garamond, serif', fontSize: 18 }}>TOTAL: {usd(total)}</span>
        </div>

        {/* SECCIÓN DE ABONOS — solo cuando el pedido ya existe */}
        {order && (
          <div className="fg" style={{ marginTop:18, paddingTop:18, borderTop:'1px dashed rgba(0,0,0,.1)' }}>
            <label style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>Abonos · pagos parciales</span>
              <span style={{ fontSize:12, color: balance>0 ? 'var(--danger)' : 'var(--success)', textTransform:'none', letterSpacing:0, fontWeight:500 }}>
                Pagado: {usd(paid)} · Saldo: {usd(balance)}
              </span>
            </label>
            {pays.length > 0 && (
              <div style={{ marginTop:8, marginBottom:12 }}>
                {pays.map(p => <PaymentRow key={p.id} p={p} onDelete={deletePayment} usd={usd} fdate={fdate} />)}
              </div>
            )}
            <div style={{ background:'rgba(184,151,74,.06)', padding:12, borderRadius:8, border:'1px solid rgba(184,151,74,.18)' }}>
              <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Registrar nuevo abono</div>
              <div style={{ display:'grid', gridTemplateColumns:'120px 130px 130px 1fr 100px', gap:8, alignItems:'flex-end' }}>
                <div><label style={{ fontSize:10, color:'var(--muted)' }}>Monto</label>
                  <input type="number" step="0.01" min="0" value={newPay.amount} onChange={e => setNewPay(p => ({...p, amount: e.target.value}))} placeholder="0.00" /></div>
                <div><label style={{ fontSize:10, color:'var(--muted)' }}>Método</label>
                  <select value={newPay.method} onChange={e => setNewPay(p => ({...p, method: e.target.value}))}>
                    {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select></div>
                <div><label style={{ fontSize:10, color:'var(--muted)' }}>Fecha</label>
                  <input type="date" value={newPay.date} onChange={e => setNewPay(p => ({...p, date: e.target.value}))} /></div>
                <div><label style={{ fontSize:10, color:'var(--muted)' }}>Referencia / Notas</label>
                  <input maxLength={120} value={newPay.reference} onChange={e => setNewPay(p => ({...p, reference: e.target.value}))} placeholder="Núm. transferencia, terminal…" /></div>
                <button className="btn btn-gold btn-sm" onClick={addPay} disabled={paySaving} style={{ height:36 }}>
                  {paySaving ? '…' : '+ Abonar'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="fg" style={{ marginTop:14 }}><label>Notas</label><textarea maxLength={1000} rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn-gold" onClick={submit}>Guardar pedido</button>
        </div>
      </div>
    </div>
  )
}

export default function Orders() {
  const { orders, clients, products, opportunities, invoices, saveOrder, createInvoice, clientName, usd, fdate, statusBadge, orderPaid } = useData()
  const [modal, setModal] = useState(null)
  const [filter, setFilter] = useState('todos')

  const hasInvoice = id => invoices.some(i => i.order_id === id)
  const storeLbl = { ambas:'Ambas', tienda1:'T1', tienda2:'T2' }
  const filtered = filter === 'todos' ? orders : orders.filter(o => o.status === filter)

  const payBadge = (o) => {
    const paid = orderPaid(o.id)
    const total = Number(o.total || 0)
    if (paid <= 0) return <span className="tag tg-r" style={{ fontSize:10 }}>Sin pagar</span>
    if (paid >= total) return <span className="tag tg-g" style={{ fontSize:10 }}>Pagado</span>
    return <span className="tag tg" style={{ fontSize:10 }}>Abonado · {usd(paid)}</span>
  }

  return (
    <div className="page">
      <div className="ph">
        <div><div className="pt"><span>Pedidos</span></div><div className="ps">{orders.length} pedidos · {orders.filter(o=>o.source==='web').length} desde la web</div></div>
        <button className="btn btn-gold" onClick={() => setModal('new')}>+ Nuevo pedido</button>
      </div>

      <div className="fb">
        {['todos','pendiente','confirmado','proceso','listo','entregado','cancelado','borrador'].map(s => (
          <button key={s} className={`fi ${filter===s?'active':''}`} onClick={() => setFilter(s)}>
            {s === 'todos' ? 'Todos' : s} {s !== 'todos' && <span style={{ opacity:.6, fontSize:11, marginLeft:4 }}>· {orders.filter(o => o.status === s).length}</span>}
          </button>
        ))}
      </div>

      <div className="tw">
        <table>
          <thead><tr><th>#</th><th>Cliente</th><th>Origen</th><th>Fecha</th><th>Tienda</th><th>Items</th><th>Total</th><th>Pago</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{String(o.id).padStart(3,'0')}</td>
                <td>{clientName(o.client_id)}</td>
                <td>{o.source === 'web' ? <span className="tag tg-b" style={{ fontSize:10 }}>🌐 web</span> : <span className="tag tg-gray" style={{ fontSize:10 }}>manual</span>}</td>
                <td>{fdate(o.date)}</td>
                <td><span className="tag tg-b" style={{ fontSize:10 }}>{storeLbl[o.store]||'Ambas'}</span></td>
                <td style={{ fontSize: 12 }}>{(o.items || []).map(i => `${i.name} x${i.qty}`).join(', ')}</td>
                <td style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, color: 'var(--gold)' }}>{usd(o.total)}</td>
                <td>{payBadge(o)}</td>
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
