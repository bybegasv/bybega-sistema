import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

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
  const [contactForm, setContactForm] = useState({ name:'', email:'', phone:'', message:'' })
  const [menuOpen, setMenuOpen] = useState(false)
  const [carouselIdx, setCarouselIdx] = useState({})
  const [contactSent, setContactSent] = useState(false)
  const [contactSending, setContactSending] = useState(false)
  const [contactErr, setContactErr] = useState('')
  const [loadErr, setLoadErr] = useState(false)

  useEffect(() => { loadPublicData() }, [])

  const loadPublicData = async () => {
    try {
      const [{ data: s, error: sErr }, { data: c, error: cErr }, { data: p, error: pErr }] = await Promise.all([
        supabase.from('settings').select('key,value'),
        supabase.from('categories').select('id,name,sort_order').order('sort_order'),
        supabase.from('products')
          .select('id,name,ref,cat_id,price,original_price,material,description,emoji,featured,images,image_url')
          .eq('status', 'disponible')
          .order('created_at')
      ])
      if (sErr || cErr || pErr) { setLoadErr(true); return }
      if (s) { const obj = {}; s.forEach(r => { obj[r.key] = r.value }); setSettings(obj) }
      if (c) setCategories(c)
      if (p) setProducts(p)
    } catch {
      setLoadErr(true)
    }
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

  const sendWeb3Forms = async (key, payload) => {
    const r = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ access_key: key, botcheck: '', ...payload })
    })
    if (!r.ok) throw new Error('http_' + r.status)
    const data = await r.json().catch(() => ({}))
    if (!data?.success) throw new Error(data?.message || 'web3forms_failed')
    return data
  }

  const submitQuote = async () => {
    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()
    if (!name) { setQErr('Tu nombre es obligatorio'); return }
    if (!EMAIL_RE.test(email)) { setQErr('Email no válido'); return }
    setSubmitting(true); setQErr('')

    const prodNames = selProducts.map(p => `${p.name} (${usd(p.price)})`).join('\n')

    try {
      let clientId = null
      const { data: existing } = await supabase.from('clients').select('id').eq('email', email).maybeSingle()
      if (existing) {
        clientId = existing.id
      } else {
        const { data: newClient, error: cErr } = await supabase.from('clients').insert({
          name, surname: form.surname.trim(), email,
          phone: form.phone.trim(), instagram: form.instagram.trim(), segment: 'nuevo',
          source: 'web', notes: `Lead desde web · ${new Date().toLocaleDateString('es-SV')}`
        }).select('id').single()
        if (cErr) throw cErr
        clientId = newClient?.id
      }

      if (clientId) {
        await supabase.from('opportunities').insert({
          client_id: clientId,
          title: `Web: ${selProducts.map(p => p.name).join(', ').slice(0, 60)}`,
          value: selTotal, stage: 'nueva',
          date: new Date().toISOString().slice(0, 10),
          notes: (form.message ? form.message + '\n\n' : '') + 'Productos consultados:\n' + prodNames
        })
      }

      const key = settings.web3forms_key
      if (key) {
        const body = `NUEVA SOLICITUD WEB · ${settings.company || 'bybega'}\n\n` +
          `CLIENTE:\nNombre: ${name} ${form.surname.trim()}\nEmail: ${email}\nTeléfono: ${form.phone.trim() || '—'}\nInstagram: ${form.instagram.trim() || '—'}\n\n` +
          `PRODUCTOS CONSULTADOS:\n${prodNames}\nValor estimado: ${usd(selTotal)}\n\n` +
          `MENSAJE:\n${form.message || '(Sin mensaje)'}\n\n---\nOportunidad creada en el CRM automáticamente.`

        try {
          await sendWeb3Forms(key, {
            subject: `✦ Consulta web - ${name} - ${settings.company || 'bybega'}`,
            name, email: settings.notif_email || settings.email,
            replyto: email, message: body
          })
        } catch {
          // El cliente y oportunidad sí se crearon. Solo el email falló.
          // No bloqueamos la confirmación al usuario, pero log queda en consola.
          console.warn('Email notification failed; lead saved in CRM')
        }
      }

      setSubmitted(true)
      setSelected(new Set())
    } catch (e) {
      setQErr('Hubo un error al enviar tu solicitud. Por favor intenta por WhatsApp.')
    }
    setSubmitting(false)
  }

  const submitContactForm = async () => {
    const name = contactForm.name.trim()
    const email = contactForm.email.trim().toLowerCase()
    const message = contactForm.message.trim()
    if (!name) { setContactErr('Tu nombre es obligatorio'); return }
    if (!EMAIL_RE.test(email)) { setContactErr('Email no válido'); return }
    if (!message) { setContactErr('Escribe un mensaje'); return }
    setContactSending(true); setContactErr('')

    try {
      let clientId = null
      const { data: existing } = await supabase.from('clients').select('id').eq('email', email).maybeSingle()
      if (existing) {
        clientId = existing.id
      } else {
        const { data: newClient, error: cErr } = await supabase.from('clients').insert({
          name, email, phone: contactForm.phone.trim(),
          segment: 'nuevo', source: 'web',
          notes: `Contacto directo desde web · ${new Date().toLocaleDateString('es-SV')}`
        }).select('id').single()
        if (cErr) throw cErr
        clientId = newClient?.id
      }

      if (clientId) {
        await supabase.from('opportunities').insert({
          client_id: clientId,
          title: `Consulta web: ${message.slice(0, 50)}`,
          value: 0, stage: 'nueva',
          date: new Date().toISOString().slice(0, 10),
          notes: message
        })
      }

      const key = settings.web3forms_key
      if (key) {
        try {
          await sendWeb3Forms(key, {
            subject: `✦ Mensaje web - ${name} - ${settings.company || 'bybega'}`,
            name, email: settings.notif_email || settings.email,
            replyto: email,
            message: `MENSAJE DESDE LA WEB · ${settings.company || 'bybega'}\n\nNombre: ${name}\nEmail: ${email}\nTeléfono: ${contactForm.phone.trim() || '—'}\n\nMensaje:\n${message}\n\n---\nCliente y oportunidad creados automáticamente en el CRM.`
          })
        } catch {
          console.warn('Email notification failed; contact saved in CRM')
        }
      }
      setContactSent(true)
    } catch {
      setContactErr('Hubo un error al enviar el mensaje. Intenta por WhatsApp.')
    }
    setContactSending(false)
  }

  const wa = (settings.phone || '').replace(/\D/g, '')

  const renderImg = (p) => {
    const imgs = p.images?.length ? p.images : (p.image_url ? [p.image_url] : [])
    const idx = carouselIdx[p.id] || 0
    if (!imgs.length) return <span style={{ fontSize:52 }}>{p.emoji}</span>
    return (
      <>
        <img src={imgs[idx]} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        {imgs.length > 1 && (
          <>
            <button onClick={e => { e.stopPropagation(); setCarouselIdx(ci => ({...ci, [p.id]: (idx - 1 + imgs.length) % imgs.length})) }} aria-label="Anterior"
              style={{ position:'absolute', left:6, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,.5)', color:'#fff', border:'none', borderRadius:'50%', width:24, height:24, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
            <button onClick={e => { e.stopPropagation(); setCarouselIdx(ci => ({...ci, [p.id]: (idx + 1) % imgs.length})) }} aria-label="Siguiente"
              style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,.5)', color:'#fff', border:'none', borderRadius:'50%', width:24, height:24, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
            <div style={{ position:'absolute', bottom:6, left:'50%', transform:'translateX(-50%)', display:'flex', gap:4 }}>
              {imgs.map((_,i) => <div key={i} style={{ width:5, height:5, borderRadius:'50%', background: i===idx?'#fff':'rgba(255,255,255,.4)' }} />)}
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <div className="web-shell">
      <nav className="web-nav" style={{ position:'sticky', top:0, zIndex:20 }}>
        <div className="web-logo">{settings.company || 'bybega'}</div>
        <div className="web-nav-links" style={{ display:'flex' }}>
          <button onClick={() => document.getElementById('web-hero')?.scrollIntoView({ behavior:'smooth' })}>Inicio</button>
          {featured.length > 0 && <button onClick={() => document.getElementById('web-featured')?.scrollIntoView({ behavior:'smooth' })}>Destacados</button>}
          <button onClick={() => document.getElementById('web-catalog')?.scrollIntoView({ behavior:'smooth' })}>Catálogo</button>
          <button onClick={() => document.getElementById('web-contact')?.scrollIntoView({ behavior:'smooth' })}>Contacto</button>
        </div>
        <button onClick={() => setMenuOpen(p => !p)} aria-label="Menú" style={{ display:'none', background:'none', border:'none', color:'var(--gold)', fontSize:22, cursor:'pointer', padding:'0 4px', fontFamily:'monospace' }} className="web-hamburger">
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>
      {menuOpen && (
        <div style={{ background:'var(--dark2)', borderBottom:'1px solid var(--border)', padding:'12px 24px', display:'flex', flexDirection:'column', gap:2, position:'sticky', top:57, zIndex:19 }}>
          {[['web-hero','Inicio'],['web-featured','Destacados'],['web-catalog','Catálogo'],['web-contact','Contacto']].map(([id,label]) => (
            <button key={id} onClick={() => { document.getElementById(id)?.scrollIntoView({ behavior:'smooth' }); setMenuOpen(false) }}
              style={{ background:'none', border:'none', color:'var(--muted)', fontSize:14, cursor:'pointer', fontFamily:'DM Sans,sans-serif', padding:'10px 0', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
              {label}
            </button>
          ))}
        </div>
      )}

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
        {loadErr && <div style={{ color:'#e57373', fontSize:12, marginTop:16 }}>No pudimos cargar el catálogo. Por favor recarga la página.</div>}
      </div>

      {featured.length > 0 && (
        <div id="web-featured" className="web-section">
          <div className="web-section-title">Piezas Destacadas</div>
          <div className="web-section-sub">selección especial</div>
          <div className="web-divider" />
          <div className="web-featured-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 20 }}>
            {featured.map(p => (
              <div key={p.id} className={`web-card${selected.has(p.id) ? ' sel' : ''}`}>
                <div className="web-card-img" style={{ padding:0, overflow:'hidden', position:'relative' }}>
                  {renderImg(p)}
                  <span className="web-feat-badge">★ Dest.</span>
                  {selected.has(p.id) && <span className="web-check">✓</span>}
                </div>
                <div className="web-card-body">
                  <div className="web-card-name">{p.name}</div>
                  <div className="web-card-mat">{p.material}</div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:8, flexWrap:'wrap' }}>
                    {p.original_price && Number(p.original_price) > Number(p.price) && <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:16, color:'rgba(255,255,255,.35)', textDecoration:'line-through' }}>{usd(p.original_price)}</span>}
                    <span className="web-card-price" style={{ marginTop:0 }}>{usd(p.price)}</span>
                    {p.original_price && Number(p.original_price) > Number(p.price) && <span style={{ background:'rgba(192,57,43,.7)', color:'#fff', fontSize:10, padding:'2px 6px', borderRadius:4, fontWeight:500 }}>-{Math.round((1-p.price/p.original_price)*100)}%</span>}
                  </div>
                  <button className={`web-card-btn${selected.has(p.id) ? ' sel-active' : ''}`} onClick={() => toggle(p.id)}>
                    {selected.has(p.id) ? '✓ Seleccionado' : 'Seleccionar para cotización'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <div className="web-card-img" style={{ padding:0, overflow:'hidden', position:'relative' }}>
                {renderImg(p)}
                {p.featured && <span className="web-feat-badge">★ Dest.</span>}
                {selected.has(p.id) && <span className="web-check">✓</span>}
              </div>
              <div className="web-card-body">
                <div className="web-card-name">{p.name}</div>
                <div className="web-card-mat">{p.material} · {catName(p.cat_id)}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:8, flexWrap:'wrap' }}>
                  {p.original_price && Number(p.original_price) > Number(p.price) && <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:16, color:'rgba(255,255,255,.35)', textDecoration:'line-through' }}>{usd(p.original_price)}</span>}
                  <span className="web-card-price" style={{ marginTop:0 }}>{usd(p.price)}</span>
                  {p.original_price && Number(p.original_price) > Number(p.price) && <span style={{ background:'rgba(192,57,43,.7)', color:'#fff', fontSize:10, padding:'2px 6px', borderRadius:4, fontWeight:500 }}>-{Math.round((1-p.price/p.original_price)*100)}%</span>}
                </div>
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

      <div id="web-contact" className="web-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
          <div>
            <div className="web-section-title">Contáctanos</div>
            <div className="web-section-sub">respuesta en menos de 24h</div>
            <div className="web-divider" />
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 2.2 }}>
              {settings.email && <div>✉ {settings.email}</div>}
              {settings.phone && <div>📱 {settings.phone}</div>}
              {settings.instagram && <div>📷 {settings.instagram}</div>}
              {settings.address && <div>📍 {settings.address}</div>}
            </div>
            <button
              onClick={() => window.open(`https://wa.me/${wa}?text=${encodeURIComponent('Hola! Me gustaría consultar sobre sus joyas.')}`, '_blank')}
              style={{ marginTop: 20, background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
            >
              💬 Escribir por WhatsApp
            </button>
          </div>
          <div>
            <div className="web-section-title">Envíanos un mensaje</div>
            <div className="web-section-sub">también puedes escribirnos aquí</div>
            <div className="web-divider" />
            {contactSent ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✦</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: 'var(--gold)', marginBottom: 8 }}>¡Mensaje enviado!</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Te responderemos pronto.</div>
                <button onClick={() => { setContactSent(false); setContactForm({ name:'', email:'', phone:'', message:'' }) }}
                  style={{ marginTop: 16, background: 'transparent', border: '1px solid rgba(184,151,74,.4)', color: 'var(--gold)', padding: '8px 18px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="qf-label">Nombre *</label>
                    <input className="qf-input" maxLength={80} value={contactForm.name} onChange={e => setContactForm(p => ({...p, name: e.target.value}))} placeholder="Tu nombre" />
                  </div>
                  <div>
                    <label className="qf-label">Teléfono</label>
                    <input className="qf-input" maxLength={30} value={contactForm.phone} onChange={e => setContactForm(p => ({...p, phone: e.target.value}))} placeholder="+503 7000-0000" />
                  </div>
                </div>
                <div>
                  <label className="qf-label">Email *</label>
                  <input className="qf-input" type="email" maxLength={120} value={contactForm.email} onChange={e => setContactForm(p => ({...p, email: e.target.value}))} placeholder="tu@email.com" />
                </div>
                <div>
                  <label className="qf-label">Mensaje *</label>
                  <textarea className="qf-input" maxLength={1500} rows={3} value={contactForm.message} onChange={e => setContactForm(p => ({...p, message: e.target.value}))} placeholder="¿En qué podemos ayudarte?" style={{ resize: 'vertical' }} />
                </div>
                {contactErr && <div style={{ color: '#e57373', fontSize: 12 }}>{contactErr}</div>}
                <button onClick={submitContactForm} disabled={contactSending}
                  style={{ background: 'var(--gold)', color: 'var(--dark)', border: 'none', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: contactSending ? .7 : 1 }}>
                  {contactSending ? 'Enviando…' : 'Enviar mensaje →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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

      {selected.size > 0 && !showQuote && (
        <div className="web-sel-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--gold)', fontFamily: 'Cormorant Garamond, serif', fontSize: 20 }}>{selected.size} producto{selected.size !== 1 ? 's' : ''}</span>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>seleccionados · {usd(selTotal)}</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setSelected(new Set())} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.15)', color: 'var(--muted)', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>Limpiar</button>
            <button className="web-cta web-cta-gold" style={{ padding: '10px 24px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500, background: 'var(--gold)', color: 'var(--dark)' }} onClick={() => { setShowQuote(true); setSubmitted(false); setForm({ name:'', surname:'', email:'', phone:'', instagram:'', message:'' }) }}>
              Solicitar cotización →
            </button>
          </div>
        </div>
      )}

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
                  <div><label className="qf-label">Nombre *</label><input className="qf-input" maxLength={80} value={form.name} onChange={e => sf('name', e.target.value)} placeholder="Tu nombre" /></div>
                  <div><label className="qf-label">Apellido</label><input className="qf-input" maxLength={80} value={form.surname} onChange={e => sf('surname', e.target.value)} placeholder="Tu apellido" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div><label className="qf-label">Email *</label><input className="qf-input" type="email" maxLength={120} value={form.email} onChange={e => sf('email', e.target.value)} placeholder="tu@email.com" /></div>
                  <div><label className="qf-label">Teléfono / WhatsApp</label><input className="qf-input" maxLength={30} value={form.phone} onChange={e => sf('phone', e.target.value)} placeholder="+503 7000-0000" /></div>
                </div>
                <div style={{ marginBottom: 14 }}><label className="qf-label">Instagram (opcional)</label><input className="qf-input" maxLength={60} value={form.instagram} onChange={e => sf('instagram', e.target.value)} placeholder="@tuusuario" /></div>
                <div style={{ marginBottom: 24 }}><label className="qf-label">Mensaje (opcional)</label><textarea className="qf-input" maxLength={1500} rows={3} value={form.message} onChange={e => sf('message', e.target.value)} placeholder="Ej: Es un regalo de aniversario, me gustaría personalizar el grabado…" style={{ resize: 'vertical' }} /></div>

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

      <a className="web-wa" href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola! Me gustaría ver el catálogo de bybega.')}`} target="_blank" rel="noreferrer" style={{ bottom: selected.size > 0 && !showQuote ? 90 : 24 }} aria-label="WhatsApp">💬</a>
    </div>
  )
}
