import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'

const CATS = ['arriendo','servicios','insumos','marketing','transporte','personal','mantenimiento','otro']

function ExpenseModal({ exp, onSave, onClose }) {
  const [f, setF] = useState({
    date: exp?.date||new Date().toISOString().slice(0,10),
    category: exp?.category||'operacion',
    description: exp?.description||'',
    amount: exp?.amount||'',
    store: exp?.store||'ambas',
    paid_by: exp?.paid_by||'',
    notes: exp?.notes||''
  })
  const s=(k,v)=>setF(p=>({...p,[k]:v}))
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div className="modal-title">{exp?'Editar':'Nuevo'} gasto</div>
        <div className="fr">
          <div className="fg"><label>Fecha</label><input type="date" value={f.date} onChange={e=>s('date',e.target.value)} /></div>
          <div className="fg"><label>Categoría</label>
            <select value={f.category} onChange={e=>s('category',e.target.value)}>
              {CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="fg"><label>Descripción *</label><input value={f.description} onChange={e=>s('description',e.target.value)} placeholder="Pago de arriendo local, factura eléctrica…" /></div>
        <div className="fr">
          <div className="fg"><label>Monto (USD)</label><input type="number" step="0.01" value={f.amount} onChange={e=>s('amount',e.target.value)} /></div>
          <div className="fg"><label>Tienda / área</label>
            <select value={f.store} onChange={e=>s('store',e.target.value)}>
              <option value="ambas">General</option>
              <option value="tienda1">Tienda 1</option>
              <option value="tienda2">Tienda 2</option>
            </select>
          </div>
        </div>
        <div className="fr">
          <div className="fg"><label>Pagado por</label><input value={f.paid_by} onChange={e=>s('paid_by',e.target.value)} placeholder="Nombre del empleado" /></div>
        </div>
        <div className="fg"><label>Notas</label><textarea rows={2} value={f.notes} onChange={e=>s('notes',e.target.value)} /></div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={()=>{if(!f.description||!f.amount)return alert('Descripción y monto requeridos');onSave(f);onClose()}}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

export default function Expenses() {
  const { clients, invoices, usd, fdate, settings } = useData()
  const [expenses, setExpenses] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('gastos')
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0,7))

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await supabase.from('expenses').select('*').order('date',{ascending:false})
    if (data) setExpenses(data)
    setLoading(false)
  }

  const save = async (data, id) => {
    if (id) await supabase.from('expenses').update(data).eq('id',id)
    else await supabase.from('expenses').insert(data)
    await load()
  }

  const del = async id => {
    if (!confirm('¿Eliminar gasto?')) return
    await supabase.from('expenses').delete().eq('id',id)
    await load()
  }

  const monthExpenses = expenses.filter(e=>e.date?.startsWith(monthFilter))
  const totalExpenses = monthExpenses.reduce((a,e)=>a+Number(e.amount),0)
  const totalIncome = invoices.filter(i=>i.paid&&i.date?.startsWith(monthFilter)).reduce((a,i)=>a+Number(i.total),0)
  const profit = totalIncome - totalExpenses

  const catColor = { arriendo:'tg-r', servicios:'tg-b', insumos:'tg', marketing:'tg-purple', transporte:'tg-gray', personal:'tg-g', mantenimiento:'tg', otro:'tg-gray' }

  // Birthday alerts - next 30 days
  const today = new Date()
  const in30 = new Date(today); in30.setDate(in30.getDate()+30)
  const birthdayClients = clients.filter(c => {
    if (!c.dob) return false
    const dob = new Date(c.dob)
    const thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
    const nextYear = new Date(today.getFullYear()+1, dob.getMonth(), dob.getDate())
    const next = thisYear >= today ? thisYear : nextYear
    const diff = Math.ceil((next-today)/(1000*60*60*24))
    return diff <= 30
  }).map(c => {
    const dob = new Date(c.dob)
    const thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
    const next = thisYear >= today ? thisYear : new Date(today.getFullYear()+1, dob.getMonth(), dob.getDate())
    const diff = Math.ceil((next-today)/(1000*60*60*24))
    return { ...c, daysLeft: diff, nextBirthday: next }
  }).sort((a,b)=>a.daysLeft-b.daysLeft)

  const wa = (settings?.phone||'').replace(/\D/g,'')
  const waMsg = (c) => `Hola ${c.name}! 🎂 En bybega queremos desearte un feliz cumpleaños. Como cliente especial tienes un descuento exclusivo en tu próxima joya. ¡Escríbenos!`

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt">Gastos y <span>Finanzas</span></div>
          <div className="ps">Control financiero del negocio</div>
        </div>
        {tab==='gastos'&&<button className="btn btn-gold" onClick={()=>setModal('new')}>+ Registrar gasto</button>}
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab==='gastos'?'active':''}`} onClick={()=>setTab('gastos')}>Gastos</button>
        <button className={`tab-btn ${tab==='resumen'?'active':''}`} onClick={()=>setTab('resumen')}>Ingresos vs Gastos</button>
        <button className={`tab-btn ${tab==='cumple'?'active':''}`} onClick={()=>setTab('cumple')}>
          Cumpleaños {birthdayClients.length>0&&<span className="tag tg-r" style={{fontSize:10,marginLeft:4}}>{birthdayClients.length}</span>}
        </button>
      </div>

      {tab==='gastos'&&(
        <>
          <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:16}}>
            <input type="month" value={monthFilter} onChange={e=>setMonthFilter(e.target.value)}
              style={{padding:'7px 12px',border:'1px solid rgba(0,0,0,.12)',borderRadius:8,fontSize:13,fontFamily:'DM Sans,sans-serif',outline:'none'}} />
            <div style={{fontSize:13,color:'var(--muted)'}}>Mostrando {monthExpenses.length} gastos · Total: <strong style={{color:'var(--danger)'}}>{usd(totalExpenses)}</strong></div>
          </div>
          {loading?<div className="ps">Cargando…</div>:(
            <div className="tw">
              <table>
                <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Área</th><th>Monto</th><th>Pagado por</th><th></th></tr></thead>
                <tbody>
                  {monthExpenses.length?monthExpenses.map(e=>(
                    <tr key={e.id}>
                      <td>{fdate(e.date)}</td>
                      <td><span className={`tag ${catColor[e.category]||'tg-gray'}`}>{e.category}</span></td>
                      <td><strong>{e.description}</strong>{e.notes&&<div style={{fontSize:11,color:'var(--muted)'}}>{e.notes}</div>}</td>
                      <td style={{fontSize:12}}>{e.store==='ambas'?'General':e.store==='tienda1'?settings?.store1_name||'T1':settings?.store2_name||'T2'}</td>
                      <td style={{color:'var(--danger)',fontFamily:'Cormorant Garamond,serif',fontSize:17}}>-{usd(e.amount)}</td>
                      <td style={{fontSize:12}}>{e.paid_by||'—'}</td>
                      <td style={{display:'flex',gap:4,padding:'8px 14px'}}>
                        <button className="btn btn-outline btn-sm" onClick={()=>setModal(e)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>del(e.id)}>✕</button>
                      </td>
                    </tr>
                  )):<tr><td colSpan={7} style={{textAlign:'center',color:'var(--muted)',padding:28}}>Sin gastos en este mes</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab==='resumen'&&(
        <div>
          <div style={{display:'flex',gap:12,marginBottom:20}}>
            <input type="month" value={monthFilter} onChange={e=>setMonthFilter(e.target.value)}
              style={{padding:'7px 12px',border:'1px solid rgba(0,0,0,.12)',borderRadius:8,fontSize:13,fontFamily:'DM Sans,sans-serif',outline:'none'}} />
          </div>
          <div className="stats" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:24}}>
            <div className="sc"><div className="sc-label">Ingresos cobrados</div><div className="sc-value" style={{color:'var(--success)'}}>{usd(totalIncome)}</div></div>
            <div className="sc"><div className="sc-label">Gastos totales</div><div className="sc-value" style={{color:'var(--danger)'}}>-{usd(totalExpenses)}</div></div>
            <div className="sc">
              <div className="sc-label">Beneficio neto</div>
              <div className="sc-value" style={{color:profit>=0?'var(--success)':'var(--danger)'}}>{profit>=0?'':'-'}{usd(Math.abs(profit))}</div>
              <div className={`sc-badge ${profit>=0?'bg-g':'bg-r'}`}>{profit>=0?'positivo':'negativo'}</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div className="card">
              <div className="card-title" style={{marginBottom:14}}>Gastos por categoría</div>
              {CATS.map(cat=>{
                const total=monthExpenses.filter(e=>e.category===cat).reduce((a,e)=>a+Number(e.amount),0)
                if(!total)return null
                const pct=totalExpenses>0?Math.round(total/totalExpenses*100):0
                return(
                  <div key={cat} style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                      <span style={{textTransform:'capitalize'}}>{cat}</span>
                      <span style={{color:'var(--danger)'}}>{usd(total)} ({pct}%)</span>
                    </div>
                    <div style={{height:5,background:'rgba(0,0,0,.06)',borderRadius:3}}>
                      <div style={{height:'100%',width:`${pct}%`,background:'var(--danger)',borderRadius:3,transition:'width .3s'}} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="card">
              <div className="card-title" style={{marginBottom:14}}>Margen del mes</div>
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:48,color:profit>=0?'var(--success)':'var(--danger)'}}>
                  {totalIncome>0?Math.round(profit/totalIncome*100):0}%
                </div>
                <div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>margen neto</div>
                <div style={{marginTop:20,fontSize:12,color:'var(--muted)',lineHeight:2}}>
                  Ingresos: <strong style={{color:'var(--success)'}}>{usd(totalIncome)}</strong><br/>
                  Gastos: <strong style={{color:'var(--danger)'}}>-{usd(totalExpenses)}</strong><br/>
                  Neto: <strong style={{color:profit>=0?'var(--success)':'var(--danger)'}}>{usd(profit)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab==='cumple'&&(
        <div>
          <div style={{marginBottom:16,fontSize:13,color:'var(--muted)'}}>
            Clientes con cumpleaños en los próximos 30 días. Escríbeles por WhatsApp para fidelizarlos. 🎂
          </div>
          {birthdayClients.length===0?(
            <div style={{textAlign:'center',padding:'40px',color:'var(--muted)'}}>
              <div style={{fontSize:36,marginBottom:8}}>🎂</div>
              <div>No hay cumpleaños en los próximos 30 días</div>
              <div style={{fontSize:12,marginTop:4}}>Asegúrate de tener la fecha de nacimiento de tus clientes en el CRM</div>
            </div>
          ):(
            <div className="tw">
              <table>
                <thead><tr><th>Cliente</th><th>Segmento</th><th>Cumpleaños</th><th>Faltan</th><th>WhatsApp</th></tr></thead>
                <tbody>
                  {birthdayClients.map(c=>(
                    <tr key={c.id} style={{background:c.daysLeft<=7?'rgba(184,151,74,.05)':''}}>
                      <td>
                        <div style={{fontWeight:500}}>{c.name} {c.surname}</div>
                        <div style={{fontSize:11,color:'var(--muted)'}}>{c.phone}</div>
                      </td>
                      <td><span className={`tag ${c.segment==='vip'?'tg':c.segment==='regular'?'tg-b':'tg-g'}`}>{(c.segment||'').toUpperCase()}</span></td>
                      <td>{c.nextBirthday.toLocaleDateString('es-SV',{day:'2-digit',month:'long'})}</td>
                      <td>
                        <span style={{fontFamily:'Cormorant Garamond,serif',fontSize:20,color:c.daysLeft<=7?'var(--gold)':'var(--mid)'}}>
                          {c.daysLeft===0?'¡Hoy!':c.daysLeft===1?'Mañana':`${c.daysLeft} días`}
                        </span>
                      </td>
                      <td>
                        <a href={`https://wa.me/${(c.phone||'').replace(/\D/g,'')}?text=${encodeURIComponent(waMsg(c))}`}
                          target="_blank" rel="noreferrer"
                          className="btn btn-success btn-sm" style={{textDecoration:'none',display:'inline-flex'}}>
                          💬 Felicitar
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal&&<ExpenseModal exp={modal==='new'?null:modal} onSave={d=>save(d,modal?.id||null)} onClose={()=>setModal(null)} />}
    </div>
  )
}
