import { useData } from '../context/DataContext'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { products, clients, opportunities, orders, invoices, usd, fdate, statusBadge, profile } = useData()
  const nav = useNavigate()

  const paid = invoices.filter(i => i.paid).reduce((a, i) => a + Number(i.total), 0)
  const paidT1 = invoices.filter(i => i.paid && (orders.find(o=>o.id===i.order_id)?.store === 'tienda1')).reduce((a,i) => a+Number(i.total), 0)
  const paidT2 = invoices.filter(i => i.paid && (orders.find(o=>o.id===i.order_id)?.store === 'tienda2')).reduce((a,i) => a+Number(i.total), 0)
  const lowStock = products.filter(p => p.stock_total >= 0 && p.stock_total <= (p.low_stock_alert || 3))
  const pending = invoices.filter(i => !i.paid).reduce((a, i) => a + Number(i.total), 0)
  const activeOrders = orders.filter(o => ['confirmado', 'proceso', 'listo'].includes(o.status)).length
  const openOpps = opportunities.filter(o => !['ganada', 'perdida'].includes(o.stage)).length
  const STAGES = ['nueva', 'contactado', 'propuesta', 'negociacion', 'ganada']

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt">Bienvenida, <span>{profile?.name?.split(' ')[0] || 'Admin'}</span></div>
          <div className="ps">Panel de control · bybega · El Salvador</div>
        </div>
      </div>

      <div className="stats">
        <div className="sc"><div className="sc-label">Ingresos cobrados</div><div className="sc-value">{usd(paid)}</div><div className="sc-badge bg-g">facturas pagadas</div></div>
        <div className="sc"><div className="sc-label">Por cobrar</div><div className="sc-value">{usd(pending)}</div><div className="sc-badge bg-r">impagas</div></div>
        <div className="sc"><div className="sc-label">Pedidos activos</div><div className="sc-value">{activeOrders}</div><div className="sc-badge bg">en proceso</div></div>
        <div className="sc"><div className="sc-label">Oportunidades</div><div className="sc-value">{openOpps}</div><div className="sc-badge bg-b">abiertas</div></div>
      </div>

      {lowStock.length > 0 && (
        <div style={{ background:'rgba(192,57,43,.06)', border:'1px solid rgba(192,57,43,.2)', borderRadius:10, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div><span style={{ fontSize:14, fontWeight:500, color:'var(--danger)' }}>⚠ {lowStock.length} producto{lowStock.length!==1?'s':''} con stock bajo</span>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{lowStock.slice(0,3).map(p=>p.name).join(', ')}{lowStock.length>3?'…':''}</div></div>
          <button className="btn btn-danger btn-sm" onClick={() => nav('/admin/inventario')}>Ver inventario</button>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom:14 }}>Ventas por tienda</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ background:'var(--gold-p)', borderRadius:8, padding:'14px 16px' }}>
              <div style={{ fontSize:11, color:'#7a5e18', textTransform:'uppercase', letterSpacing:1 }}>Tienda 1</div>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:24, color:'#5a4010', marginTop:4 }}>{usd(paidT1)}</div>
              <div style={{ fontSize:11, color:'#8a6b1e', marginTop:2 }}>{orders.filter(o=>o.store==='tienda1').length} pedidos</div>
            </div>
            <div style={{ background:'#e8f4ff', borderRadius:8, padding:'14px 16px' }}>
              <div style={{ fontSize:11, color:'#1a4a6e', textTransform:'uppercase', letterSpacing:1 }}>Tienda 2</div>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:24, color:'#0c2d4a', marginTop:4 }}>{usd(paidT2)}</div>
              <div style={{ fontSize:11, color:'#1a5276', marginTop:2 }}>{orders.filter(o=>o.store==='tienda2').length} pedidos</div>
            </div>
          </div>
          <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(0,0,0,.06)', display:'flex', justifyContent:'space-between', fontSize:13 }}>
            <span style={{ color:'var(--muted)' }}>Total general</span>
            <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18, color:'var(--gold)' }}>{usd(paid)}</span>
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom:14 }}>Resumen rápido</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[['Productos disponibles', products.filter(p=>p.status==='disponible').length, 'tg-g'],
              ['Clientes en CRM', clients.length, 'tg-b'],
              ['Pedidos activos', orders.filter(o=>['confirmado','proceso','listo'].includes(o.status)).length, 'tg'],
              ['Facturas impagas', invoices.filter(i=>!i.paid).length, 'tg-r']
            ].map(([label, val, cls]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(0,0,0,.04)' }}>
                <span style={{ fontSize:13, color:'var(--mid)' }}>{label}</span>
                <span className={`tag ${cls}`} style={{ fontSize:13, minWidth:28, textAlign:'center' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Actividad reciente</div>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/admin/facturas')}>Ver facturas</button>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>Detalle</th><th>Módulo</th><th>Fecha</th></tr></thead>
              <tbody>
                {invoices.slice(0, 3).map(i => (
                  <tr key={i.id}><td>Factura {i.number}</td><td><span className="tag tg">Factura</span></td><td>{fdate(i.date)}</td></tr>
                ))}
                {orders.slice(0, 2).map(o => (
                  <tr key={o.id}><td>Pedido #{String(o.id).padStart(3, '0')}</td><td><span className="tag tg-b">Pedido</span></td><td>{fdate(o.date)}</td></tr>
                ))}
                {clients.slice(0, 2).map(c => (
                  <tr key={c.id}><td>Cliente: {c.name} {c.surname}</td><td><span className="tag tg-g">CRM</span></td><td>{fdate(c.created_at)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Pipeline de ventas</div>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/admin/oportunidades')}>Ver todas</button>
          </div>
          {STAGES.map(s => {
            const cnt = opportunities.filter(o => o.stage === s).length
            const val = opportunities.filter(o => o.stage === s).reduce((a, o) => a + Number(o.value), 0)
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.05)' }}>
                <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{s}</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{cnt} opp.</span>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, color: 'var(--gold)' }}>{usd(val)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 20 }}>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => nav('/admin/productos')}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>◇</div>
          <div style={{ fontSize: 22, fontFamily: 'Cormorant Garamond, serif' }}>{products.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Productos</div>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => nav('/admin/clientes')}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>◎</div>
          <div style={{ fontSize: 22, fontFamily: 'Cormorant Garamond, serif' }}>{clients.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Clientes en CRM</div>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => nav('/admin/pedidos')}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>▤</div>
          <div style={{ fontSize: 22, fontFamily: 'Cormorant Garamond, serif' }}>{orders.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Pedidos totales</div>
        </div>
      </div>
    </div>
  )
}
