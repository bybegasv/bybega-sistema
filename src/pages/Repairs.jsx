import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'

const STATUSES = ['recibido','diagnóstico','en proceso','listo','entregado','cancelado']
const STATUS_CLS = { recibido:'tg-b', 'diagnóstico':'tg', 'en proceso':'tg-purple', listo:'tg-g', entregado:'tg-g', cancelado:'tg-gray' }

function RepairModal({ repair, clients, settings, onSave, onClose }) {
  const [f, setF] = useState({
    client_id: repair?.client_id || clients[0]?.id || '',
    store: repair?.store || 'tienda1',
    received_date: repair?.received_date || new Date().toISOString().slice(0,10),
    delivery_date: repair?.delivery_date || '',
    item_desc: repair?.item_desc || '',
    diagnosis: repair?.diagnosis || '',
    work_done: repair?.work_done || '',
    materials: repair?.materials || '',
    cost: repair?.cost || '',
    advance: repair?.advance || 0,
    status: repair?.status || 'recibido',
    notes: repair?.notes || ''
  })
  const s = (k,v) => setF(p=>({...p,[k]:v}))
  const balance = (Number(f.cost)||0) - (Number(f.advance)||0)
  const usd = n => '$'+Number(n||0).toFixed(2)

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box lg">
        <div className="modal-title">{repair?'Editar':'Nueva'} orden de reparación</div>
        <div className="fr">
          <div className="fg"><label>Cliente</label>
            <select value={f.client_id} onChange={e=>s('client_id',e.target.value)}>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name} {c.surname}</option>)}
            </select>
          </div>
          <div className="fg"><label>Tienda</label>
            <select value={f.store} onChange={e=>s('store',e.target.value)}>
              <option value="tienda1">{settings?.store1_name||'Tienda 1'}</option>
              <option value="tienda2">{settings?.store2_name||'Tienda 2'}</option>
            </select>
          </div>
        </div>
        <div className="fg"><label>Descripción del artículo *</label>
          <input value={f.item_desc} onChange={e=>s('item_desc',e.target.value)} placeholder="Anillo de oro con piedra roja, cadena de plata 925…" />
        </div>
        <div className="fg"><label>Diagnóstico / problema</label>
          <textarea rows={2} value={f.diagnosis} onChange={e=>s('diagnosis',e.target.value)} placeholder="Eslabón roto, piedra suelta, necesita limpieza…" />
        </div>
        <div className="fg"><label>Trabajo realizado</label>
          <textarea rows={2} value={f.work_done} onChange={e=>s('work_done',e.target.value)} placeholder="Se soldó el eslabón, se ajustó la piedra…" />
        </div>
        <div className="fg"><label>Materiales usados</label>
          <input value={f.materials} onChange={e=>s('materials',e.target.value)} placeholder="Hilo de soldadura de oro, pega epóxica…" />
        </div>
        <div className="fr">
          <div className="fg"><label>Fecha de recepción</label><input type="date" value={f.received_date} onChange={e=>s('received_date',e.target.value)} /></div>
          <div className="fg"><label>Fecha de entrega estimada</label><input type="date" value={f.delivery_date} onChange={e=>s('delivery_date',e.target.value)} /></div>
        </div>
        <div className="fr3">
          <div className="fg"><label>Costo total (USD)</label><input type="number" step="0.01" value={f.cost} onChange={e=>s('cost',e.target.value)} placeholder="0.00" /></div>
          <div className="fg"><label>Anticipo recibido</label><input type="number" step="0.01" value={f.advance} onChange={e=>s('advance',e.target.value)} placeholder="0.00" /></div>
          <div className="fg"><label>Saldo pendiente</label>
            <input value={usd(balance)} readOnly style={{background:'#f9f7f4',color:balance>0?'var(--danger)':'var(--success)',fontWeight:500}} />
          </div>
        </div>
        <div className="fr">
          <div className="fg"><label>Estado</label>
            <select value={f.status} onChange={e=>s('status',e.target.value)}>
              {STATUSES.map(x=><option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>
        <div className="fg"><label>Notas internas</label><textarea rows={2} value={f.notes} onChange={e=>s('notes',e.target.value)} /></div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={()=>{if(!f.item_desc)return alert('Descripción requerida');onSave(f);onClose()}}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

export default function Repairs() {
  const { clients, settings, usd, fdate } = useData()
  const [repairs, setRepairs] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('todos')

  useEffect(() => { loadRepairs() }, [])

  const loadRepairs = async () => {
    const { data } = await supabase.from('repairs').select('*').order('created_at', { ascending: false })
    if (data) setRepairs(data)
    setLoading(false)
  }

  const nextNumber = async () => {
    const { data } = await supabase.from('settings').select('value').eq('key','repair_counter').single()
    const n = parseInt(data?.value||1)
    await supabase.from('settings').update({value:String(n+1)}).eq('key','repair_counter')
    return `REP-${new Date().getFullYear()}-${String(n).padStart(3,'0')}`
  }

  const save = async (data, id) => {
    if (id) {
      await supabase.from('repairs').update(data).eq('id', id)
    } else {
      const number = await nextNumber()
      await supabase.from('repairs').insert({ ...data, number })
    }
    await loadRepairs()
  }

  const del = async (id) => {
    if (!confirm('¿Eliminar orden?')) return
    await supabase.from('repairs').delete().eq('id', id)
    await loadRepairs()
  }

  const clientName = id => { const c=clients.find(x=>x.id===id); return c?`${c.name} ${c.surname}`:'—' }

  const filtered = statusFilter==='todos' ? repairs : repairs.filter(r=>r.status===statusFilter)
  const pending = repairs.filter(r=>!['entregado','cancelado'].includes(r.status))
  const totalPending = pending.reduce((a,r)=>a+(Number(r.cost)-Number(r.advance)),0)

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt"><span>Reparaciones</span></div>
          <div className="ps">{repairs.length} órdenes · {pending.length} en proceso</div>
        </div>
        <button className="btn btn-gold" onClick={()=>setModal('new')}>+ Nueva orden</button>
      </div>

      <div className="stats" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        <div className="sc"><div className="sc-label">En proceso</div><div className="sc-value">{pending.length}</div></div>
        <div className="sc"><div className="sc-label">Listas p/ entregar</div><div className="sc-value">{repairs.filter(r=>r.status==='listo').length}</div><div className="sc-badge bg-g">avisar cliente</div></div>
        <div className="sc"><div className="sc-label">Por cobrar</div><div className="sc-value" style={{color:'var(--danger)'}}>{usd(totalPending)}</div><div className="sc-badge bg-r">saldo</div></div>
        <div className="sc"><div className="sc-label">Total facturado</div><div className="sc-value">{usd(repairs.filter(r=>r.status==='entregado').reduce((a,r)=>a+Number(r.cost),0))}</div></div>
      </div>

      <div className="fb">
        <button className={`fi ${statusFilter==='todos'?'active':''}`} onClick={()=>setStatusFilter('todos')}>Todos</button>
        {STATUSES.map(s=>(
          <button key={s} className={`fi ${statusFilter===s?'active':''}`} onClick={()=>setStatusFilter(s)}
            style={{textTransform:'capitalize'}}>{s}</button>
        ))}
      </div>

      {loading ? <div className="ps">Cargando…</div> : (
        <div className="tw">
          <table>
            <thead><tr><th>#Orden</th><th>Cliente</th><th>Artículo</th><th>Recibido</th><th>Entrega</th><th>Costo</th><th>Saldo</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {filtered.length ? filtered.map(r => {
                const bal = Number(r.cost) - Number(r.advance)
                const overdue = r.delivery_date && new Date(r.delivery_date) < new Date() && !['entregado','cancelado'].includes(r.status)
                return (
                  <tr key={r.id} style={{background:overdue?'rgba(192,57,43,.04)':''}}>
                    <td style={{fontFamily:'monospace',fontSize:12}}>{r.number}</td>
                    <td>{clientName(r.client_id)}</td>
                    <td><div style={{fontWeight:500,fontSize:13}}>{r.item_desc}</div>
                      {r.diagnosis&&<div style={{fontSize:11,color:'var(--muted)'}}>{r.diagnosis.slice(0,40)}{r.diagnosis.length>40?'…':''}</div>}
                    </td>
                    <td>{fdate(r.received_date)}</td>
                    <td style={{color:overdue?'var(--danger)':'inherit'}}>
                      {r.delivery_date?fdate(r.delivery_date):'—'}{overdue&&' ⚠'}
                    </td>
                    <td style={{fontFamily:'Cormorant Garamond,serif',fontSize:17,color:'var(--gold)'}}>{usd(r.cost)}</td>
                    <td style={{color:bal>0?'var(--danger)':'var(--success)',fontWeight:500,fontSize:13}}>{usd(bal)}</td>
                    <td><span className={`tag ${STATUS_CLS[r.status]||'tg-gray'}`}>{r.status}</span></td>
                    <td style={{display:'flex',gap:4,padding:'8px 14px'}}>
                      <button className="btn btn-outline btn-sm" onClick={()=>setModal(r)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>del(r.id)}>✕</button>
                    </td>
                  </tr>
                )
              }) : <tr><td colSpan={9} style={{textAlign:'center',color:'var(--muted)',padding:28}}>Sin órdenes</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <RepairModal repair={modal==='new'?null:modal} clients={clients} settings={settings}
          onSave={d=>save(d,modal?.id||null)} onClose={()=>setModal(null)} />
      )}
    </div>
  )
}
