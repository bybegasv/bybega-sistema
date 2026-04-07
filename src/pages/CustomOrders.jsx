import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'

const STATUSES = ['cotizacion','aprobado','en produccion','listo','entregado','cancelado']
const STATUS_CLS = { cotizacion:'tg-gray', aprobado:'tg-b', 'en produccion':'tg-purple', listo:'tg-g', entregado:'tg-g', cancelado:'tg-r' }

function CustomOrderModal({ order, clients, onSave, onClose }) {
  const [f, setF] = useState({
    client_id: order?.client_id || clients[0]?.id || '',
    title: order?.title || '',
    description: order?.description || '',
    material: order?.material || '',
    ring_size: order?.ring_size || '',
    engraving: order?.engraving || '',
    price: order?.price || '',
    advance: order?.advance || 0,
    due_date: order?.due_date || '',
    status: order?.status || 'cotizacion',
    notes: order?.notes || ''
  })
  const s = (k,v) => setF(p=>({...p,[k]:v}))
  const balance = (Number(f.price)||0)-(Number(f.advance)||0)
  const usd = n => '$'+Number(n||0).toFixed(2)

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box lg">
        <div className="modal-title">{order?'Editar':'Nuevo'} pedido personalizado</div>
        <div className="fr">
          <div className="fg"><label>Cliente *</label>
            <select value={f.client_id} onChange={e=>s('client_id',e.target.value)}>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name} {c.surname}</option>)}
            </select>
          </div>
          <div className="fg"><label>Título del pedido *</label>
            <input value={f.title} onChange={e=>s('title',e.target.value)} placeholder="Anillo de compromiso personalizado" />
          </div>
        </div>
        <div className="fg"><label>Descripción detallada</label>
          <textarea rows={3} value={f.description} onChange={e=>s('description',e.target.value)} placeholder="Descripción completa del diseño, estilo, referencias de fotos enviadas…" />
        </div>
        <div className="fr">
          <div className="fg"><label>Material</label><input value={f.material} onChange={e=>s('material',e.target.value)} placeholder="Oro 18k amarillo, Plata 925…" /></div>
          <div className="fg"><label>Talla / medida</label><input value={f.ring_size} onChange={e=>s('ring_size',e.target.value)} placeholder="Talla 7, largo 45cm…" /></div>
        </div>
        <div className="fg"><label>Grabado / texto personalizado</label>
          <input value={f.engraving} onChange={e=>s('engraving',e.target.value)} placeholder="Texto a grabar, fecha, iniciales…" />
        </div>
        <div className="fr3">
          <div className="fg"><label>Precio acordado (USD)</label><input type="number" step="0.01" value={f.price} onChange={e=>s('price',e.target.value)} /></div>
          <div className="fg"><label>Anticipo recibido</label><input type="number" step="0.01" value={f.advance} onChange={e=>s('advance',e.target.value)} /></div>
          <div className="fg"><label>Saldo pendiente</label>
            <input value={usd(balance)} readOnly style={{background:'#f9f7f4',color:balance>0?'var(--danger)':'var(--success)',fontWeight:500}} />
          </div>
        </div>
        <div className="fr">
          <div className="fg"><label>Fecha de entrega</label><input type="date" value={f.due_date} onChange={e=>s('due_date',e.target.value)} /></div>
          <div className="fg"><label>Estado</label>
            <select value={f.status} onChange={e=>s('status',e.target.value)}>
              {STATUSES.map(x=><option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>
        <div className="fg"><label>Notas internas</label><textarea rows={2} value={f.notes} onChange={e=>s('notes',e.target.value)} /></div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={()=>{if(!f.title||!f.client_id)return alert('Cliente y título requeridos');onSave(f);onClose()}}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

export default function CustomOrders() {
  const { clients, usd, fdate } = useData()
  const [orders, setOrders] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('todos')

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await supabase.from('custom_orders').select('*').order('created_at',{ascending:false})
    if (data) setOrders(data)
    setLoading(false)
  }

  const nextNumber = async () => {
    const { data } = await supabase.from('settings').select('value').eq('key','custom_counter').single()
    const n = parseInt(data?.value||1)
    await supabase.from('settings').update({value:String(n+1)}).eq('key','custom_counter')
    return `CUST-${new Date().getFullYear()}-${String(n).padStart(3,'0')}`
  }

  const save = async (data, id) => {
    if (id) await supabase.from('custom_orders').update(data).eq('id',id)
    else { const number = await nextNumber(); await supabase.from('custom_orders').insert({...data,number}) }
    await load()
  }

  const del = async id => {
    if (!confirm('¿Eliminar pedido?')) return
    await supabase.from('custom_orders').delete().eq('id',id)
    await load()
  }

  const clientName = id => { const c=clients.find(x=>x.id===id); return c?`${c.name} ${c.surname}`:'—' }
  const filtered = statusFilter==='todos'?orders:orders.filter(o=>o.status===statusFilter)
  const active = orders.filter(o=>!['entregado','cancelado'].includes(o.status))

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt">Pedidos <span>Personalizados</span></div>
          <div className="ps">{orders.length} pedidos · {active.length} activos</div>
        </div>
        <button className="btn btn-gold" onClick={()=>setModal('new')}>+ Nuevo pedido</button>
      </div>

      <div className="stats" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        <div className="sc"><div className="sc-label">En producción</div><div className="sc-value">{orders.filter(o=>o.status==='en produccion').length}</div></div>
        <div className="sc"><div className="sc-label">Listos p/ entregar</div><div className="sc-value">{orders.filter(o=>o.status==='listo').length}</div><div className="sc-badge bg-g">avisar</div></div>
        <div className="sc"><div className="sc-label">Por cobrar (saldo)</div><div className="sc-value">{usd(active.reduce((a,o)=>a+(Number(o.price)-Number(o.advance)),0))}</div></div>
        <div className="sc"><div className="sc-label">Total entregado</div><div className="sc-value">{usd(orders.filter(o=>o.status==='entregado').reduce((a,o)=>a+Number(o.price),0))}</div></div>
      </div>

      <div className="fb">
        <button className={`fi ${statusFilter==='todos'?'active':''}`} onClick={()=>setStatusFilter('todos')}>Todos</button>
        {STATUSES.map(s=><button key={s} className={`fi ${statusFilter===s?'active':''}`} onClick={()=>setStatusFilter(s)} style={{textTransform:'capitalize'}}>{s}</button>)}
      </div>

      {loading ? <div className="ps">Cargando…</div> : (
        <div className="tw">
          <table>
            <thead><tr><th>#</th><th>Cliente</th><th>Pedido</th><th>Material</th><th>Precio</th><th>Anticipo</th><th>Saldo</th><th>Entrega</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {filtered.length ? filtered.map(o=>{
                const bal = Number(o.price)-Number(o.advance)
                const overdue = o.due_date&&new Date(o.due_date)<new Date()&&!['entregado','cancelado'].includes(o.status)
                return (
                  <tr key={o.id} style={{background:overdue?'rgba(192,57,43,.04)':''}}>
                    <td style={{fontFamily:'monospace',fontSize:11}}>{o.number}</td>
                    <td style={{fontWeight:500}}>{clientName(o.client_id)}</td>
                    <td>
                      <div style={{fontWeight:500,fontSize:13}}>{o.title}</div>
                      {o.engraving&&<div style={{fontSize:11,color:'var(--muted)'}}>✦ "{o.engraving}"</div>}
                    </td>
                    <td style={{fontSize:12}}>{o.material||'—'}{o.ring_size&&<div style={{fontSize:11,color:'var(--muted)'}}>Talla: {o.ring_size}</div>}</td>
                    <td style={{fontFamily:'Cormorant Garamond,serif',fontSize:17,color:'var(--gold)'}}>{usd(o.price)}</td>
                    <td style={{fontSize:13}}>{usd(o.advance)}</td>
                    <td style={{color:bal>0?'var(--danger)':'var(--success)',fontWeight:500,fontSize:13}}>{usd(bal)}</td>
                    <td style={{color:overdue?'var(--danger)':'inherit',fontSize:12}}>{o.due_date?fdate(o.due_date):'—'}{overdue&&' ⚠'}</td>
                    <td><span className={`tag ${STATUS_CLS[o.status]||'tg-gray'}`}>{o.status}</span></td>
                    <td style={{display:'flex',gap:4,padding:'8px 14px'}}>
                      <button className="btn btn-outline btn-sm" onClick={()=>setModal(o)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>del(o.id)}>✕</button>
                    </td>
                  </tr>
                )
              }): <tr><td colSpan={10} style={{textAlign:'center',color:'var(--muted)',padding:28}}>Sin pedidos</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {modal&&<CustomOrderModal order={modal==='new'?null:modal} clients={clients} onSave={d=>save(d,modal?.id||null)} onClose={()=>setModal(null)} />}
    </div>
  )
}
