// ── CATEGORIES ────────────────────────────────────────────────
import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useNavigate } from 'react-router-dom'

const COLORS = ['tg','tg-b','tg-g','tg-r','tg-purple','tg-gray']

function CatModal({ cat, onSave, onClose }) {
  const [name, setName] = useState(cat?.name || '')
  const [color, setColor] = useState(cat?.color || 'tg')
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">{cat ? 'Editar' : 'Nueva'} categoría</div>
        <div className="fg"><label>Nombre</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Broches, Sets…" /></div>
        <div className="fg"><label>Color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {COLORS.map(c => (
              <button key={c} className={`tag ${c}`} onClick={() => setColor(c)}
                style={{ cursor: 'pointer', border: `2px solid ${c === color ? 'var(--gold)' : 'transparent'}`, padding: '5px 14px', borderRadius: 20 }}>{c}</button>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={() => { if (name) { onSave({ name, color }); onClose() } }}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

export function Categories() {
  const { categories, products, saveCategory, deleteCategory } = useData()
  const [modal, setModal] = useState(null)

  return (
    <div className="page">
      <div className="ph">
        <div><div className="pt"><span>Categorías</span></div><div className="ps">Organiza tu catálogo</div></div>
        <button className="btn btn-gold" onClick={() => setModal('new')}>+ Nueva categoría</button>
      </div>
      <div className="tw">
        <table>
          <thead><tr><th>Nombre</th><th>Productos</th><th>Acciones</th></tr></thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id}>
                <td><span className={`tag ${c.color}`}>{c.name}</span></td>
                <td>{products.filter(p => p.cat_id === c.id).length} productos</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setModal(c)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => {
                    if (products.some(p => p.cat_id === c.id)) return alert('Primero reasigna los productos')
                    if (confirm('¿Eliminar?')) deleteCategory(c.id)
                  }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && <CatModal cat={modal === 'new' ? null : modal} onSave={d => saveCategory(d, modal?.id)} onClose={() => setModal(null)} />}
    </div>
  )
}

// ── CLIENT MODAL ──────────────────────────────────────────────
function ClientModal({ client, onSave, onClose }) {
  const [f, setF] = useState({
    name: client?.name || '', surname: client?.surname || '', email: client?.email || '',
    phone: client?.phone || '', city: client?.city || '', country: client?.country || 'El Salvador',
    nit: client?.nit || '', dob: client?.dob || '', ring_size: client?.ring_size || '',
    prefs: client?.prefs || '', instagram: client?.instagram || '', shipping_addr: client?.shipping_addr || '',
    segment: client?.segment || 'nuevo', notes: client?.notes || ''
  })
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box lg">
        <div className="modal-title">{client ? 'Editar' : 'Nuevo'} cliente</div>
        <div className="fr">
          <div className="fg"><label>Nombre *</label><input value={f.name} onChange={e => s('name', e.target.value)} /></div>
          <div className="fg"><label>Apellido</label><input value={f.surname} onChange={e => s('surname', e.target.value)} /></div>
        </div>
        <div className="fr">
          <div className="fg"><label>Email *</label><input type="email" value={f.email} onChange={e => s('email', e.target.value)} /></div>
          <div className="fg"><label>Teléfono</label><input value={f.phone} onChange={e => s('phone', e.target.value)} placeholder="+503 7000-0000" /></div>
        </div>
        <div className="fr">
          <div className="fg"><label>Ciudad</label><input value={f.city} onChange={e => s('city', e.target.value)} /></div>
          <div className="fg"><label>País</label><input value={f.country} onChange={e => s('country', e.target.value)} /></div>
        </div>
        <div className="fr">
          <div className="fg"><label>NIT</label><input value={f.nit} onChange={e => s('nit', e.target.value)} placeholder="0000-000000-000-0" /></div>
          <div className="fg"><label>Fecha de nacimiento</label><input type="date" value={f.dob} onChange={e => s('dob', e.target.value)} /></div>
        </div>
        <div className="fr">
          <div className="fg"><label>Talla de anillo</label><input value={f.ring_size} onChange={e => s('ring_size', e.target.value)} placeholder="6, 7…" /></div>
          <div className="fg"><label>Instagram</label><input value={f.instagram} onChange={e => s('instagram', e.target.value)} placeholder="@usuario" /></div>
        </div>
        <div className="fg"><label>Dirección de envío</label><input value={f.shipping_addr} onChange={e => s('shipping_addr', e.target.value)} /></div>
        <div className="fg"><label>Preferencias</label><input value={f.prefs} onChange={e => s('prefs', e.target.value)} placeholder="Prefiere oro rosa, piezas delicadas…" /></div>
        <div className="fr">
          <div className="fg"><label>Segmento</label>
            <select value={f.segment} onChange={e => s('segment', e.target.value)}>
              {['vip','regular','nuevo','inactivo'].map(x => <option key={x} value={x}>{x.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
        <div className="fg"><label>Notas</label><textarea rows={2} value={f.notes} onChange={e => s('notes', e.target.value)} /></div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={() => { if (!f.name || !f.email) return alert('Nombre y email requeridos'); onSave(f); onClose() }}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

// ── CLIENTS LIST ──────────────────────────────────────────────
export function Clients() {
  const { clients, invoices, saveClient, deleteClient, segBadge, usd, fdate } = useData()
  const nav = useNavigate()
  const [modal, setModal] = useState(null)
  const [q, setQ] = useState('')

  const filtered = clients.filter(c => `${c.name} ${c.surname} ${c.email} ${c.city}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="page">
      <div className="ph">
        <div><div className="pt">CRM · <span>Clientes</span></div><div className="ps">{clients.length} contactos</div></div>
        <button className="btn btn-gold" onClick={() => setModal('new')}>+ Nuevo cliente</button>
      </div>
      <div className="fb"><input className="si" placeholder="Buscar cliente, email…" value={q} onChange={e => setQ(e.target.value)} /></div>
      <div className="tw">
        <table>
          <thead><tr><th>Cliente</th><th>Email</th><th>Teléfono</th><th>Ciudad</th><th>Seg.</th><th>Total</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtered.map(c => {
              const total = invoices.filter(i => i.client_id === c.id && i.paid).reduce((a, i) => a + Number(i.total), 0)
              const ini = (c.name[0] + (c.surname?.[0] || '')).toUpperCase()
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="av">{ini}</div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{c.name} {c.surname}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.instagram || (c.source === 'web' ? '🌐 web' : '')}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--info)' }}>{c.email}</td>
                  <td>{c.phone}</td>
                  <td>{c.city}</td>
                  <td>{segBadge(c.segment)}</td>
                  <td style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, color: 'var(--gold)' }}>{usd(total)}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => nav(`/admin/clientes/${c.id}`)}>Ver ficha</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setModal(c)}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('¿Eliminar?')) deleteClient(c.id) }}>✕</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {modal && <ClientModal client={modal === 'new' ? null : modal} onSave={d => saveClient(d, modal?.id)} onClose={() => setModal(null)} />}
    </div>
  )
}

// ── CLIENT DETAIL ─────────────────────────────────────────────
export function ClientDetail() {
  const { clients, invoices, orders, opportunities, deliveries, saveClient, segBadge, usd, fdate, statusBadge } = useData()
  const nav = useNavigate()
  const id = window.location.pathname.split('/').pop()
  const c = clients.find(x => x.id === id)
  const [tab, setTab] = useState('inv')
  const [modal, setModal] = useState(false)

  if (!c) return <div className="page"><div className="ps">Cliente no encontrado</div></div>

  const ini = (c.name[0] + (c.surname?.[0] || '')).toUpperCase()
  const cInv = invoices.filter(i => i.client_id === id)
  const cOrd = orders.filter(o => o.client_id === id)
  const cOpp = opportunities.filter(o => o.client_id === id)
  const cDel = deliveries.filter(d => d.client_id === id)
  const paid = cInv.filter(i => i.paid).reduce((a, i) => a + Number(i.total), 0)
  const pending = cInv.filter(i => !i.paid).reduce((a, i) => a + Number(i.total), 0)

  return (
    <div className="page">
      <button className="back-btn" onClick={() => nav('/admin/clientes')}>← Volver a clientes</button>
      <div className="ph">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="av av-lg">{ini}</div>
          <div>
            <div className="pt">{c.name} <span>{c.surname}</span></div>
            <div className="ps">{c.email} · {c.phone}</div>
          </div>
        </div>
        <div className="ph-actions">
          <button className="btn btn-outline" onClick={() => setModal(true)}>Editar cliente</button>
          <button className="btn btn-gold" onClick={() => nav('/admin/oportunidades')}>+ Oportunidad</button>
          <button className="btn btn-gold" onClick={() => nav('/admin/pedidos')}>+ Pedido</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <div className="sc"><div className="sc-label">Total cobrado</div><div className="sc-value">{usd(paid)}</div></div>
        <div className="sc"><div className="sc-label">Por cobrar</div><div className="sc-value">{usd(pending)}</div></div>
        <div className="sc"><div className="sc-label">Pedidos</div><div className="sc-value">{cOrd.length}</div></div>
        <div className="sc"><div className="sc-label">Oportunidades</div><div className="sc-value">{cOpp.length}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Ficha del cliente</div>{segBadge(c.segment)}</div>
          {[
            ['NIT', c.nit], ['Nacimiento', fdate(c.dob)], ['Ciudad', `${c.city}, ${c.country}`],
            ['Instagram', c.instagram], ['Talla anillo', c.ring_size], ['Envío', c.shipping_addr],
            ['Preferencias', c.prefs], ['Notas', c.notes]
          ].map(([l, v]) => v ? (
            <div key={l} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>{v}</div>
            </div>
          ) : null)}
        </div>

        <div>
          <div className="tabs">
            {[['inv','Facturas'],['ord','Pedidos'],['opp','Oportunidades'],['del','Entregas']].map(([k,lbl]) => (
              <button key={k} className={`tab-btn ${tab===k?'active':''}`} onClick={() => setTab(k)}>{lbl}</button>
            ))}
          </div>
          {tab === 'inv' && (
            <div className="tw"><table>
              <thead><tr><th>#Factura</th><th>Fecha</th><th>Total</th><th>IVA</th><th>Estado</th></tr></thead>
              <tbody>
                {cInv.length ? cInv.map(i => (
                  <tr key={i.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{i.number}</td>
                    <td>{fdate(i.date)}</td>
                    <td style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, color: 'var(--gold)' }}>{usd(i.total)}</td>
                    <td>{i.iva_rate ? `${i.iva_rate}%` : 'Exento'}</td>
                    <td>{i.paid ? <span className="tag tg-g">Pagada</span> : <span className="tag tg-r">Impaga</span>}</td>
                  </tr>
                )) : <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>Sin facturas</td></tr>}
              </tbody>
            </table></div>
          )}
          {tab === 'ord' && (
            <div className="tw"><table>
              <thead><tr><th>#Pedido</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
              <tbody>
                {cOrd.length ? cOrd.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{String(o.id).padStart(3,'0')}</td>
                    <td>{fdate(o.date)}</td>
                    <td style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, color: 'var(--gold)' }}>{usd(o.total)}</td>
                    <td>{statusBadge(o.status)}</td>
                  </tr>
                )) : <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>Sin pedidos</td></tr>}
              </tbody>
            </table></div>
          )}
          {tab === 'opp' && (
            <div className="tw"><table>
              <thead><tr><th>Oportunidad</th><th>Valor</th><th>Etapa</th><th>Fecha</th></tr></thead>
              <tbody>
                {cOpp.length ? cOpp.map(o => (
                  <tr key={o.id}>
                    <td><strong>{o.title}</strong><br /><span style={{ fontSize: 11, color: 'var(--muted)' }}>{o.notes}</span></td>
                    <td style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, color: 'var(--gold)' }}>{usd(o.value)}</td>
                    <td>{statusBadge(o.stage)}</td>
                    <td>{fdate(o.date)}</td>
                  </tr>
                )) : <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>Sin oportunidades</td></tr>}
              </tbody>
            </table></div>
          )}
          {tab === 'del' && (
            <div className="tw"><table>
              <thead><tr><th>Fecha</th><th>Productos</th><th>Estado</th><th>Recibido por</th></tr></thead>
              <tbody>
                {cDel.length ? cDel.map(d => (
                  <tr key={d.id}>
                    <td>{fdate(d.date)}</td>
                    <td style={{ fontSize: 12 }}>{d.items}</td>
                    <td>{statusBadge(d.status)}</td>
                    <td>{d.received || '—'}</td>
                  </tr>
                )) : <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>Sin entregas</td></tr>}
              </tbody>
            </table></div>
          )}
        </div>
      </div>

      {modal && <ClientModal client={c} onSave={d => saveClient(d, c.id)} onClose={() => setModal(false)} />}
    </div>
  )
}

// ── OPPORTUNITIES ─────────────────────────────────────────────
const STAGES = ['nueva','contactado','propuesta','negociacion','ganada','perdida']

function OppModal({ opp, clients, preClientId, onSave, onClose }) {
  const [f, setF] = useState({
    client_id: opp?.client_id || preClientId || clients[0]?.id || '',
    title: opp?.title || '', value: opp?.value || '',
    stage: opp?.stage || 'nueva', date: opp?.date || new Date().toISOString().slice(0,10),
    notes: opp?.notes || ''
  })
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">{opp ? 'Editar' : 'Nueva'} oportunidad</div>
        <div className="fg"><label>Título</label><input value={f.title} onChange={e => s('title', e.target.value)} placeholder="Set aniversario…" /></div>
        <div className="fr">
          <div className="fg"><label>Cliente</label>
            <select value={f.client_id} onChange={e => s('client_id', e.target.value)}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.surname}</option>)}
            </select>
          </div>
          <div className="fg"><label>Valor (USD)</label><input type="number" value={f.value} onChange={e => s('value', e.target.value)} /></div>
        </div>
        <div className="fr">
          <div className="fg"><label>Etapa</label>
            <select value={f.stage} onChange={e => s('stage', e.target.value)}>
              {STAGES.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div className="fg"><label>Fecha</label><input type="date" value={f.date} onChange={e => s('date', e.target.value)} /></div>
        </div>
        <div className="fg"><label>Notas</label><textarea rows={2} value={f.notes} onChange={e => s('notes', e.target.value)} /></div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={() => { if (!f.title) return; onSave(f); onClose() }}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

export function Opportunities() {
  const { opportunities, clients, saveOpportunity, deleteOpportunity, clientName, usd, fdate, statusBadge } = useData()
  const [modal, setModal] = useState(null)

  return (
    <div className="page">
      <div className="ph">
        <div><div className="pt"><span>Oportunidades</span></div><div className="ps">Pipeline de ventas</div></div>
        <button className="btn btn-gold" onClick={() => setModal('new')}>+ Nueva oportunidad</button>
      </div>

      <div className="kb">
        {STAGES.slice(0,5).map(stage => (
          <div className="kb-col" key={stage}>
            <div className="kb-col-title">{stage} ({opportunities.filter(o => o.stage === stage).length})</div>
            {opportunities.filter(o => o.stage === stage).map(o => (
              <div className="kb-card" key={o.id} onClick={() => setModal(o)}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{o.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{clientName(o.client_id)}</div>
                <div className="kb-value">{usd(o.value)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="tw" style={{ marginTop: 20 }}>
        <table>
          <thead><tr><th>Título</th><th>Cliente</th><th>Valor</th><th>Etapa</th><th>Fecha</th><th>Acciones</th></tr></thead>
          <tbody>
            {opportunities.map(o => (
              <tr key={o.id}>
                <td><strong>{o.title}</strong></td>
                <td>{clientName(o.client_id)}</td>
                <td style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, color: 'var(--gold)' }}>{usd(o.value)}</td>
                <td>{statusBadge(o.stage)}</td>
                <td>{fdate(o.date)}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setModal(o)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('¿Eliminar?')) deleteOpportunity(o.id) }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <OppModal opp={modal === 'new' ? null : modal} clients={clients}
          onSave={d => saveOpportunity(d, modal?.id || null)} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
