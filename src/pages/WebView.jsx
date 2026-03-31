import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function WebView() {
  const [settings, setSettings] = useState({})
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [cat, setCat] = useState('todos')
  const [selected, setSelected] = useState(new Set())
  const [showQuote, setShowQuote] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [qErr, setQErr] = useState('')
  const [form, setForm] = useState({ name:'', surname:'', email:'', phone:'', instagram:'', message:'' })

  useEffect(() => {
    loadPublicData()
  }, [])

  const loadPublicData = async () => {
    const [{ data: s }, { data: c }, { data: p }] = await Promise.all([
      supabase.from('settings').select('*'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').eq('status', 'disponible').order('created_at')
    ])
    if (s) { const obj = {}; s.forEach(r => { obj[r.key] = r.value }); setSettings(obj) }
    if (c) setCategories(c)
    if (p) setProducts(p)
  }

  const usd = n => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const catName = id => categories.find(c => c.id === id)?.name || ''

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selProducts = products.filter(p => selected.has(p.id))
  const selTotal = selProducts.reduce((a, p) => a + Number(p.price), 0)
  const featured = products.filter(p => p.featured).slice(0, 5)
  const filtered = cat === 'todos' ? products : products.filter(p => p.cat_id === cat)

  const sf = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const submitQuote = async () => {
    if (!form.name || !form.email) { setQErr('Nombre y email son obligatorios'); return }
    setSubmitting(true); setQErr('')

    const prodNames = selProducts.map(p => `${p.name} (${usd(p.price)})`).join('\n')

    try {
      // 1. Create or find client
      let clientId = null
      const { data: existing } = await supabase.from('clients').select('id').eq('email', form.email.toLowerCase()).maybeSingle()
      if (existing) {
        clientId = existing.id
      } else {
        const { data: newClient } = await supabase.from('clients').insert({
          name: form.name.trim(), surname: form.surname.trim(), email: form.email.toLowerCase().trim(),
          phone: form.phone.trim(), instagram: form.instagram.trim(), segment: 'nuevo',
          source: 'web', notes: `Lead desde web · ${new Date().toLocaleDateString('es-SV')}`
        }).select('id').single()
        clientId = newClient?.id
      }

      // 2. Create opportunity
      if (clientId) {
        await supabase.from('opportunities').insert({
          client_id: clientId,
          title: `Web: ${selProducts.map(p => p.name).join(', ').slice(0, 60)}`,
          value: selTotal, stage: 'nueva',
          date: new Date().toISOString().slice(0, 10),
          notes: (form.message ? form.message + '\n\n' : '') + 'Productos consultados:\n' + prodNames
        })
      }

      // 3. Send email notification
      const key = settings.web3forms_key
      if (key) {
        const body = `NUEVA SOLICITUD WEB · ${settings.company || 'bybega'}\n\n` +
          `CLIENTE:\nNombre: ${form.name} ${form.surname}\nEmail: ${form.email}\nTeléfono: ${form.phone || '—'}\nInstagram: ${form.instagram || '—'}\n\n` +
          `PRODUCTOS CONSULTADOS:\n${prodNames}\nValor estimado: ${usd(selTotal)}\n\n` +
          `MENSAJE:\n${form.message || '(Sin mensaje)'}\n\n---\nOportunidad creada en el CRM automáticamente.`

        await fetch('https://api.web3forms.com/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: key,
            subject: `✦ Consulta web - ${form.name} - ${settings.company || 'bybega'}`,
            name: form.name, email: settings.notif_email || settings.email,
            replyto: form.email, message: body, botcheck: ''
          })
        })
      }

      setSubmitted(true)
      setSelected(new Set())
    } catch (e) {
      setQErr('Error al enviar. Intenta por WhatsApp.')
    }
    setSubmitting(false)
  }

  const wa = (settings.phone || '').replace(/\D/g, '')

  return (
    <div className="web-shell">
      {/* NAV */}
      <nav className="web-nav">
        <div className="web-logo">{settings.company || 'bybega'}</div>
        <div className="web-nav-links">
          <button onClick={() => document.getElementById('web-hero')?.scrollIntoView({ behavior: 'smooth' })}>Inicio</button>
          {featured.length > 0 && <button onClick={() => document.getElementById('web-featured')?.scrollIntoView({ behavior: 'smooth' })}>Destacados</button>}
          <button onClick={() => document.getElementById('web-catalog')?.scrollIntoView({ behavior: 'smooth' })}>Catálogo</button>
          <button onClick={() => document.getElementById('web-contact')?.scrollIntoView({ behavior: 'smooth' })}>Contacto</button>
        </div>
      </nav>

      {/* HERO */}
      <div id="web-hero" className="web-hero">
        <div className="web-hero-title">
          {(settings.slogan || 'Joyas que cuentan tu historia').split(' ').map((w, i, arr) =>
            i === Math.floor(arr.length / 2) ? <em key={i}>{w} </em> : w + ' '
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
          {(settings.company || 'bybega').toUpperCase()} · JOYERÍA ARTESANAL · EL SALVADOR
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <button className="web-cta web-cta-gold" onClick={() => document.getElementById('web-catalog')?.scrollIntoView({ behavior: 'smooth' })}>Ver colección</button>
          <button className="web-cta web-cta-outline" onClick={() => window.open(`https://wa.me/${wa}?text=Hola! Me gustaría ver el catálogo de bybega.`, '_blank')}>WhatsApp</button>
        </div>
      </div>

      {/* FEATURED */}
      {featured.length > 0 && (
        <div id="web-featured" className="web-section">
          <div className="web-section-title">Piezas Destacadas</div>
          <div className="web-section-sub">selección especial</div>
          <div className="web-divider" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 20 }}>
            {featured.map(p => (
              <div key={p.id} className={`web-card${selected.has(p.id) ? ' sel' : ''}`}>
                <div className="web-card-img">
                  {p.emoji}
                  <span className="web-feat-badge">★ Dest.</span>
                  {selected.has(p.id) && <span className="web-check">✓</span>}
                </div>
                <div className="web-card-body">
                  <div className="web-card-name">{p.name}</div>
                  <div className="web-card-mat">{p.material}</div>
                  <div className="web-card-price">{usd(p.price)}</div>
                  <button className={`web-card-btn${selected.has(p.id) ? ' sel-active' : ''}`} onClick={() => toggle(p.id)}>
                    {selected.has(p.id) ? '✓ Seleccionado' : 'Seleccionar para cotización'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CATALOG */}
      <div id="web-catalog" className="web-section">
        <div className="web-section-title">Catálogo Completo</div>
        <div className="web-section-sub">{products.length} piezas disponibles · selecciona varias para cotizar juntas</div>
        <div className="web-divider" />
        <div className="web-cats">
          <button className={`web-cat-btn${cat === 'todos' ? ' active' : ''}`} onClick={() => setCat('todos')}>Todos ({products.length})</button>
          {categories.map(c => {
            const cnt = products.filter(p => p.cat_id === c.id).length
            return cnt > 0 ? (
              <button key={c.id} className={`web-cat-btn${cat === c.id ? ' active' : ''}`} onClick={() => setCat(c.id)}>
                {c.name} ({cnt})
              </button>
            ) : null
          })}
        </div>
        <div className="web-grid">
          {filtered.map(p => (
            <div key={p.id} className={`web-card${selected.has(p.id) ? ' sel' : ''}`}>
              <div className="web-card-img">
                {p.emoji}
                {p.featured && <span className="web-feat-badge">★ Dest.</span>}
                {selected.has(p.id) && <span className="web-check">✓</span>}
              </div>
              <div className="web-card-body">
                <div className="web-card-name">{p.name}</div>
                <div className="web-card-mat">{p.material} · {catName(p.cat_id)}</div>
                <div className="web-card-price">{usd(p.price)}</div>
                <button className={`web-card-btn${selected.has(p.id) ? ' sel-active' : ''}`} onClick={() => toggle(p.id)}>
                  {selected.has(p.id) ? '✓ Seleccionado' : 'Seleccionar para cotización'}
                </button>
                <button className="web-card-btn" style={{ opacity: .7, marginTop: 4 }} onClick={() => window.open(`https://wa.me/${wa}?text=${encodeURIComponent(`Hola! Me interesa "${p.name}" de bybega. ¿Está disponible?`)}`, '_blank')}>
                  Consultar por WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CONTACT */}
      <div id="web-contact" className="web-section" style={{ maxWidth: 560 }}>
        <div className="web-section-title">Contacto</div>
        <div className="web-section-sub">escríbenos directamente</div>
        <div className="web-divider" />
        <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 2 }}>
          {settings.email}<br />{settings.phone}<br />
          {settings.instagram}<br />{settings.address}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="web-footer">
        <div>
          <div className="web-footer-logo">{settings.company || 'bybega'}</div>
          <div className="web-footer-sub">{settings.slogan}<br />{settings.address}</div>
        </div>
        <div>
          <div className="web-footer-title">Contacto</div>
          <div className="web-footer-link">{settings.email}</div>
          <div className="web-footer-link">{settings.phone}</div>
          <div className="web-footer-link">{settings.instagram}</div>
        </div>
        <div>
          <div className="web-footer-title">Colecciones</div>
          {categories.map(c => <div key={c.id} className="web-footer-link">{c.name}</div>)}
        </div>
      </footer>

      {/* SELECTION BAR */}
      {selected.size > 0 && !showQuote && (
        <div className="web-sel-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--gold)', fontFamily: 'Cormorant Garamond, serif', fontSize: 20 }}>{selected.size} producto{selected.size !== 1 ? 's' : ''}</span>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>seleccionados · {usd(selTotal)}</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setSelected(new Set())} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.15)', color: 'var(--muted)', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>Limpiar</button>
            <button className="web-cta web-cta-gold" style={{ padding: '10px 24px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500 }} onClick={() => { setShowQuote(true); setSubmitted(false); setForm({ name:'', surname:'', email:'', phone:'', instagram:'', message:'' }) }}>
              Solicitar cotización →
            </button>
          </div>
        </div>
      )}

      {/* QUOTE FORM OVERLAY */}
      {showQuote && (
        <div className="qf-overlay">
          <div className="qf-inner">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <button onClick={() => setShowQuote(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>← Volver al catálogo</button>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: 'var(--gold)', letterSpacing: 2 }}>{settings.company || 'bybega'}</div>
            </div>

            {!submitted ? (
              <>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, color: '#fff', fontWeight: 300, marginBottom: 4 }}>Tu solicitud de cotización</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 28 }}>Te respondemos en menos de 24 horas</div>

                {/* Selected products */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Productos seleccionados</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 }}>
                    {selProducts.map(p => (
                      <div key={p.id} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: 28, marginBottom: 4 }}>{p.emoji}</div>
                        <div style={{ fontSize: 12, color: '#ccc', fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, color: 'var(--gold)', marginTop: 3 }}>{usd(p.price)}</div>
                        <button onClick={() => toggle(p.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer', marginTop: 4 }}>✕ Quitar</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(184,151,74,.08)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Valor estimado total</span>
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: 'var(--gold)' }}>{usd(selTotal)}</span>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>Tus datos de contacto</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div><label className="qf-label">Nombre *</label><input className="qf-input" value={form.name} onChange={e => sf('name', e.target.value)} placeholder="Tu nombre" /></div>
                  <div><label className="qf-label">Apellido</label><input className="qf-input" value={form.surname} onChange={e => sf('surname', e.target.value)} placeholder="Tu apellido" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div><label className="qf-label">Email *</label><input className="qf-input" type="email" value={form.email} onChange={e => sf('email', e.target.value)} placeholder="tu@email.com" /></div>
                  <div><label className="qf-label">Teléfono / WhatsApp</label><input className="qf-input" value={form.phone} onChange={e => sf('phone', e.target.value)} placeholder="+503 7000-0000" /></div>
                </div>
                <div style={{ marginBottom: 14 }}><label className="qf-label">Instagram (opcional)</label><input className="qf-input" value={form.instagram} onChange={e => sf('instagram', e.target.value)} placeholder="@tuusuario" /></div>
                <div style={{ marginBottom: 24 }}><label className="qf-label">Mensaje (opcional)</label><textarea className="qf-input" rows={3} value={form.message} onChange={e => sf('message', e.target.value)} placeholder="Ej: Es un regalo de aniversario, me gustaría personalizar el grabado…" style={{ resize: 'vertical' }} /></div>

                {qErr && <div style={{ color: '#e57373', fontSize: 12, marginBottom: 10 }}>{qErr}</div>}
                <button onClick={submitQuote} disabled={submitting} style={{ width: '100%', background: 'var(--gold)', color: 'var(--dark)', border: 'none', padding: 15, borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: submitting ? .7 : 1 }}>
                  {submitting ? 'Enviando…' : 'Enviar solicitud de cotización →'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: 'var(--muted)' }}>Al enviar aceptas que nos contactemos contigo para responder tu consulta.</div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, color: 'var(--gold)', marginBottom: 10 }}>¡Solicitud enviada!</div>
                <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.8, maxWidth: 400, margin: '0 auto' }}>
                  Hemos recibido tu consulta y te responderemos en menos de 24 horas. Revisa también tu correo.
                </div>
                <button onClick={() => setShowQuote(false)} style={{ marginTop: 32, background: 'var(--gold)', color: 'var(--dark)', border: 'none', padding: '12px 28px', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Seguir explorando →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WHATSAPP FAB */}
      <a className="web-wa" href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola! Me gustaría ver el catálogo de bybega.')}`} target="_blank" rel="noreferrer" style={{ bottom: selected.size > 0 && !showQuote ? 90 : 24 }}>💬</a>
    </div>
  )
}
