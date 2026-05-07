import { useState, useEffect, useRef, useMemo } from 'react'
import { useData } from '../context/DataContext'

const PAY_METHODS = [
  { value: 'cash',     label: 'Efectivo',      icon: '💵', color: '#2e7d52' },
  { value: 'transfer', label: 'Transferencia', icon: '🏦', color: '#1a5276' },
  { value: 'wompi',    label: 'Wompi',         icon: '💳', color: '#005FAA' },
  { value: 'n1co',     label: 'N1co',          icon: '📱', color: '#7c3aed' },
  { value: 'paypal',   label: 'PayPal',        icon: '🅿️', color: '#0070ba' },
  { value: 'card',     label: 'Otra',          icon: '🌐', color: '#666' },
]
const PAY_LBL = Object.fromEntries(PAY_METHODS.map(m => [m.value, m.label]))

function inSameDay(dateStr, day) {
  if (!dateStr) return false
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''))
  return d.toDateString() === day.toDateString()
}

export default function POS() {
  const { products, clients, orders, payments, settings, profile, quickSale, usd, fdate, clientName,
          currentShift, openShift, closeShift, shiftSummary } = useData()

  // Ticket actual
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [store, setStore] = useState('tienda1')
  const [reuseOrderId, setReuseOrderId] = useState(null) // si está cargado un pedido pendiente
  const [reuseClient, setReuseClient] = useState(null)
  const [notes, setNotes] = useState('')

  // Modales
  const [payModal, setPayModal] = useState(false)
  const [reservedModal, setReservedModal] = useState(false)
  const [clientModal, setClientModal] = useState(false)
  const [openShiftModal, setOpenShiftModal] = useState(false)
  const [closeShiftModal, setCloseShiftModal] = useState(false)
  const [selClientId, setSelClientId] = useState('')

  // Estado para abrir/cerrar turno
  const [openingCash, setOpeningCash] = useState('0.00')
  const [shiftNotes, setShiftNotes] = useState('')
  const [declaredCash, setDeclaredCash] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [shiftBusy, setShiftBusy] = useState(false)

  // Modal de cobro
  const [method, setMethod] = useState('cash')
  const [received, setReceived] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSale, setLastSale] = useState(null)

  const searchRef = useRef(null)

  // Foco al buscador al cargar
  useEffect(() => { searchRef.current?.focus() }, [])

  // Búsqueda inteligente
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return products
      .filter(p => p.status === 'disponible')
      .filter(p =>
        (p.ref || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [query, products])

  const total = items.reduce((a, i) => a + Number(i.price) * i.qty, 0)

  // Acciones del ticket
  const addProduct = (p) => {
    setItems(prev => {
      const existing = prev.find(x => x.product_id === p.id)
      if (existing) return prev.map(x => x.product_id === p.id ? { ...x, qty: x.qty + 1, sub: (x.qty + 1) * Number(p.price) } : x)
      return [...prev, { product_id: p.id, name: p.name, ref: p.ref, price: Number(p.price), qty: 1, sub: Number(p.price), emoji: p.emoji, image: p.images?.[0] || p.image_url }]
    })
    setQuery('')
    searchRef.current?.focus()
  }
  const setQty = (idx, q) => {
    const qty = Math.max(1, parseInt(q) || 1)
    setItems(prev => prev.map((x, i) => i === idx ? { ...x, qty, sub: qty * x.price } : x))
  }
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))
  const clearTicket = () => {
    setItems([])
    setReuseOrderId(null)
    setReuseClient(null)
    setNotes('')
    setSelClientId('')
    setQuery('')
    searchRef.current?.focus()
  }

  // Cargar pedido pendiente (reserva web)
  const pendingOrders = orders.filter(o => o.status === 'pendiente')
  const loadPendingOrder = (o) => {
    setItems((o.items || []).map(it => ({
      product_id: it.product_id,
      name: it.name,
      ref: products.find(p => p.id === it.product_id)?.ref || '',
      price: Number(it.price),
      qty: it.qty,
      sub: Number(it.price) * it.qty,
      emoji: products.find(p => p.id === it.product_id)?.emoji || '💍',
      image: products.find(p => p.id === it.product_id)?.images?.[0]
    })))
    setReuseOrderId(o.id)
    setReuseClient(o.client_id)
    setSelClientId(o.client_id || '')
    setStore(o.store || 'tienda1')
    setNotes(`Recogido en tienda · pedido #${String(o.id).padStart(3,'0')}`)
    setReservedModal(false)
  }

  // Top vendidos (los más usados en pedidos)
  const topProducts = useMemo(() => {
    const counts = {}
    orders.forEach(o => (o.items || []).forEach(it => {
      counts[it.product_id] = (counts[it.product_id] || 0) + Number(it.qty || 0)
    }))
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => products.find(p => p.id === id))
      .filter(Boolean)
  }, [orders, products])

  // Cierre del TURNO ACTIVO (si hay turno) o del DÍA si no hay
  const today = new Date()
  const summary = currentShift ? shiftSummary(currentShift.id) : null
  const dayPays = payments.filter(p => inSameDay(p.date, today))
  const sumDayMethod = (m) => dayPays.filter(p => p.method === m).reduce((a, p) => a + Number(p.amount || 0), 0)

  // Para mostrar en el cuadro lateral: si hay turno usa summary, si no, usa el día
  const sideTotal = summary ? summary.total : dayPays.reduce((a, p) => a + Number(p.amount || 0), 0)
  const sideCount = summary ? summary.count : dayPays.length
  const sideByMethod = (m) => summary ? summary[m] : sumDayMethod(m)

  // Abrir cobro
  const openPayment = () => {
    if (!currentShift) {
      alert('Debes abrir tu turno antes de cobrar.')
      setOpeningCash('0.00'); setShiftNotes(''); setOpenShiftModal(true)
      return
    }
    if (items.length === 0) return alert('Agrega al menos un producto al ticket')
    setMethod(settings.pay_cash_enabled === 'false' ? PAY_METHODS.find(m => settings[`pay_${m.value}_enabled`] === 'true')?.value || 'cash' : 'cash')
    setReceived(total.toFixed(2))
    setPayModal(true)
  }

  // Abrir turno
  const handleOpenShift = async () => {
    setShiftBusy(true)
    await openShift({ store, opening_cash: Number(openingCash) || 0, notes: shiftNotes })
    setShiftBusy(false)
    setOpenShiftModal(false)
  }
  // Cerrar turno
  const handleCloseShift = async () => {
    setShiftBusy(true)
    await closeShift({ declared_cash: declaredCash === '' ? null : Number(declaredCash), notes: closingNotes || undefined })
    setShiftBusy(false)
    setCloseShiftModal(false)
    setDeclaredCash(''); setClosingNotes('')
  }

  const expectedCash = currentShift && summary ? Number(currentShift.opening_cash || 0) + summary.cash : 0
  const cashDiff = declaredCash === '' ? null : Number(declaredCash) - expectedCash

  // Generar e imprimir ticket en formato térmico (80mm)
  const printTicket = (sale) => {
    const date = new Date().toLocaleString('es-SV', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
    const cashier = (window?.__cashierName) || (settings?.notif_email || '').split('@')[0] || 'Cajera'
    const storeLbl = store === 'tienda1' ? (settings.store1_name || 'Tienda 1') : (settings.store2_name || 'Tienda 2')
    const usdFmt = n => '$' + Number(n || 0).toFixed(2)
    const line = '='.repeat(34)
    const sep = '-'.repeat(34)
    const itemsRows = sale.items.map(i =>
      `<div>${i.name.slice(0, 22).padEnd(24)}x${i.qty}</div>` +
      `<div style="text-align:right">${(i.ref || '').padEnd(20)}${usdFmt(i.sub).padStart(10)}</div>`
    ).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket ${sale.invoiceNumber}</title>
<style>
@page { size: 80mm auto; margin: 0; }
* { box-sizing: border-box; }
body { font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.4; margin: 0; padding: 8mm 4mm; width: 80mm; color: #000; }
.center { text-align: center; }
.right { text-align: right; }
.bold { font-weight: bold; }
.lg { font-size: 14px; font-weight: bold; }
.row { display: flex; justify-content: space-between; }
hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
.line { font-family: monospace; letter-spacing: 0; }
@media print { body { padding: 4mm 3mm; } }
</style></head><body>
<div class="center bold lg">${(settings.company || 'BYBEGA').toUpperCase()}</div>
<div class="center" style="font-size:9px">${settings.slogan || 'Joyería artesanal'}</div>
<div class="center" style="font-size:9px">${settings.address || ''}</div>
<div class="center" style="font-size:9px">${settings.phone || ''} · ${settings.email || ''}</div>
<div class="line center">${line}</div>
<div class="bold">TICKET ${sale.invoiceNumber}</div>
<div>${date}</div>
<div>Cajera: ${cashier}</div>
<div>Tienda: ${storeLbl}</div>
<div class="line center">${sep}</div>
${sale.items.map(i => `
  <div class="row"><span>${(i.name || '').slice(0,22)}</span><span>x${i.qty}</span></div>
  <div class="row" style="font-size:10px;color:#444"><span>${i.ref || ''}</span><span class="right">${usdFmt(i.sub)}</span></div>
`).join('')}
<div class="line center">${sep}</div>
<div class="row bold lg"><span>TOTAL</span><span>${usdFmt(sale.total)}</span></div>
<div class="line center">${sep}</div>
<div class="row"><span>Pago:</span><span>${PAY_LBL[sale.method] || sale.method}</span></div>
${sale.method === 'cash' ? `
  <div class="row"><span>Recibido:</span><span>${usdFmt(Number(sale.received || sale.total))}</span></div>
  <div class="row"><span>Cambio:</span><span>${usdFmt(sale.change || 0)}</span></div>
` : ''}
<div class="line center">${line}</div>
<div class="center" style="margin-top:6px">¡Gracias por tu compra!</div>
${settings.instagram ? `<div class="center" style="font-size:9px">${settings.instagram}</div>` : ''}
<div class="center" style="font-size:9px;margin-top:2px">www.bybegasv.online</div>
<div style="height:30px"></div>
<script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}</script>
</body></html>`

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '-9999px'
    iframe.style.bottom = '-9999px'
    iframe.style.width = '80mm'
    iframe.style.height = '600px'
    iframe.style.border = '0'
    document.body.appendChild(iframe)
    iframe.contentDocument.open()
    iframe.contentDocument.write(html)
    iframe.contentDocument.close()
    setTimeout(() => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print() } catch {}
      setTimeout(() => { try { document.body.removeChild(iframe) } catch {} }, 1500)
    }, 200)
  }

  // Confirmar cobro
  const confirmPayment = async () => {
    setSaving(true)
    const ticketItems = items.map(i => ({ product_id: i.product_id, name: i.name, ref: i.ref, price: i.price, qty: i.qty, sub: i.sub }))
    const result = await quickSale({
      items: ticketItems,
      total,
      method,
      clientId: selClientId || reuseClient || null,
      store,
      reuseOrderId,
      notes
    })
    setSaving(false)
    if (result) {
      const change = method === 'cash' ? Math.max(0, Number(received || 0) - total) : 0
      const sale = { ...result, total, method, items: ticketItems, change, received }
      setLastSale(sale)
      setPayModal(false)
      // Auto-imprimir si está activado en settings
      if (settings.auto_print_ticket === 'true') {
        setTimeout(() => printTicket(sale), 300)
      }
      // Limpieza
      clearTicket()
    }
  }

  // Atajos de teclado + lector de código de barras
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (payModal || reservedModal || clientModal) {
          setPayModal(false); setReservedModal(false); setClientModal(false)
        } else if (items.length) {
          if (confirm('¿Limpiar ticket?')) clearTicket()
        }
      } else if (e.key === 'F2') {
        e.preventDefault()
        if (!payModal && items.length) openPayment()
      } else if (e.key === 'Enter' && document.activeElement === searchRef.current && query.trim()) {
        e.preventDefault()
        // Lector de código de barras o entrada manual:
        // 1) Match exacto por ref (lo que envía el escáner)
        const q = query.trim().toLowerCase()
        const exact = products.find(p => p.status === 'disponible' && (p.ref || '').toLowerCase() === q)
        if (exact) { addProduct(exact); return }
        // 2) Si solo hay un match parcial, agrégalo
        if (matches.length === 1) { addProduct(matches[0]); return }
        // 3) Múltiples matches → no hacer nada, el usuario elige
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items, matches, payModal, reservedModal, clientModal, query, products])

  const change = method === 'cash' ? Math.max(0, Number(received || 0) - total) : 0
  const cashShort = method === 'cash' && Number(received || 0) < total

  return (
    <div className="page" style={{ padding: 0 }}>
      {/* HEADER POS */}
      <div style={{ background:'var(--dark)', color:'var(--gold-l)', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:18 }}>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:24, color:'var(--gold)', letterSpacing:2 }}>CAJA</div>
          <select value={store} onChange={e => setStore(e.target.value)} disabled={!!currentShift}
            style={{ background:'var(--dark2)', border:'1px solid rgba(255,255,255,.1)', color:'#fff', padding:'7px 12px', borderRadius:6, fontSize:13, fontFamily:'inherit', outline:'none', opacity: currentShift ? .6 : 1 }}>
            <option value="tienda1">{settings.store1_name || 'Tienda 1'}</option>
            <option value="tienda2">{settings.store2_name || 'Tienda 2'}</option>
          </select>
        </div>

        {/* ESTADO TURNO */}
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          {currentShift ? (
            <>
              <div style={{ fontSize:12, color:'rgba(245,234,216,.85)', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:'#2ee072', boxShadow:'0 0 8px #2ee072' }}></span>
                <span><strong style={{ color:'var(--gold-l)' }}>{currentShift.user_name}</strong> · turno desde {new Date(currentShift.opened_at).toLocaleTimeString('es-SV',{hour:'2-digit',minute:'2-digit'})} · {summary?.count || 0} venta{(summary?.count||0)!==1?'s':''} · {usd(summary?.total || 0)}</span>
              </div>
              <button onClick={() => { setDeclaredCash(expectedCash.toFixed(2)); setCloseShiftModal(true) }}
                style={{ background:'rgba(192,57,43,.2)', border:'1px solid rgba(192,57,43,.4)', color:'#ff9b91', padding:'7px 14px', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                🔒 Cerrar turno
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize:12, color:'rgba(245,234,216,.6)', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:'#777' }}></span>
                <span>Sin turno abierto</span>
              </div>
              <button onClick={() => { setOpeningCash('0.00'); setShiftNotes(''); setOpenShiftModal(true) }}
                style={{ background:'var(--gold)', color:'var(--dark)', border:'none', padding:'7px 16px', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
                ▶ Abrir turno
              </button>
            </>
          )}
        </div>

        <div style={{ fontSize:11, color:'rgba(245,234,216,.4)' }}>
          <kbd style={kbdStyle}>Enter</kbd> agregar · <kbd style={kbdStyle}>F2</kbd> cobrar · <kbd style={kbdStyle}>Esc</kbd> limpiar
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:0, minHeight:'calc(100vh - 60px)' }}>

        {/* IZQ: BUSCADOR + TICKET */}
        <div style={{ padding:'24px 28px', background:'#fdfcfa', display:'flex', flexDirection:'column' }}>
          {/* Buscador */}
          <div style={{ position:'relative', marginBottom:18 }}>
            <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Código (ej. ANI-001) o nombre..."
              style={{ width:'100%', padding:'18px 22px', fontSize:18, fontFamily:'DM Sans,sans-serif', border:'2px solid var(--gold)', borderRadius:10, outline:'none', background:'#fff' }} />
            {matches.length > 0 && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:'#fff', border:'1px solid var(--border)', borderRadius:8, maxHeight:300, overflowY:'auto', zIndex:10, boxShadow:'0 12px 30px -10px rgba(0,0,0,.15)' }}>
                {matches.map(p => (
                  <div key={p.id} onClick={() => addProduct(p)}
                    style={{ padding:'12px 16px', display:'grid', gridTemplateColumns:'40px 1fr 90px 80px', gap:12, alignItems:'center', cursor:'pointer', borderBottom:'1px solid var(--border)' }}
                    onMouseOver={e => e.currentTarget.style.background='var(--gold-p)'}
                    onMouseOut={e => e.currentTarget.style.background='#fff'}>
                    <div style={{ width:40, height:40, borderRadius:6, overflow:'hidden', background:'var(--gold-p)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                      {p.images?.[0] ? <img src={p.images[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : p.emoji}
                    </div>
                    <div>
                      <div style={{ fontWeight:500, fontSize:14 }}>{p.name}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{p.ref || '—'}</div>
                    </div>
                    <div style={{ fontSize:11, color:p.stock_total > 0 ? 'var(--success)' : 'var(--danger)' }}>Stock: {p.stock_total ?? 0}</div>
                    <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18, color:'var(--gold)', textAlign:'right' }}>{usd(p.price)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reserva info bar */}
          {reuseOrderId && (
            <div style={{ background:'rgba(184,151,74,.1)', border:'1px solid var(--gold)', borderRadius:8, padding:'10px 16px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:13 }}>
                📦 <strong>Pedido reservado #{String(reuseOrderId).padStart(3,'0')}</strong>
                {reuseClient && <span style={{ color:'var(--muted)' }}> · {clientName(reuseClient)}</span>}
              </div>
              <button onClick={clearTicket} style={{ background:'transparent', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:12 }}>✕ descartar</button>
            </div>
          )}

          {/* Ticket */}
          <div style={{ flex:1, background:'#fff', border:'1px solid var(--border)', borderRadius:10, padding:items.length ? 4 : 24, overflowY:'auto', minHeight:240 }}>
            {items.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--muted)', padding:'40px 20px' }}>
                <div style={{ fontSize:48, marginBottom:8, opacity:.4 }}>🛒</div>
                <div style={{ fontSize:14 }}>El ticket está vacío</div>
                <div style={{ fontSize:12, marginTop:4 }}>Busca un producto arriba o usa el panel de la derecha</div>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f9f7f4' }}>
                    <th style={thStyle}></th>
                    <th style={thStyle}>Producto</th>
                    <th style={{ ...thStyle, textAlign:'center', width:90 }}>Cant.</th>
                    <th style={{ ...thStyle, textAlign:'right', width:100 }}>Precio</th>
                    <th style={{ ...thStyle, textAlign:'right', width:100 }}>Subtotal</th>
                    <th style={{ ...thStyle, width:32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'10px 8px 10px 14px', width:44 }}>
                        <div style={{ width:36, height:36, borderRadius:6, overflow:'hidden', background:'var(--gold-p)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                          {it.image ? <img src={it.image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : it.emoji}
                        </div>
                      </td>
                      <td style={{ padding:'10px 8px' }}>
                        <div style={{ fontWeight:500, fontSize:14 }}>{it.name}</div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>{it.ref}</div>
                      </td>
                      <td style={{ padding:'10px 8px', textAlign:'center' }}>
                        <input type="number" min="1" value={it.qty} onChange={e => setQty(idx, e.target.value)}
                          style={{ width:60, padding:'6px 8px', textAlign:'center', border:'1px solid var(--border)', borderRadius:6, fontSize:14 }} />
                      </td>
                      <td style={{ padding:'10px 8px', textAlign:'right', fontSize:13 }}>{usd(it.price)}</td>
                      <td style={{ padding:'10px 8px', textAlign:'right', fontFamily:'Cormorant Garamond,serif', fontSize:18, color:'var(--gold)' }}>{usd(it.sub)}</td>
                      <td style={{ padding:'10px 14px 10px 8px' }}>
                        <button onClick={() => removeItem(idx)} style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:14 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Total + Acciones */}
          <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'1fr auto', gap:14, alignItems:'center' }}>
            <div style={{ display:'flex', flexDirection:'column' }}>
              <div style={{ fontSize:12, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Total</div>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:42, color:'var(--gold)', lineHeight:1 }}>{usd(total)}</div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setClientModal(true)} className="btn btn-outline" style={{ padding:'14px 20px' }}>
                {selClientId ? '✓ ' + clientName(selClientId) : '+ Cliente'}
              </button>
              <button onClick={clearTicket} className="btn btn-ghost" style={{ padding:'14px 20px' }} disabled={items.length === 0}>Limpiar</button>
              <button onClick={openPayment} disabled={items.length === 0 || !currentShift}
                title={!currentShift ? 'Abre tu turno primero' : ''}
                style={{ padding:'18px 36px', background: currentShift ? 'var(--success)' : '#aaa', color:'#fff', border:'none', borderRadius:10, fontSize:16, fontWeight:600, cursor:(items.length && currentShift) ? 'pointer' : 'not-allowed', opacity:(items.length && currentShift) ? 1 : .5, boxShadow:(items.length && currentShift) ? '0 8px 24px -8px rgba(46,125,82,.5)' : 'none' }}>
                💵 COBRAR · F2
              </button>
            </div>
          </div>
        </div>

        {/* DER: PANEL LATERAL */}
        <div style={{ background:'#f7f3ee', borderLeft:'1px solid var(--border)', padding:'24px 22px', display:'flex', flexDirection:'column', gap:18, overflowY:'auto' }}>

          {/* Pedidos pendientes */}
          <div>
            <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 }}>📦 Reservas web</div>
            <button onClick={() => setReservedModal(true)} disabled={pendingOrders.length === 0}
              style={{ width:'100%', padding:'14px 16px', background:pendingOrders.length ? 'var(--white)' : '#eee', border:'1px solid var(--border)', borderRadius:8, cursor:pendingOrders.length ? 'pointer' : 'not-allowed', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center', opacity:pendingOrders.length ? 1 : .5 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500 }}>{pendingOrders.length} pedido{pendingOrders.length !== 1 ? 's' : ''} pendiente{pendingOrders.length !== 1 ? 's' : ''}</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{pendingOrders.length ? 'Cliente viene a recoger →' : 'Sin reservas pendientes'}</div>
              </div>
              <span style={{ fontSize:18, color:'var(--gold)' }}>→</span>
            </button>
          </div>

          {/* Top vendidos */}
          {topProducts.length > 0 && (
            <div>
              <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 }}>⭐ Más vendidos</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {topProducts.map(p => (
                  <button key={p.id} onClick={() => addProduct(p)}
                    style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:8, padding:8, cursor:'pointer', textAlign:'left', transition:'border-color .15s' }}
                    onMouseOver={e => e.currentTarget.style.borderColor='var(--gold)'}
                    onMouseOut={e => e.currentTarget.style.borderColor='var(--border)'}>
                    <div style={{ width:'100%', aspectRatio:'1', borderRadius:6, overflow:'hidden', background:'var(--gold-p)', marginBottom:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
                      {p.images?.[0] ? <img src={p.images[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : p.emoji}
                    </div>
                    <div style={{ fontSize:11, fontWeight:500, lineHeight:1.3 }}>{p.name}</div>
                    <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:14, color:'var(--gold)', marginTop:2 }}>{usd(p.price)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cierre del turno (o del día si no hay turno) */}
          <div style={{ marginTop:'auto', background:'var(--dark)', color:'var(--gold-l)', padding:'18px 18px', borderRadius:10 }}>
            <div style={{ fontSize:11, color:'rgba(245,234,216,.5)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:10 }}>
              📊 {currentShift ? 'Cierre del turno' : 'Resumen del día'} · {today.toLocaleDateString('es-SV', { day:'2-digit', month:'short' })}
            </div>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:32, color:'var(--gold)', marginBottom:4, lineHeight:1 }}>{usd(sideTotal)}</div>
            <div style={{ fontSize:11, color:'rgba(245,234,216,.5)', marginBottom:14 }}>
              {sideCount} venta{sideCount !== 1 ? 's' : ''}
              {currentShift && <> · desde {new Date(currentShift.opened_at).toLocaleTimeString('es-SV',{hour:'2-digit',minute:'2-digit'})}</>}
            </div>
            <div style={{ display:'grid', gap:6, fontSize:12 }}>
              {PAY_METHODS.map(pm => {
                const v = sideByMethod(pm.value)
                if (!v) return null
                return (
                  <div key={pm.value} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderTop:'1px solid rgba(255,255,255,.05)' }}>
                    <span style={{ color:'rgba(245,234,216,.7)' }}>{pm.icon} {pm.label}</span>
                    <span style={{ color:'#fff', fontFamily:'Cormorant Garamond,serif', fontSize:14 }}>{usd(v)}</span>
                  </div>
                )
              })}
            </div>
            {currentShift && (
              <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid rgba(255,255,255,.1)', fontSize:11, color:'rgba(245,234,216,.5)' }}>
                Caja inicial: <strong style={{ color:'var(--gold-l)' }}>{usd(currentShift.opening_cash || 0)}</strong>
                {summary && <><br />Esperado en caja: <strong style={{ color:'#fff' }}>{usd(expectedCash)}</strong></>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────── MODAL: RESERVAS PENDIENTES ─────── */}
      {reservedModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReservedModal(false)}>
          <div className="modal-box lg">
            <div className="modal-title">Pedidos reservados pendientes de pago</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginBottom:16 }}>Selecciona el pedido del cliente que vino a recoger:</div>
            {pendingOrders.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'var(--muted)' }}>No hay pedidos pendientes.</div>
            ) : (
              <div style={{ display:'grid', gap:8, maxHeight:'60vh', overflowY:'auto' }}>
                {pendingOrders.map(o => (
                  <button key={o.id} onClick={() => loadPendingOrder(o)}
                    style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:8, padding:'14px 16px', cursor:'pointer', textAlign:'left', display:'grid', gridTemplateColumns:'1fr auto', gap:10, alignItems:'center' }}
                    onMouseOver={e => e.currentTarget.style.borderColor='var(--gold)'}
                    onMouseOut={e => e.currentTarget.style.borderColor='var(--border)'}>
                    <div>
                      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontFamily:'monospace', fontSize:12, color:'var(--muted)' }}>#{String(o.id).padStart(3,'0')}</span>
                        <strong style={{ fontSize:14 }}>{clientName(o.client_id)}</strong>
                        {o.source === 'web' && <span className="tag tg-b" style={{ fontSize:10 }}>🌐 web</span>}
                      </div>
                      <div style={{ fontSize:12, color:'var(--muted)' }}>{(o.items || []).map(i => `${i.name} x${i.qty}`).join(', ')}</div>
                      <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{fdate(o.date)} · {o.payment_method ? PAY_LBL[o.payment_method] : 'sin método'}</div>
                    </div>
                    <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22, color:'var(--gold)' }}>{usd(o.total)}</div>
                  </button>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setReservedModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─────── MODAL: SELECCIONAR CLIENTE ─────── */}
      {clientModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setClientModal(false)}>
          <div className="modal-box">
            <div className="modal-title">Asignar cliente</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>Opcional. Si no eliges, queda como "Mostrador".</div>
            <div className="fg">
              <select value={selClientId} onChange={e => setSelClientId(e.target.value)}>
                <option value="">— Mostrador (sin cliente) —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.surname}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { setSelClientId(''); setClientModal(false) }}>Quitar</button>
              <button className="btn btn-gold" onClick={() => setClientModal(false)}>Aceptar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─────── MODAL: COBRO ─────── */}
      {payModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !saving && setPayModal(false)}>
          <div className="modal-box" style={{ width:520 }}>
            <div className="modal-title">Cobrar venta</div>

            <div style={{ background:'rgba(184,151,74,.08)', border:'1px solid var(--border)', borderRadius:8, padding:'16px 20px', marginBottom:18, textAlign:'center' }}>
              <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Total a cobrar</div>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:42, color:'var(--gold)', lineHeight:1.1 }}>{usd(total)}</div>
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{items.length} producto{items.length !== 1 ? 's' : ''} · {selClientId ? clientName(selClientId) : (reuseClient ? clientName(reuseClient) : 'Mostrador')}</div>
            </div>

            <div className="fg">
              <label>Método de pago</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {PAY_METHODS.map(pm => {
                  const enabled = settings[`pay_${pm.value}_enabled`] !== 'false'
                  if (!enabled && pm.value !== 'cash') return null
                  return (
                    <button key={pm.value} onClick={() => setMethod(pm.value)}
                      style={{ padding:'12px 8px', border:`2px solid ${method === pm.value ? pm.color : 'var(--border)'}`, borderRadius:8, background: method === pm.value ? `${pm.color}10` : '#fff', cursor:'pointer', textAlign:'center' }}>
                      <div style={{ fontSize:22 }}>{pm.icon}</div>
                      <div style={{ fontSize:11, fontWeight:500, marginTop:4 }}>{pm.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {method === 'cash' && (
              <div className="fr">
                <div className="fg"><label>Recibido</label>
                  <input type="number" step="0.01" value={received} onChange={e => setReceived(e.target.value)} autoFocus
                    style={{ fontSize:18, fontFamily:'Cormorant Garamond,serif' }} />
                </div>
                <div className="fg"><label>Cambio</label>
                  <div style={{ padding:'9px 13px', border:'1px solid var(--border)', borderRadius:8, fontFamily:'Cormorant Garamond,serif', fontSize:18, color: cashShort ? 'var(--danger)' : 'var(--success)', background:'#f9f7f4' }}>
                    {cashShort ? `Faltan ${usd(total - Number(received || 0))}` : usd(change)}
                  </div>
                </div>
              </div>
            )}

            {method !== 'cash' && (
              <div className="fg"><label>Referencia (opcional)</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Núm. de transacción, terminal, etc." />
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setPayModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn" onClick={confirmPayment} disabled={saving || cashShort}
                style={{ background:'var(--success)', color:'#fff', padding:'12px 28px', fontSize:15, fontWeight:600, opacity: (saving || cashShort) ? .6 : 1 }}>
                {saving ? 'Procesando…' : `✓ Confirmar ${usd(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────── MODAL: ABRIR TURNO ─────── */}
      {openShiftModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !shiftBusy && setOpenShiftModal(false)}>
          <div className="modal-box" style={{ width:480 }}>
            <div className="modal-title">▶ Abrir turno</div>
            <div style={{ background:'rgba(184,151,74,.08)', borderRadius:8, padding:'12px 16px', marginBottom:18, fontSize:13, color:'var(--mid)' }}>
              <strong style={{ color:'var(--dark)' }}>{profile?.name || 'Cajera'}</strong> · {store === 'tienda1' ? (settings.store1_name || 'Tienda 1') : (settings.store2_name || 'Tienda 2')}<br />
              <span style={{ fontSize:12, color:'var(--muted)' }}>{new Date().toLocaleString('es-SV', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
            </div>
            <div className="fg">
              <label>Efectivo inicial en caja</label>
              <input type="number" step="0.01" min="0" value={openingCash} onChange={e => setOpeningCash(e.target.value)} autoFocus
                style={{ fontSize:18, fontFamily:'Cormorant Garamond,serif' }} />
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Cuántos dólares físicos hay en la caja al abrir.</div>
            </div>
            <div className="fg">
              <label>Notas (opcional)</label>
              <input value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} placeholder="Cambio recibido del cierre anterior, etc." />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setOpenShiftModal(false)} disabled={shiftBusy}>Cancelar</button>
              <button className="btn btn-gold" onClick={handleOpenShift} disabled={shiftBusy}>
                {shiftBusy ? 'Abriendo…' : '▶ Abrir turno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────── MODAL: CERRAR TURNO ─────── */}
      {closeShiftModal && currentShift && summary && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !shiftBusy && setCloseShiftModal(false)}>
          <div className="modal-box" style={{ width:560 }}>
            <div className="modal-title">🔒 Cerrar turno</div>

            <div style={{ background:'#f9f7f4', borderRadius:8, padding:'14px 18px', marginBottom:16, fontSize:13 }}>
              <strong>{currentShift.user_name}</strong> · {store === 'tienda1' ? (settings.store1_name || 'Tienda 1') : (settings.store2_name || 'Tienda 2')}<br />
              <span style={{ fontSize:11, color:'var(--muted)' }}>
                Abierto: {new Date(currentShift.opened_at).toLocaleString('es-SV', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}<br />
                Cerrando: {new Date().toLocaleString('es-SV', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
              </span>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
              <div style={{ background:'rgba(184,151,74,.08)', padding:14, borderRadius:8 }}>
                <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Total ventas</div>
                <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28, color:'var(--gold)' }}>{usd(summary.total)}</div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>{summary.count} venta{summary.count !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ background:'#f9f7f4', padding:14, borderRadius:8 }}>
                <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Esperado en caja</div>
                <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28 }}>{usd(expectedCash)}</div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>Inicial {usd(currentShift.opening_cash || 0)} + ventas cash</div>
              </div>
            </div>

            <div style={{ marginBottom:14, fontSize:12 }}>
              <div style={{ display:'grid', gap:4 }}>
                {PAY_METHODS.map(pm => summary[pm.value] ? (
                  <div key={pm.value} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px dashed rgba(0,0,0,.06)' }}>
                    <span>{pm.icon} {pm.label}</span>
                    <strong>{usd(summary[pm.value])}</strong>
                  </div>
                ) : null)}
              </div>
            </div>

            <div className="fg">
              <label>Efectivo contado físicamente</label>
              <input type="number" step="0.01" value={declaredCash} onChange={e => setDeclaredCash(e.target.value)}
                placeholder={expectedCash.toFixed(2)} autoFocus
                style={{ fontSize:18, fontFamily:'Cormorant Garamond,serif' }} />
              {cashDiff !== null && (
                <div style={{ fontSize:13, marginTop:6, color: cashDiff === 0 ? 'var(--success)' : (cashDiff < 0 ? 'var(--danger)' : 'var(--info)') }}>
                  {cashDiff === 0 ? '✓ Cuadra perfecto' : cashDiff < 0 ? `⚠ Faltan ${usd(Math.abs(cashDiff))}` : `↑ Sobran ${usd(cashDiff)}`}
                </div>
              )}
            </div>

            <div className="fg">
              <label>Observaciones (opcional)</label>
              <textarea rows={2} value={closingNotes} onChange={e => setClosingNotes(e.target.value)} placeholder="Diferencia justificada, incidencias, etc." />
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setCloseShiftModal(false)} disabled={shiftBusy}>Cancelar</button>
              <button className="btn" onClick={handleCloseShift} disabled={shiftBusy}
                style={{ background:'var(--danger)', color:'#fff', padding:'12px 24px', fontWeight:600 }}>
                {shiftBusy ? 'Cerrando…' : '🔒 Cerrar turno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────── TOAST DE ÚLTIMA VENTA ─────── */}
      {lastSale && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'var(--success)', color:'#fff', padding:'14px 22px', borderRadius:10, boxShadow:'0 12px 40px -10px rgba(46,125,82,.6)', zIndex:300, animation:'toastIn .3s ease', display:'flex', alignItems:'center', gap:18 }}>
          <div onClick={() => setLastSale(null)} style={{ cursor:'pointer' }}>
            <div style={{ fontSize:14, fontWeight:500 }}>✓ Venta {lastSale.invoiceNumber} · {usd(lastSale.total)}</div>
            {lastSale.method === 'cash' && lastSale.change > 0 && (
              <div style={{ fontSize:12, marginTop:2, opacity:.85 }}>Devuelve {usd(lastSale.change)} de cambio</div>
            )}
          </div>
          <button onClick={() => printTicket(lastSale)} style={{ background:'rgba(255,255,255,.2)', border:'1px solid rgba(255,255,255,.3)', color:'#fff', padding:'8px 16px', borderRadius:6, fontSize:12, cursor:'pointer', fontWeight:500, fontFamily:'inherit' }}>
            🖨️ Imprimir ticket
          </button>
          <button onClick={() => setLastSale(null)} style={{ background:'transparent', border:'none', color:'rgba(255,255,255,.7)', cursor:'pointer', fontSize:18, padding:'0 4px' }}>✕</button>
        </div>
      )}
    </div>
  )
}

const thStyle = {
  padding: '10px 8px',
  textAlign: 'left',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '.8px',
  color: 'var(--muted)',
  fontWeight: 500,
  borderBottom: '1px solid var(--border)'
}

const kbdStyle = {
  background: 'rgba(255,255,255,.1)',
  border: '1px solid rgba(255,255,255,.15)',
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 10,
  fontFamily: 'monospace',
  color: '#fff'
}
