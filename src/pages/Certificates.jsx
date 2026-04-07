import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'

function CertModal({ products, clients, orders, onSave, onClose }) {
  const [f, setF] = useState({ product_id:'', client_id:'', order_id:'', notes:'' })
  const s=(k,v)=>setF(p=>({...p,[k]:v}))
  const selProd = products.find(p=>p.id===f.product_id)
  const selClient = clients.find(c=>c.id===f.client_id)
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div className="modal-title">Generar certificado</div>
        <div className="fg"><label>Producto *</label>
          <select value={f.product_id} onChange={e=>s('product_id',e.target.value)}>
            <option value="">— Seleccionar joya —</option>
            {products.map(p=><option key={p.id} value={p.id}>{p.name} · {p.ref}</option>)}
          </select>
        </div>
        <div className="fg"><label>Cliente</label>
          <select value={f.client_id} onChange={e=>s('client_id',e.target.value)}>
            <option value="">— Sin cliente —</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name} {c.surname}</option>)}
          </select>
        </div>
        <div className="fg"><label>Pedido asociado</label>
          <select value={f.order_id} onChange={e=>s('order_id',e.target.value)}>
            <option value="">— Sin pedido —</option>
            {orders.map(o=><option key={o.id} value={o.id}>#{String(o.id).padStart(3,'0')} · {clients.find(c=>c.id===o.client_id)?.name||'—'}</option>)}
          </select>
        </div>
        <div className="fg"><label>Notas adicionales</label>
          <textarea rows={2} value={f.notes} onChange={e=>s('notes',e.target.value)} placeholder="Garantía especial, observaciones…" />
        </div>
        {selProd&&(
          <div style={{background:'var(--gold-p)',borderRadius:8,padding:'12px 14px',marginTop:4,fontSize:12}}>
            <strong>Vista previa:</strong> {selProd.name} · {selProd.ref} · {selProd.material}
            {selClient&&<div>Cliente: {selClient.name} {selClient.surname}</div>}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={()=>{if(!f.product_id)return alert('Selecciona un producto');onSave(f);onClose()}}>Generar</button>
        </div>
      </div>
    </div>
  )
}

function CertPrintView({ cert, settings }) {
  const print = () => {
    const w = window.open('','_blank','width=800,height=900')
    const box = document.getElementById('cert-print-box')
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Certificado ${cert.number}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a1714;padding:0}
    @media print{@page{margin:0;size:A4}body{padding:0}}</style></head>
    <body>${box.innerHTML}<script>window.onload=function(){window.print()}<\/script></body></html>`)
    w.document.close()
  }

  const s = settings || {}
  return (
    <div>
      <div id="cert-print-box">
        <div style={{width:'100%',maxWidth:600,margin:'0 auto',padding:'48px 40px',border:'2px solid #b8974a',borderRadius:16,position:'relative',fontFamily:'DM Sans,sans-serif'}}>
          {/* Header */}
          <div style={{textAlign:'center',marginBottom:32,paddingBottom:24,borderBottom:'1px solid #e8dcc8'}}>
            <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:36,color:'#b8974a',letterSpacing:4,marginBottom:4}}>{s.company||'bybega'}</div>
            <div style={{fontSize:11,letterSpacing:3,color:'#8a7d6e',textTransform:'uppercase'}}>Certificado de Autenticidad</div>
          </div>
          {/* Cert number */}
          <div style={{textAlign:'center',marginBottom:28}}>
            <div style={{fontSize:10,color:'#8a7d6e',letterSpacing:2,textTransform:'uppercase',marginBottom:4}}>N° de certificado</div>
            <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:24,color:'#1a1714',letterSpacing:2}}>{cert.number}</div>
          </div>
          {/* Decorative line */}
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:28}}>
            <div style={{flex:1,height:1,background:'#e8dcc8'}}/>
            <div style={{color:'#b8974a',fontSize:18}}>✦</div>
            <div style={{flex:1,height:1,background:'#e8dcc8'}}/>
          </div>
          {/* Product info */}
          <div style={{marginBottom:28}}>
            <div style={{fontSize:10,color:'#8a7d6e',letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>La siguiente pieza ha sido verificada y certificada</div>
            <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:28,color:'#1a1714',marginBottom:4}}>{cert.product_name}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:16}}>
              {[['Referencia',cert.product_ref],['Material',cert.material],
                ['Fecha de emisión',new Date(cert.issue_date+'T12:00:00').toLocaleDateString('es-SV',{day:'2-digit',month:'long',year:'numeric'})],
                ['Propietario',cert.client_name||'—']
              ].map(([l,v])=>(
                <div key={l} style={{padding:'10px 14px',background:'#faf8f5',borderRadius:8}}>
                  <div style={{fontSize:10,color:'#8a7d6e',letterSpacing:1,textTransform:'uppercase',marginBottom:2}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:500,color:'#1a1714'}}>{v||'—'}</div>
                </div>
              ))}
            </div>
            {cert.notes&&<div style={{marginTop:12,fontSize:12,color:'#8a7d6e',fontStyle:'italic',padding:'8px 14px',background:'#faf8f5',borderRadius:8}}>{cert.notes}</div>}
          </div>
          {/* Decorative line */}
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:28}}>
            <div style={{flex:1,height:1,background:'#e8dcc8'}}/>
            <div style={{color:'#b8974a',fontSize:18}}>✦</div>
            <div style={{flex:1,height:1,background:'#e8dcc8'}}/>
          </div>
          {/* Footer */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'end'}}>
            <div style={{fontSize:11,color:'#8a7d6e',lineHeight:1.8}}>
              {s.address}<br/>{s.email}<br/>{s.instagram}
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{borderTop:'1px solid #c8b49a',paddingTop:8,fontSize:11,color:'#8a7d6e'}}>Firma autorizada · {s.company||'bybega'}</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{marginTop:16,display:'flex',justifyContent:'center'}}>
        <button className="btn btn-gold" onClick={print}>🖨 Imprimir / Guardar PDF</button>
      </div>
    </div>
  )
}

export default function Certificates() {
  const { products, clients, orders, settings, usd, fdate } = useData()
  const [certs, setCerts] = useState([])
  const [modal, setModal] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await supabase.from('certificates').select('*').order('created_at',{ascending:false})
    if (data) setCerts(data)
    setLoading(false)
  }

  const nextNumber = async () => {
    const { data } = await supabase.from('settings').select('value').eq('key','cert_counter').single()
    const n = parseInt(data?.value||1)
    await supabase.from('settings').update({value:String(n+1)}).eq('key','cert_counter')
    return `CERT-${new Date().getFullYear()}-${String(n).padStart(4,'0')}`
  }

  const save = async (data) => {
    const prod = products.find(p=>p.id===data.product_id)
    const client = clients.find(c=>c.id===data.client_id)
    const number = await nextNumber()
    await supabase.from('certificates').insert({
      number, product_id:data.product_id, product_name:prod?.name||'',
      product_ref:prod?.ref||'', material:prod?.material||'',
      client_id:data.client_id||null, client_name:client?`${client.name} ${client.surname}`:'',
      order_id:data.order_id?parseInt(data.order_id):null,
      issue_date:new Date().toISOString().slice(0,10), notes:data.notes
    })
    await load()
  }

  const del = async id => {
    if (!confirm('¿Eliminar certificado?')) return
    await supabase.from('certificates').delete().eq('id',id)
    await load()
    if (viewing?.id===id) setViewing(null)
  }

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt">Certificados de <span>Autenticidad</span></div>
          <div className="ps">{certs.length} certificados emitidos</div>
        </div>
        <button className="btn btn-gold" onClick={()=>setModal(true)}>+ Nuevo certificado</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:viewing?'1fr 560px':'1fr',gap:20}}>
        <div className="tw">
          <table>
            <thead><tr><th>N° Certificado</th><th>Producto</th><th>Material</th><th>Cliente</th><th>Fecha</th><th>Acciones</th></tr></thead>
            <tbody>
              {loading?<tr><td colSpan={6} style={{textAlign:'center',color:'var(--muted)',padding:20}}>Cargando…</td></tr>
               :certs.length?certs.map(c=>(
                <tr key={c.id}>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{c.number}</td>
                  <td><strong>{c.product_name}</strong><div style={{fontSize:11,color:'var(--muted)'}}>{c.product_ref}</div></td>
                  <td style={{fontSize:12}}>{c.material||'—'}</td>
                  <td style={{fontSize:13}}>{c.client_name||'Sin cliente'}</td>
                  <td>{fdate(c.issue_date)}</td>
                  <td style={{display:'flex',gap:4,padding:'8px 14px'}}>
                    <button className="btn btn-gold btn-sm" onClick={()=>setViewing(c)}>Ver / Imprimir</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>del(c.id)}>✕</button>
                  </td>
                </tr>
              )):<tr><td colSpan={6} style={{textAlign:'center',color:'var(--muted)',padding:28}}>Sin certificados emitidos</td></tr>}
            </tbody>
          </table>
        </div>

        {viewing&&(
          <div className="card" style={{alignSelf:'start',position:'sticky',top:20}}>
            <div className="card-header">
              <div className="card-title">Certificado {viewing.number}</div>
              <button onClick={()=>setViewing(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--muted)'}}>✕</button>
            </div>
            <CertPrintView cert={viewing} settings={settings} />
          </div>
        )}
      </div>

      {modal&&<CertModal products={products} clients={clients} orders={orders} onSave={save} onClose={()=>setModal(false)} />}
    </div>
  )
}
