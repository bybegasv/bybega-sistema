import { useState } from 'react'
import { useData } from '../context/DataContext'

const PAY_METHODS = [
  { value: 'cash',     label: 'Efectivo',      icon: '💵' },
  { value: 'transfer', label: 'Transferencia', icon: '🏦' },
  { value: 'wompi',    label: 'Wompi',         icon: '💳' },
  { value: 'n1co',     label: 'N1co',          icon: '📱' },
  { value: 'paypal',   label: 'PayPal',        icon: '🅿️' },
  { value: 'card',     label: 'Otra',          icon: '🌐' },
]

export default function Shifts() {
  const { shifts, settings, shiftSummary, usd } = useData()
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const list = filter === 'open' ? shifts.filter(s => !s.closed_at)
             : filter === 'closed' ? shifts.filter(s => s.closed_at)
             : shifts

  const fmtDT = (iso) => iso ? new Date(iso).toLocaleString('es-SV', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'
  const duration = (s) => {
    if (!s.closed_at) return 'En curso'
    const ms = new Date(s.closed_at) - new Date(s.opened_at)
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h}h ${m}m`
  }
  const storeLbl = (s) => s === 'tienda1' ? (settings.store1_name || 'Tienda 1') : (settings.store2_name || 'Tienda 2')

  const openCount = shifts.filter(s => !s.closed_at).length

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt"><span>Turnos</span> · histórico de caja</div>
          <div className="ps">{shifts.length} turnos registrados · {openCount} abierto{openCount !== 1 ? 's' : ''} ahora</div>
        </div>
      </div>

      <div className="fb">
        <button className={`fi ${filter==='all'?'active':''}`} onClick={() => setFilter('all')}>Todos ({shifts.length})</button>
        <button className={`fi ${filter==='open'?'active':''}`} onClick={() => setFilter('open')}>En curso ({openCount})</button>
        <button className={`fi ${filter==='closed'?'active':''}`} onClick={() => setFilter('closed')}>Cerrados</button>
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:40, color:'var(--muted)' }}>
          No hay turnos en este filtro.
        </div>
      ) : (
        <div style={{ display:'grid', gap:10 }}>
          {list.map(s => {
            const sum = shiftSummary(s.id)
            const expectedCash = Number(s.opening_cash || 0) + sum.cash
            const declared = s.declared_cash !== null && s.declared_cash !== undefined ? Number(s.declared_cash) : null
            const diff = declared !== null ? declared - expectedCash : null
            const isOpen = !s.closed_at
            const isExpanded = expanded === s.id
            return (
              <div key={s.id} className="card" style={{ padding:0, overflow:'hidden' }}>
                <div onClick={() => setExpanded(isExpanded ? null : s.id)}
                  style={{ display:'grid', gridTemplateColumns:'auto 1fr auto auto auto', gap:18, alignItems:'center', padding:'14px 18px', cursor:'pointer' }}>
                  <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background: isOpen ? '#2ee072' : '#bbb', boxShadow: isOpen ? '0 0 8px #2ee072' : 'none' }}></span>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <strong style={{ fontSize:14 }}>{s.user_name || 'Cajera'}</strong>
                      <span className="tag tg-b" style={{ fontSize:10 }}>{storeLbl(s.store)}</span>
                      {isOpen && <span className="tag tg" style={{ fontSize:10 }}>EN CURSO</span>}
                    </div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
                      {fmtDT(s.opened_at)} → {s.closed_at ? fmtDT(s.closed_at) : 'ahora'} · {duration(s)}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>Total ventas</div>
                    <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, color:'var(--gold)' }}>{usd(sum.total)}</div>
                  </div>
                  <div style={{ textAlign:'right', minWidth:90 }}>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{sum.count} venta{sum.count!==1?'s':''}</div>
                    {diff !== null && (
                      <div style={{ fontSize:13, color: diff === 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {diff === 0 ? '✓ cuadra' : `${diff > 0 ? '+' : ''}${usd(diff)}`}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize:14, color:'var(--muted)' }}>{isExpanded ? '▴' : '▾'}</span>
                </div>

                {isExpanded && (
                  <div style={{ padding:'18px 22px', borderTop:'1px solid var(--border)', background:'#fafaf8' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12, marginBottom:18 }}>
                      <div style={{ background:'#fff', padding:'12px 14px', borderRadius:6, border:'1px solid var(--border)' }}>
                        <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Caja inicial</div>
                        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18 }}>{usd(s.opening_cash || 0)}</div>
                      </div>
                      <div style={{ background:'#fff', padding:'12px 14px', borderRadius:6, border:'1px solid var(--border)' }}>
                        <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Esperado en caja</div>
                        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18 }}>{usd(expectedCash)}</div>
                      </div>
                      {declared !== null && (
                        <div style={{ background:'#fff', padding:'12px 14px', borderRadius:6, border:'1px solid var(--border)' }}>
                          <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Contado físico</div>
                          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18 }}>{usd(declared)}</div>
                        </div>
                      )}
                      {diff !== null && (
                        <div style={{ background: diff === 0 ? 'rgba(46,125,82,.08)' : 'rgba(192,57,43,.06)', padding:'12px 14px', borderRadius:6, border:`1px solid ${diff === 0 ? 'rgba(46,125,82,.2)' : 'rgba(192,57,43,.2)'}` }}>
                          <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Diferencia</div>
                          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18, color: diff === 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {diff === 0 ? '✓ 0.00' : `${diff > 0 ? '+' : ''}${usd(diff)}`}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Desglose por método</div>
                    <div style={{ display:'grid', gap:4, marginBottom:12, fontSize:13 }}>
                      {PAY_METHODS.map(pm => sum[pm.value] ? (
                        <div key={pm.value} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px dashed var(--border)' }}>
                          <span>{pm.icon} {pm.label}</span>
                          <strong>{usd(sum[pm.value])}</strong>
                        </div>
                      ) : null)}
                      {sum.count === 0 && <div style={{ color:'var(--muted)', fontStyle:'italic' }}>Sin ventas en este turno</div>}
                    </div>

                    {s.notes && (
                      <div style={{ marginTop:12, padding:'10px 14px', background:'#fff', borderRadius:6, fontSize:12, color:'var(--mid)' }}>
                        <strong style={{ color:'var(--muted)' }}>Observaciones:</strong> {s.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
