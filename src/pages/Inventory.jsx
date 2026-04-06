import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'

function PurchaseModal({ products, onSave, onClose }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [supplier, setSupplier] = useState('')
  const [store, setStore] = useState('ambas')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ product_id:'', product_name:'', qty:1, unit_cost:0 }])

  const addItem = () => setItems(p => [...p, { product_id:'', product_name:'', qty:1, unit_cost:0 }])
  const removeItem = idx => setItems(p => p.length > 1 ? p.filter((_,i) => i !== idx) : p)
  const setItem = (idx, k, v) => setItems(p => p.map((it,i) => i===idx ? {...it, [k]:v} : it))
  const setProduct = (idx, pid) => {
    const p = products.find(x => x.id === pid)
    setItem(idx, 'product_id', pid)
    setItem(idx, 'product_name', p?.name || '')
    setItem(idx, 'unit_cost', p?.price || 0)
  }

  const total = items.reduce((a,i) => a + (i.qty * i.unit_cost), 0)
  const usd = n => '$' + Number(n||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box lg">
        <div className="modal-title">Nueva entrada de inventario</div>
        <div className="fr">
          <div className="fg"><label>Fecha</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="fg"><label>Proveedor</label><input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Nombre del proveedor" /></div>
        </div>
        <div className="fr">
          <div className="fg"><label>Destino</label>
            <select value={store} onChange={e => setStore(e.target.value)}>
              <option value="ambas">Ambas tiendas</option>
              <option value="tienda1">Tienda 1</option>
              <option value="tienda2">Tienda 2</option>
            </select>
          </div>
          <div className="fg"><label>Notas</label><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Factura, observaciones..." /></div>
        </div>

        <div className="fg">
          <label>Productos recibidos</label>
          {items.map((it, idx) => (
            <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr 70px 90px 28px', gap:8, marginBottom:8, alignItems:'center' }}>
              <select value={it.product_id} onChange={e => setProduct(idx, e.target.value)} style={{ padding:'7px 10px', border:'1px solid rgba(0,0,0,.14)', borderRadius:6, fontSize:12, fontFamily:'DM Sans,sans-serif', outline:'none' }}>
                <option value="">— Producto —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" min="1" value={it.qty} onChange={e => setItem(idx,'qty',parseInt(e.target.value)||1)} placeholder="Cant." style={{ padding:'7px 10px', border:'1px solid rgba(0,0,0,.14)', borderRadius:6, fontSize:12, outline:'none' }} />
              <input type="number" step="0.01" value={it.unit_cost} onChange={e => setItem(idx,'unit_cost',parseFloat(e.target.value)||0)} placeholder="Costo" style={{ padding:'7px 10px', border:'1px solid rgba(0,0,0,.14)', borderRadius:6, fontSize:12, outline:'none' }} />
              <button onClick={() => removeItem(idx)} style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:16, padding:0 }}>✕</button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addItem} style={{ marginTop:4 }}>+ Agregar producto</button>
        </div>

        <div style={{ background:'#f9f7f4', borderRadius:8, padding:'10px 14px', textAlign:'right', fontSize:13, marginTop:4 }}>
          Total de compra: <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, color:'var(--gold)' }}>{usd(total)}</span>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={() => onSave({ date, supplier, store, notes, total, items })}>Registrar entrada</button>
        </div>
      </div>
    </div>
  )
}

export default function Inventory() {
  const { products, usd, fdate } = useData()
  const [purchases, setPurchases] = useState([])
  const [modal, setModal] = useState(false)
  const [tab, setTab] = useState('stock')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPurchases() }, [])

  const loadPurchases = async () => {
    const { data } = await supabase.from('purchases').select('*, purchase_items(*)').order('created_at', { ascending: false })
    if (data) setPurchases(data)
    setLoading(false)
  }

  const savePurchase = async ({ date, supplier, store, notes, total, items }) => {
    const validItems = items.filter(i => i.product_id && i.qty > 0)
    if (!validItems.length) return alert('Agrega al menos un producto')
    const { data: purchase } = await supabase.from('purchases').insert({ date, supplier, store, notes, total }).select('id').single()
    if (purchase) {
      await supabase.from('purchase_items').insert(
        validItems.map(i => ({ purchase_id: purchase.id, product_id: i.product_id, product_name: i.product_name, qty: i.qty, unit_cost: i.unit_cost, store }))
      )
    }
    await loadPurchases()
    setModal(false)
  }

  const lowStockProducts = products.filter(p => p.stock_total >= 0 && p.stock_total <= (p.low_stock_alert || 3))
  const outOfStock = products.filter(p => p.stock_total === 0)
  const storeLbl = { ambas:'Ambas', tienda1:'Tienda 1', tienda2:'Tienda 2' }

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt"><span>Inventario</span></div>
          <div className="ps">Control de stock por tienda · entradas y alertas</div>
        </div>
        <button className="btn btn-gold" onClick={() => setModal(true)}>+ Registrar entrada</button>
      </div>

      <div className="stats" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
        <div className="sc"><div className="sc-label">Total productos</div><div className="sc-value">{products.length}</div></div>
        <div className="sc"><div className="sc-label">Disponibles</div><div className="sc-value">{products.filter(p=>p.status==='disponible').length}</div><div className="sc-badge bg-g">en stock</div></div>
        <div className="sc"><div className="sc-label">Stock bajo</div><div className="sc-value" style={{ color:'var(--danger)' }}>{lowStockProducts.length}</div><div className="sc-badge bg-r">alerta</div></div>
        <div className="sc"><div className="sc-label">Agotados</div><div className="sc-value" style={{ color:'var(--danger)' }}>{outOfStock.length}</div><div className="sc-badge bg-r">sin stock</div></div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab==='stock'?'active':''}`} onClick={() => setTab('stock')}>Stock actual</button>
        <button className={`tab-btn ${tab==='alerts'?'active':''}`} onClick={() => setTab('alerts')}>
          Alertas {lowStockProducts.length > 0 && <span className="tag tg-r" style={{ fontSize:10, marginLeft:4 }}>{lowStockProducts.length}</span>}
        </button>
        <button className={`tab-btn ${tab==='purchases'?'active':''}`} onClick={() => setTab('purchases')}>Entradas ({purchases.length})</button>
      </div>

      {tab === 'stock' && (
        <div className="tw">
          <table>
            <thead><tr><th>Producto</th><th>Categoría</th><th>Tienda</th><th>Stock total</th><th>Tienda 1</th><th>Tienda 2</th><th>Estado stock</th></tr></thead>
            <tbody>
              {products.map(p => {
                const isLow = p.stock_total >= 0 && p.stock_total <= (p.low_stock_alert || 3)
                const isEmpty = p.stock_total === 0
                return (
                  <tr key={p.id}>
                    <td><div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:32, height:32, borderRadius:6, overflow:'hidden', flexShrink:0, background:'var(--gold-p)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                        {p.images?.[0] ? <img src={p.images[0]} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : p.emoji}
                      </div>
                      <div><div style={{ fontWeight:500, fontSize:13 }}>{p.name}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{p.ref}</div></div>
                    </div></td>
                    <td><span className="tag tg-b">{p.cat_name || '—'}</span></td>
                    <td><span className="tag tg-gray">{storeLbl[p.store]||'Ambas'}</span></td>
                    <td style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, fontWeight:400 }}>{p.stock_total}</td>
                    <td>{p.stock_t1}</td>
                    <td>{p.stock_t2}</td>
                    <td>{isEmpty ? <span className="tag tg-r">Agotado</span> : isLow ? <span className="tag tg" style={{ background:'rgba(192,57,43,.1)', color:'var(--danger)' }}>⚠ Stock bajo</span> : <span className="tag tg-g">OK</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'alerts' && (
        <div>
          {lowStockProducts.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--muted)' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>✓</div>
              <div>Todos los productos tienen stock suficiente</div>
            </div>
          ) : (
            <div className="tw">
              <table>
                <thead><tr><th>Producto</th><th>Tienda</th><th>Stock actual</th><th>Alerta en</th><th>T1</th><th>T2</th><th>Precio</th></tr></thead>
                <tbody>
                  {lowStockProducts.map(p => (
                    <tr key={p.id} style={{ background: p.stock_total === 0 ? 'rgba(192,57,43,.04)' : 'rgba(184,151,74,.04)' }}>
                      <td><strong>{p.name}</strong><br /><span style={{ fontSize:11, color:'var(--muted)' }}>{p.ref}</span></td>
                      <td><span className="tag tg-gray">{storeLbl[p.store]||'Ambas'}</span></td>
                      <td><span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, color: p.stock_total===0?'var(--danger)':'var(--gold)' }}>{p.stock_total}</span></td>
                      <td style={{ fontSize:12, color:'var(--muted)' }}>{p.low_stock_alert||3} unidades</td>
                      <td>{p.stock_t1}</td>
                      <td>{p.stock_t2}</td>
                      <td style={{ fontFamily:'Cormorant Garamond,serif', fontSize:16, color:'var(--gold)' }}>{usd(p.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'purchases' && (
        <div>
          {loading ? <div style={{ padding:20, color:'var(--muted)' }}>Cargando…</div> : (
            <div className="tw">
              <table>
                <thead><tr><th>Fecha</th><th>Proveedor</th><th>Destino</th><th>Productos</th><th>Total</th><th>Notas</th></tr></thead>
                <tbody>
                  {purchases.length ? purchases.map(p => (
                    <tr key={p.id}>
                      <td>{fdate(p.date)}</td>
                      <td>{p.supplier || '—'}</td>
                      <td><span className="tag tg-b">{storeLbl[p.store]||'Ambas'}</span></td>
                      <td style={{ fontSize:12 }}>{(p.purchase_items||[]).map(i => `${i.product_name} x${i.qty}`).join(', ')}</td>
                      <td style={{ fontFamily:'Cormorant Garamond,serif', fontSize:17, color:'var(--gold)' }}>{usd(p.total)}</td>
                      <td style={{ fontSize:12, color:'var(--muted)' }}>{p.notes||'—'}</td>
                    </tr>
                  )) : <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--muted)', padding:28 }}>Sin entradas registradas</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal && <PurchaseModal products={products} onSave={savePurchase} onClose={() => setModal(false)} />}
    </div>
  )
}
