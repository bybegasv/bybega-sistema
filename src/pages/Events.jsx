import { useState } from 'react'
import { useData } from '../context/DataContext'

const TYPES = [
  { value: 'cita',        label: 'Cita',           color: 'tg' },
  { value: 'perforacion', label: 'Perforación',    color: 'tg-purple' },
  { value: 'prueba',      label: 'Prueba / fitting', color: 'tg-b' },
  { value: 'entrega',     label: 'Entrega',        color: 'tg-g' },
  { value: 'otro',        label: 'Otro',           color: 'tg-gray' },
]
const TYPE_COLOR = Object.fromEntries(TYPES.map(t => [t.value, t.color]))
const TYPE_LBL   = Object.fromEntries(TYPES.map(t => [t.value, t.label]))

const STATUSES = ['agendado', 'confirmado', 'completado', 'cancelado']

// Genera un link "Add to Google Calendar" pre-rellenado
function googleCalendarUrl(ev, settings = {}) {
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, '')
  const start = fmt(ev.start_at)
  const end = fmt(ev.end_at || new Date(new Date(ev.start_at).getTime() + 60 * 60 * 1000))
  const text = encodeURIComponent(`${TYPE_LBL[ev.type] || 'Cita'} · ${ev.title}`)
  const details = encodeURIComponent(
    `${ev.notes || ''}${ev.notes ? '\n\n' : ''}` +
    `Cliente: ${ev.clientName || '—'}\n` +
    `Tipo: ${TYPE_LBL[ev.type] || ev.type}\n` +
    `bybega · ${settings.company || 'Joyería'}`
  )
  const location = encodeURIComponent(ev.location || settings.address || '')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`
}

function EventModal({ ev, clients, settings, onSave, onClose }) {
  const initStart = ev?.start_at ? new Date(ev.start_at).toISOString().slice(0,16) : new Date().toISOString().slice(0,16)
  const initEnd = ev?.end_at ? new Date(ev.end_at).toISOString().slice(0,16) : ''

  const [f, setF] = useState({
    title: ev?.title || '',
    type: ev?.type || 'cita',
    client_id: ev?.client_id || '',
    start_at: initStart,
    end_at: initEnd,
    location: ev?.location || (settings?.address || ''),
    notes: ev?.notes || '',
    status: ev?.status || 'agendado'
  })
  const [err, setErr] = useState('')
  const s = (k, v) => { setF(p => ({ ...p, [k]: v })); if (err) setErr('') }

  const submit = () => {
    if (!f.title?.trim()) return setErr('Título obligatorio')
    if (!f.start_at) return setErr('Fecha y hora obligatorias')
    onSave({ ...f, start_at: new Date(f.start_at).toISOString(), end_at: f.end_at ? new Date(f.end_at).toISOString() : null })
    onClose()
  }

  const previewClient = clients.find(c => c.id === f.client_id)
  const gcalUrl = googleCalendarUrl({
    ...f, clientName: previewClient ? `${previewClient.name} ${previewClient.surname || ''}` : ''
  }, settings)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box lg">
        <div className="modal-title">{ev ? 'Editar' : 'Nuevo'} evento</div>
        <div className="fg"><label>Título *</label>
          <input maxLength={120} value={f.title} onChange={e => s('title', e.target.value)} placeholder="Perforación oreja · Andrea Mejía" />
        </div>
        <div className="fr">
          <div className="fg"><label>Tipo</label>
            <select value={f.type} onChange={e => s('type', e.target.value)}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="fg"><label>Estado</label>
            <select value={f.status} onChange={e => s('status', e.target.value)}>
              {STATUSES.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>
        <div className="fr">
          <div className="fg"><label>Inicio *</label>
            <input type="datetime-local" value={f.start_at} onChange={e => s('start_at', e.target.value)} />
          </div>
          <div className="fg"><label>Fin (opcional)</label>
            <input type="datetime-local" value={f.end_at} onChange={e => s('end_at', e.target.value)} />
          </div>
        </div>
        <div className="fg"><label>Cliente (opcional)</label>
          <select value={f.client_id} onChange={e => s('client_id', e.target.value)}>
            <option value="">— Sin cliente —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.surname}</option>)}
          </select>
        </div>
        <div className="fg"><label>Lugar</label>
          <input maxLength={200} value={f.location} onChange={e => s('location', e.target.value)} placeholder="Atelier · San Salvador" />
        </div>
        <div className="fg"><label>Notas</label>
          <textarea maxLength={1000} rows={3} value={f.notes} onChange={e => s('notes', e.target.value)} placeholder="Detalles del cliente, preferencias…" />
        </div>
        {err && <div style={{ color:'var(--danger)', fontSize:12, marginBottom:10 }}>{err}</div>}
        <div className="modal-actions" style={{ justifyContent:'space-between' }}>
          <a href={gcalUrl} target="_blank" rel="noreferrer"
             style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 16px', background:'#4285F4', color:'#fff', borderRadius:8, fontSize:12, textDecoration:'none', fontWeight:500 }}>
            📅 Agregar a Google Calendar
          </a>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-gold" onClick={submit}>Guardar evento</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Events() {
  const { events, clients, settings, saveEvent, deleteEvent, clientName, fdate } = useData()
  const [modal, setModal] = useState(null)
  const [filter, setFilter] = useState('upcoming')
  const [typeFilter, setTypeFilter] = useState('todos')

  const now = new Date()
  let list = events
  if (filter === 'upcoming')  list = list.filter(e => new Date(e.start_at) >= now && e.status !== 'cancelado')
  if (filter === 'past')      list = list.filter(e => new Date(e.start_at) < now)
  if (filter === 'cancelled') list = list.filter(e => e.status === 'cancelado')
  if (typeFilter !== 'todos') list = list.filter(e => e.type === typeFilter)

  const fmtDateTime = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-SV', { day:'2-digit', month:'short', year:'numeric' }) + ' · ' +
           d.toLocaleTimeString('es-SV', { hour:'2-digit', minute:'2-digit' })
  }

  const upcomingCount = events.filter(e => new Date(e.start_at) >= now && e.status !== 'cancelado').length

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt"><span>Eventos</span> · agenda</div>
          <div className="ps">{upcomingCount} próximo{upcomingCount!==1?'s':''} · citas, perforaciones y entregas</div>
        </div>
        <button className="btn btn-gold" onClick={() => setModal('new')}>+ Nuevo evento</button>
      </div>

      <div className="fb">
        <button className={`fi ${filter==='upcoming'?'active':''}`} onClick={() => setFilter('upcoming')}>Próximos ({upcomingCount})</button>
        <button className={`fi ${filter==='past'?'active':''}`} onClick={() => setFilter('past')}>Pasados</button>
        <button className={`fi ${filter==='cancelled'?'active':''}`} onClick={() => setFilter('cancelled')}>Cancelados</button>
        <button className={`fi ${filter==='all'?'active':''}`} onClick={() => setFilter('all')}>Todos</button>
        <span style={{ borderLeft:'1px solid rgba(0,0,0,.1)', paddingLeft:8, display:'flex', gap:6 }}>
          <button className={`fi ${typeFilter==='todos'?'active':''}`} onClick={() => setTypeFilter('todos')}>Todos los tipos</button>
          {TYPES.map(t => (
            <button key={t.value} className={`fi ${typeFilter===t.value?'active':''}`} onClick={() => setTypeFilter(t.value)}>{t.label}</button>
          ))}
        </span>
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'48px 20px', color:'var(--muted)' }}>
          <div style={{ fontSize:42, marginBottom:8 }}>◷</div>
          <div style={{ fontSize:14 }}>No hay eventos en este filtro</div>
          <button className="btn btn-gold" style={{ marginTop:18 }} onClick={() => setModal('new')}>+ Crear primer evento</button>
        </div>
      ) : (
        <div style={{ display:'grid', gap:10 }}>
          {list.map(e => {
            const dt = new Date(e.start_at)
            const ev = { ...e, clientName: clientName(e.client_id) === '—' ? '' : clientName(e.client_id) }
            const url = googleCalendarUrl(ev, settings)
            return (
              <div key={e.id} className="card" style={{ display:'grid', gridTemplateColumns:'80px 1fr auto', gap:18, alignItems:'center', padding:'14px 18px' }}>
                <div style={{ textAlign:'center', borderRight:'1px solid rgba(0,0,0,.07)', paddingRight:14 }}>
                  <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>{dt.toLocaleDateString('es-SV',{ month:'short' })}</div>
                  <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:32, color:'var(--gold)', lineHeight:1 }}>{dt.getDate()}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{dt.toLocaleTimeString('es-SV',{ hour:'2-digit', minute:'2-digit' })}</div>
                </div>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span className={`tag ${TYPE_COLOR[e.type]||'tg-gray'}`} style={{ fontSize:10 }}>{TYPE_LBL[e.type]||e.type}</span>
                    <strong style={{ fontSize:14 }}>{e.title}</strong>
                    {e.status === 'cancelado' && <span className="tag tg-r" style={{ fontSize:10 }}>cancelado</span>}
                    {e.status === 'completado' && <span className="tag tg-g" style={{ fontSize:10 }}>completado</span>}
                  </div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>
                    {clientName(e.client_id) !== '—' && <span>👤 {clientName(e.client_id)} · </span>}
                    {e.location && <span>📍 {e.location}</span>}
                  </div>
                  {e.notes && <div style={{ fontSize:12, color:'var(--mid)', marginTop:4, fontStyle:'italic' }}>{e.notes}</div>}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <a href={url} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ background:'#4285F4', color:'#fff', textDecoration:'none' }} title="Agregar a Google Calendar">📅</a>
                  <button className="btn btn-outline btn-sm" onClick={() => setModal(e)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('¿Eliminar evento?')) deleteEvent(e.id) }}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <EventModal
          ev={modal === 'new' ? null : modal}
          clients={clients}
          settings={settings}
          onSave={d => saveEvent(d, modal?.id || null)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
