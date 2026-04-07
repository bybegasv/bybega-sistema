import { useState } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'

const TYPES = ['materiales','gemología','empaque','herramientas','servicios','otro']

function SupplierModal({ sup, onSave, onClose }) {
  const [f, setF] = useState({
    name: sup?.name || '', contact_name: sup?.contact_name || '',
    email: sup?.email || '', phone: sup?.phone || '',
    country: sup?.country || 'El Salvador', address: sup?.address || '',
    type: sup?.type || 'materiales', payment_terms: sup?.payment_terms || '',
    nit: sup?.nit || '', notes: sup?.notes || '', active: sup?.active ?? true
  })
  const s = (k,v) => setF(p => ({...p,[k]:v}))
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal-box lg">
        <div className="modal-title">{sup?'Editar':'Nuevo'} proveedor</div>
        <div className="fr">
          <div className="fg"><label>Nombre empresa *</label><input value={f.name} onChange={e=>s('name',e.target.value)} placeholder="Joyería Mayorista XYZ" /></div>
          <div className="fg"><label>Contacto</label><input value={f.contact_name} onChange={e=>s('contact_name',e.target.value)} placeholder="Nombre del contacto" /></div>
        </div>
        <div className="fr">
          <div className="fg"><label>Email</label><input type="email" value={f.email} onChange={e=>s('email',e.target.value)} /></div>
          <div className="fg"><label>Teléfono / WhatsApp</label><input value={f.phone} onChange={e=>s('phone',e.target.value)} placeholder="+503 7000-0000" /></div>
        </div>
        <div className="fr">
          <div className="fg"><label>País</label><input value={f.country} onChange={e=>s('country',e.target.value)} /></div>
          <div className="fg"><label>NIT / RUC</label><input value={f.nit} onChange={e=>s('nit',e.target.value)} /></div>
        </div>
        <div className="fg"><label>Dirección</label><input value={f.address} onChange={e=>s('address',e.target.value)} /></div>
        <div className="fr">
          <div className="fg"><label>Tipo de proveedor</label>
            <select value={f.type} onChange={e=>s('type',e.target.value)}>
              {TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div className="fg"><label>Condiciones de pago</label><input value={f.payment_terms} onChange={e=>s('payment_terms',e.target.value)} placeholder="Ej: 30 días, contado, 50% anticipo" /></div>
        </div>
        <div className="fg"><label>Notas</label><textarea rows={2} value={f.notes} onChange={e=>s('notes',e.target.value)} /></div>
        <div className="fg" style={{display:'flex',alignItems:'center',gap:10}}>
          <input type="checkbox" id="sup-active" checked={f.active} onChange={e=>s('active',e.target.checked)} />
          <label htmlFor="sup-active" style={{textTransform:'none',letterSpacing:0,fontSize:13,color:'var(--dark)'}}>Proveedor activo</label>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={()=>{if(!f.name)return alert('Nombre requerido');onSave(f);onClose()}}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

export default function Suppliers() {
  const { usd, fdate } = useData()
  const [suppliers, setSuppliers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [modal, setModal] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useState(() => { loadData() }, [])

  const loadData = async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('purchases').select('*').order('date', { ascending: false })
    ])
    if (s) setSuppliers(s)
    if (p) setPurchases(p)
    setLoading(false)
  }

  const save = async (data, id) => {
    if (id) await supabase.from('suppliers').update(data).eq('id', id)
    else await supabase.from('suppliers').insert(data)
    await loadData()
  }

  const del = async (id) => {
    if (!confirm('¿Eliminar proveedor?')) return
    await supabase.from('suppliers').delete().eq('id', id)
    await loadData()
    if (detail?.id === id) setDetail(null)
  }

  const filtered = suppliers.filter(s =>
    `${s.name} ${s.contact_name} ${s.email} ${s.country}`.toLowerCase().includes(q.toLowerCase())
  )

  const typeColor = { materiales:'tg', gemología:'tg-purple', empaque:'tg-b', herramientas:'tg-gray', servicios:'tg-g', otro:'tg-gray' }

  const totalSpent = (supId) => purchases.filter(p=>p.supplier_id===supId).reduce((a,p)=>a+Number(p.total),0)
  const lastPurchase = (supId) => {
    const ps = purchases.filter(p=>p.supplier_id===supId).sort((a,b)=>new Date(b.date)-new Date(a.date))
    return ps[0]?.date
  }

  if (loading) return <div className="page"><div className="ps">Cargando proveedores…</div></div>

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt"><span>Proveedores</span></div>
          <div className="ps">{suppliers.length} proveedores · {suppliers.filter(s=>s.active).length} activos</div>
        </div>
        <button className="btn btn-gold" onClick={()=>setModal('new')}>+ Nuevo proveedor</button>
      </div>

      <div className="stats" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <div className="sc"><div className="sc-label">Total proveedores</div><div className="sc-value">{suppliers.length}</div></div>
        <div className="sc"><div className="sc-label">Total comprado</div><div className="sc-value">{usd(purchases.reduce((a,p)=>a+Number(p.total),0))}</div><div className="sc-badge bg">histórico</div></div>
        <div className="sc"><div className="sc-label">Compras este mes</div>
          <div className="sc-value">{usd(purchases.filter(p=>p.date?.startsWith(new Date().toISOString().slice(0,7))).reduce((a,p)=>a+Number(p.total),0))}</div>
        </div>
      </div>

      <div className="fb"><input className="si" placeholder="Buscar proveedor…" value={q} onChange={e=>setQ(e.target.value)} /></div>

      <div style={{display:'grid',gridTemplateColumns:detail?'1fr 380px':'1fr',gap:20}}>
        <div className="tw">
          <table>
            <thead><tr><th>Proveedor</th><th>Tipo</th><th>País</th><th>Contacto</th><th>Total comprado</th><th>Última compra</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {filtered.map(s=>(
                <tr key={s.id} style={{cursor:'pointer'}} onClick={()=>setDetail(s)}>
                  <td>
                    <div style={{fontWeight:500}}>{s.name}</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>{s.email}</div>
                  </td>
                  <td><span className={`tag ${typeColor[s.type]||'tg-gray'}`}>{s.type}</span></td>
                  <td>{s.country}</td>
                  <td style={{fontSize:12}}>{s.contact_name||'—'}<br/><span style={{color:'var(--muted)'}}>{s.phone}</span></td>
                  <td style={{fontFamily:'Cormorant Garamond,serif',fontSize:17,color:'var(--gold)'}}>{usd(totalSpent(s.id))}</td>
                  <td style={{fontSize:12}}>{lastPurchase(s.id)?fdate(lastPurchase(s.id)):'Sin compras'}</td>
                  <td>{s.active?<span className="tag tg-g">Activo</span>:<span className="tag tg-gray">Inactivo</span>}</td>
                  <td style={{display:'flex',gap:4,padding:'8px 14px'}}>
                    <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();setModal(s)}}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={e=>{e.stopPropagation();del(s.id)}}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {detail && (
          <div className="card" style={{alignSelf:'start',position:'sticky',top:20}}>
            <div className="card-header">
              <div className="card-title">{detail.name}</div>
              <button onClick={()=>setDetail(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--muted)'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
              {[['Contacto',detail.contact_name],['Email',detail.email],['Teléfono',detail.phone],
                ['País',detail.country],['NIT',detail.nit],['Dirección',detail.address],
                ['Pago',detail.payment_terms],['Notas',detail.notes]].map(([l,v])=>v?(
                <div key={l}>
                  <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.8,marginBottom:1}}>{l}</div>
                  <div style={{fontSize:13}}>{v}</div>
                </div>
              ):null)}
            </div>
            <div style={{borderTop:'1px solid rgba(0,0,0,.07)',paddingTop:12}}>
              <div style={{fontSize:12,fontWeight:500,marginBottom:8,color:'var(--mid)'}}>Historial de compras</div>
              {purchases.filter(p=>p.supplier_id===detail.id).length===0
                ? <div style={{fontSize:12,color:'var(--muted)'}}>Sin compras registradas</div>
                : purchases.filter(p=>p.supplier_id===detail.id).slice(0,5).map(p=>(
                  <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(0,0,0,.04)',fontSize:12}}>
                    <div><div>{fdate(p.date)}</div><div style={{color:'var(--muted)',fontSize:11}}>{p.notes||'Sin notas'}</div></div>
                    <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:16,color:'var(--gold)'}}>{usd(p.total)}</div>
                  </div>
                ))
              }
              <div style={{marginTop:10,padding:'8px 0',borderTop:'1px solid rgba(0,0,0,.07)',display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:12,color:'var(--muted)'}}>Total comprado</span>
                <span style={{fontFamily:'Cormorant Garamond,serif',fontSize:18,color:'var(--gold)'}}>{usd(totalSpent(detail.id))}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {modal && <SupplierModal sup={modal==='new'?null:modal} onSave={d=>save(d,modal?.id||null)} onClose={()=>setModal(null)} />}
    </div>
  )
}
