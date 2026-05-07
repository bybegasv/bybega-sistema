import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const PAY_LBL = { cash: 'Efectivo (contra entrega)', transfer: 'Transferencia bancaria', paypal: 'PayPal', card: 'Tarjeta' }
const PAY_ICON = { cash: '💵', transfer: '🏦', paypal: '🅿️', card: '💳' }

export default function WebView() {
  const [settings, setSettings] = useState({})
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [cat, setCat] = useState('todos')
  const [selected, setSelected] = useState({})    // { id: qty }
  const [showCart, setShowCart] = useState(false)
  const [submitted, setSubmitted] = useState(null) // null | { method, orderNum, total }
  const [submitting, setSubmitting] = useState(false)
  const [qErr, setQErr] = useState('')
  const [form, setForm] = useState({ name:'', surname:'', email:'', phone:'', instagram:'', message:'', shipping_addr:'', payment_method:'' })
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
          .select('id,name,ref,cat_id,price,original_price,material,description,emoji,featured,images,image_url,stock_total')
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

  const isOrderMode = (settings.web_mode || 'pedido') === 'pedido'
  const ctaLabel = isOrderMode ? 'Realizar pedido' : 'Solicitar cotización'
  const cartLabel = isOrderMode ? 'Tu pedido' : 'Tu cotización'
  const addBtnLabel = (sel) => sel ? '✓ En el pedido' : (isOrderMode ? 'Añadir al pedido' : 'Seleccionar para cotización')

  // Métodos disponibles según settings
  const availableMethods = []
  if (settings.pay_cash_enabled === 'true')     availableMethods.push('cash')
  if (settings.pay_transfer_enabled === 'true') availableMethods.push('transfer')
  if (settings.pay_paypal_enabled === 'true')   availableMethods.push('paypal')
  if (settings.pay_card_enabled === 'true')     availableMethods.push('card')

  const toggle = (id) => {
    setSelected(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = 1
      return next
    })
  }
  const setQty = (id, q) => {
    setSelected(prev => {
      const next = { ...prev }
      const qty = Math.max(1, parseInt(q) || 1)
      if (next[id] !== undefined) next[id] = qty
      return next
    })
  }

  const selProducts = products.filter(p => selected[p.id]).map(p => ({ ...p, qty: selected[p.id] }))
  const selTotal = selProducts.reduce((a, p) => a + (Number(p.price) * p.qty), 0)
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

  const submitOrder = async () => {
    const name = form.name.trim()
    const surname = form.surname.trim()
    const email = form.email.trim().toLowerCase()
    const phone = form.phone.trim()
    if (!name) return setQErr('Tu nombre es obligatorio')
    if (isOrderMode && !surname) return setQErr('Apellido obligatorio')
    if (isOrderMode && !phone) return setQErr('Teléfono obligatorio')
    if (!EMAIL_RE.test(email)) return setQErr('Email no válido')
    if (isOrderMode && availableMethods.length > 0 && !form.payment_method) return setQErr('Selecciona un método de pago')
    setSubmitting(true); setQErr('')

    const prodNames = selProducts.map(p => `${p.name} x${p.qty} (${usd(Number(p.price) * p.qty)})`).join('\n')

    try {
      // 1) Cliente
      let clientId = null
      const { data: existing } = await supabase.from('clients').select('id').eq('email', email).maybeSingle()
      if (existing) {
        clientId = existing.id
      } else {
        const { data: newClient, error: cErr } = await supabase.from('clients').insert({
          name, surname, email, phone, instagram: form.instagram.trim(),
          shipping_addr: form.shipping_addr.trim(),
          segment: 'nuevo', source: 'web',
          notes: `Lead desde web · ${new Date().toLocaleDateString('es-SV')}`
        }).select('id').single()
        if (cErr) throw cErr
        clientId = newClient?.id
      }

      // 2) Oportunidad
      if (clientId) {
        await supabase.from('opportunities').insert({
          client_id: clientId,
          title: `Web: ${selProducts.map(p => p.name).join(', ').slice(0, 60)}`,
          value: selTotal, stage: 'nueva',
          date: new Date().toISOString().slice(0, 10),
          notes: (form.message ? form.message + '\n\n' : '') + 'Productos:\n' + prodNames
        })
      }

      // 3) Order (solo en modo pedido)
      let orderNum = null
      if (isOrderMode && clientId) {
        const items = selProducts.map(p => ({
          product_id: p.id, name: p.name, price: Number(p.price), qty: p.qty, sub: Number(p.price) * p.qty
        }))
        const { data: newOrder, error: oErr } = await supabase.from('orders').insert({
          client_id: clientId,
          items,
          subtotal: selTotal,
          iva_rate: 0,
          iva_amt: 0,
          total: selTotal,
          status: 'pendiente',
          date: new Date().toISOString().slice(0, 10),
          notes: form.message || '',
          shipping_addr: form.shipping_addr.trim(),
          payment_method: form.payment_method,
          source: 'web'
        }).select('id').single()
        if (!oErr && newOrder) orderNum = newOrder.id
      }

      // 4) Email de aviso
      const key = settings.web3forms_key
      if (key) {
        const subject = isOrderMode
          ? `🛒 NUEVO PEDIDO web #${orderNum ? String(orderNum).padStart(3,'0') : '?'} - ${name} - ${settings.company || 'bybega'}`
          : `✦ Consulta web - ${name} - ${settings.company || 'bybega'}`
        const body = `${isOrderMode ? 'NUEVO PEDIDO DESDE WEB' : 'NUEVA SOLICITUD WEB'} · ${settings.company || 'bybega'}\n\n` +
          `CLIENTE:\nNombre: ${name} ${surname}\nEmail: ${email}\nTeléfono: ${phone || '—'}\nInstagram: ${form.instagram || '—'}\n` +
          (isOrderMode ? `Dirección: ${form.shipping_addr || '—'}\nMétodo de pago: ${PAY_LBL[form.payment_method] || form.payment_method}\n` : '') +
          `\nPRODUCTOS:\n${prodNames}\nTotal: ${usd(selTotal)}\n\n` +
          `MENSAJE:\n${form.message || '(sin mensaje)'}\n\n---\n${isOrderMode ? `Pedido #${orderNum} creado en estado PENDIENTE.` : 'Oportunidad creada en CRM.'}`

        try {
          await sendWeb3Forms(key, {
            subject, name, email: settings.notif_email || settings.email,
            replyto: email, message: body
          })
        } catch {
          console.warn('Email failed; data saved')
        }
      }

      setSubmitted({ method: form.payment_method, orderNum, total: selTotal })
      setSelected({})
    } catch (e) {
      setQErr('Hubo un error al enviar. Por favor intenta por WhatsApp.')
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
            message: `MENSAJE WEB · ${settings.company || 'bybega'}\n\nNombre: ${name}\nEmail: ${email}\nTeléfono: ${contactForm.phone.trim() || '—'}\n\nMensaje:\n${message}`
          })
        } catch { /* swallow */ }
      }
      setContactSent(true)
    } catch {
      setContactErr('Hubo un error. Intenta por WhatsApp.')
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

  const selCount = Object.keys(selected).length

  // Pantalla de confirmación tras enviar pedido
  if (submitted) {
    const m = submitted.method
    return (
      <div className="qf-overlay" style={{ overflowY:'auto' }}>
        <div className="qf-inner" style={{ paddingTop:60 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>✦</div>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:32, color:'var(--gold)', marginBottom:10 }}>
              {isOrderMode ? '¡Pedido recibido!' : '¡Solicitud enviada!'}
            </div>
            {isOrderMode && submitted.orderNum && (
              <div style={{ fontSize:14, color:'var(--muted)', marginBottom:20 }}>
                Pedido <strong style={{ color:'var(--gold-l)' }}>#{String(submitted.orderNum).padStart(3,'0')}</strong> · Total {usd(submitted.total)}
              </div>
            )}
          </div>

          {isOrderMode && m === 'transfer' && (
            <div style={{ background:'rgba(184,151,74,.08)', border:'1px solid var(--border)', borderRadius:10, padding:24, marginBottom:20 }}>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, color:'var(--gold)', marginBottom:14 }}>🏦 Datos para transferencia</div>
              <div style={{ fontSize:14, lineHeight:2.2, color:'#ddd' }}>
                <div>Banco: <strong style={{ color:'#fff' }}>{settings.bank_name || '—'}</strong></div>
                <div>Titular: <strong style={{ color:'#fff' }}>{settings.bank_holder || '—'}</strong></div>
                <div>Cuenta ({settings.bank_type || '—'}): <strong style={{ color:'#fff' }}>{settings.bank_account || '—'}</strong></div>
                <div>Referencia: <strong style={{ color:'#fff' }}>Pedido #{submitted.orderNum && String(submitted.orderNum).padStart(3,'0')}</strong></div>
                <div>Monto: <strong style={{ color:'var(--gold-l)' }}>{usd(submitted.total)}</strong></div>
              </div>
              <div style={{ marginTop:14, fontSize:12, color:'var(--muted)' }}>
                Tras transferir, envíanos el comprobante por WhatsApp citando el pedido <strong>#{submitted.orderNum && String(submitted.orderNum).padStart(3,'0')}</strong>.
              </div>
            </div>
          )}

          {isOrderMode && m === 'paypal' && settings.paypal_link && (
            <div style={{ background:'rgba(184,151,74,.08)', border:'1px solid var(--border)', borderRadius:10, padding:24, marginBottom:20, textAlign:'center' }}>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, color:'var(--gold)', marginBottom:14 }}>🅿️ Pagar con PayPal</div>
              <a href={settings.paypal_link.startsWith('http') ? settings.paypal_link : `https://paypal.me/${settings.paypal_link}`} target="_blank" rel="noreferrer"
                 style={{ display:'inline-block', padding:'12px 28px', background:'#0070ba', color:'#fff', borderRadius:8, fontSize:14, fontWeight:500, textDecoration:'none' }}>
                Ir a PayPal · {usd(submitted.total)}
              </a>
              <div style={{ marginTop:12, fontSize:12, color:'var(--muted)' }}>Indica en el concepto: Pedido #{submitted.orderNum && String(submitted.orderNum).padStart(3,'0')}</div>
            </div>
          )}

          {isOrderMode && m === 'card' && settings.card_link && (
            <div style={{ background:'rgba(184,151,74,.08)', border:'1px solid var(--border)', borderRadius:10, padding:24, marginBottom:20, textAlign:'center' }}>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, color:'var(--gold)', marginBottom:14 }}>💳 Pagar con tarjeta</div>
              <a href={settings.card_link} target="_blank" rel="noreferrer"
                 style={{ display:'inline-block', padding:'12px 28px', background:'var(--gold)', color:'var(--dark)', borderRadius:8, fontSize:14, fontWeight:500, textDecoration:'none' }}>
                Ir al pago · {usd(submitted.total)}
              </a>
              <div style={{ marginTop:12, fontSize:12, color:'var(--muted)' }}>Indica en el concepto: Pedido #{submitted.orderNum && String(submitted.orderNum).padStart(3,'0')}</div>
            </div>
          )}

          {isOrderMode && m === 'cash' && (
            <div style={{ background:'rgba(184,151,74,.08)', border:'1px solid var(--border)', borderRadius:10, padding:24, marginBottom:20 }}>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, color:'var(--gold)', marginBottom:10 }}>💵 Pago contra entrega</div>
              <div style={{ fontSize:14, color:'#ddd', lineHeight:1.7 }}>
                Tu pedido fue recibido. Te contactaremos por WhatsApp para coordinar la entrega y el cobro en efectivo.
              </div>
            </div>
          )}

          <div style={{ fontSize:14, color:'var(--muted)', lineHeight:1.8, maxWidth:520, margin:'0 auto', textAlign:'center' }}>
            También recibirás los detalles en tu correo. Si tienes cualquier duda, escríbenos por WhatsApp.
          </div>
          <div style={{ textAlign:'center', marginTop:32 }}>
            <button onClick={() => { setSubmitted(null); setShowCart(false); setForm({ name:'', surname:'', email:'', phone:'', instagram:'', message:'', shipping_addr:'', payment_method:'' }) }}
              style={{ background:'var(--gold)', color:'var(--dark)', border:'none', padding:'12px 28px', borderRadius:8, fontSize:14, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
              Seguir explorando →
            </button>
          </div>
        </div>
      </div>
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
              <div key={p.id} className={`web-card${selected[p.id] ? ' sel' : ''}`}>
                <div className="web-card-img" style={{ padding:0, overflow:'hidden', position:'relative' }}>
                  {renderImg(p)}
                  <span className="web-feat-badge">★ Dest.</span>
                  {selected[p.id] && <span className="web-check">✓</span>}
                </div>
                <div className="web-card-body">
                  <div className="web-card-name">{p.name}</div>
                  <div className="web-card-mat">{p.material}</div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:8, flexWrap:'wrap' }}>
                    {p.original_price && Number(p.original_price) > Number(p.price) && <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:16, color:'rgba(255,255,255,.35)', textDecoration:'line-through' }}>{usd(p.original_price)}</span>}
                    <span className="web-card-price" style={{ marginTop:0 }}>{usd(p.price)}</span>
                    {p.original_price && Number(p.original_price) > Number(p.price) && <span style={{ background:'rgba(192,57,43,.7)', color:'#fff', fontSize:10, padding:'2px 6px', borderRadius:4, fontWeight:500 }}>-{Math.round((1-p.price/p.original_price)*100)}%</span>}
                  </div>
                  <button className={`web-card-btn${selected[p.id] ? ' sel-active' : ''}`} onClick={() => toggle(p.id)}>
                    {addBtnLabel(selected[p.id])}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div id="web-catalog" className="web-section">
        <div className="web-section-title">Catálogo Completo</div>
        <div className="web-section-sub">{products.length} piezas disponibles · {isOrderMode ? 'arma tu pedido' : 'selecciona varias para cotizar juntas'}</div>
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
            <div key={p.id} className={`web-card${selected[p.id] ? ' sel' : ''}`}>
              <div className="web-card-img" style={{ padding:0, overflow:'hidden', position:'relative' }}>
                {renderImg(p)}
                {p.featured && <span className="web-feat-badge">★ Dest.</span>}
                {selected[p.id] && <span className="web-check">✓</span>}
              </div>
              <div className="web-card-body">
                <div className="web-card-name">{p.name}</div>
                <div className="web-card-mat">{p.material} · {catName(p.cat_id)}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:8, flexWrap:'wrap' }}>
                  {p.original_price && Number(p.original_price) > Number(p.price) && <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:16, color:'rgba(255,255,255,.35)', textDecoration:'line-through' }}>{usd(p.original_price)}</span>}
                  <span className="web-card-price" style={{ marginTop:0 }}>{usd(p.price)}</span>
                  {p.original_price && Number(p.original_price) > Number(p.price) && <span style={{ background:'rgba(192,57,43,.7)', color:'#fff', fontSize:10, padding:'2px 6px', borderRadius:4, fontWeight:500 }}>-{Math.round((1-p.price/p.original_price)*100)}%</span>}
                </div>
                <button className={`web-card-btn${selected[p.id] ? ' sel-active' : ''}`} onClick={() => toggle(p.id)}>
                  {addBtnLabel(selected[p.id])}
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
            <button onClick={() => window.open(`https://wa.me/${wa}?text=${encodeURIComponent('Hola! Me gustaría consultar sobre sus joyas.')}`, '_blank')}
              style={{ marginTop: 20, background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
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
                  <div><label className="qf-label">Nombre *</label>
                    <input className="qf-input" maxLength={80} value={contactForm.name} onChange={e => setContactForm(p => ({...p, name: e.target.value}))} placeholder="Tu nombre" /></div>
                  <div><label className="qf-label">Teléfono</label>
                    <input className="qf-input" maxLength={30} value={contactForm.phone} onChange={e => setContactForm(p => ({...p, phone: e.target.value}))} placeholder="+503 7000-0000" /></div>
                </div>
                <div><label className="qf-label">Email *</label>
                  <input className="qf-input" type="email" maxLength={120} value={contactForm.email} onChange={e => setContactForm(p => ({...p, email: e.target.value}))} placeholder="tu@email.com" /></div>
                <div><label className="qf-label">Mensaje *</label>
                  <textarea className="qf-input" maxLength={1500} rows={3} value={contactForm.message} onChange={e => setContactForm(p => ({...p, message: e.target.value}))} placeholder="¿En qué podemos ayudarte?" style={{ resize: 'vertical' }} /></div>
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

      {selCount > 0 && !showCart && (
        <div className="web-sel-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--gold)', fontFamily: 'Cormorant Garamond, serif', fontSize: 20 }}>{selCount} producto{selCount !== 1 ? 's' : ''}</span>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>en {cartLabel.toLowerCase()} · {usd(selTotal)}</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setSelected({})} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.15)', color: 'var(--muted)', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>Limpiar</button>
            <button className="web-cta web-cta-gold" style={{ padding: '10px 24px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500, background: 'var(--gold)', color: 'var(--dark)' }} onClick={() => { setShowCart(true); setForm({ name:'', surname:'', email:'', phone:'', instagram:'', message:'', shipping_addr:'', payment_method: availableMethods[0] || '' }) }}>
              {ctaLabel} →
            </button>
          </div>
        </div>
      )}

      {showCart && (
        <div className="qf-overlay">
          <div className="qf-inner">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>← Volver al catálogo</button>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: 'var(--gold)', letterSpacing: 2 }}>{settings.company || 'bybega'}</div>
            </div>

            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, color: '#fff', fontWeight: 300, marginBottom: 4 }}>{cartLabel}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 28 }}>
              {isOrderMode ? 'Confirma cantidades, datos y método de pago' : 'Te respondemos en menos de 24 horas'}
            </div>

            {/* Productos seleccionados con cantidad */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Productos</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {selProducts.map(p => (
                  <div key={p.id} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '12px 14px', display:'grid', gridTemplateColumns:'48px 1fr 90px 80px 28px', gap:12, alignItems:'center' }}>
                    <div style={{ width:48, height:48, borderRadius:6, overflow:'hidden', background:'rgba(255,255,255,.03)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
                      {p.images?.[0] ? <img src={p.images[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : p.emoji}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{usd(p.price)} c/u</div>
                    </div>
                    <input type="number" min="1" value={p.qty} onChange={e => setQty(p.id, e.target.value)}
                      style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'#fff', padding:'7px 10px', borderRadius:6, fontSize:13, width:80 }} />
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, color: 'var(--gold)', textAlign:'right' }}>{usd(Number(p.price) * p.qty)}</span>
                    <button onClick={() => toggle(p.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14, cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(184,151,74,.08)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total</span>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: 'var(--gold)' }}>{usd(selTotal)}</span>
              </div>
            </div>

            {/* Datos de contacto */}
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>Tus datos</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div><label className="qf-label">Nombre *</label><input className="qf-input" maxLength={80} value={form.name} onChange={e => sf('name', e.target.value)} placeholder="Tu nombre" /></div>
              <div><label className="qf-label">Apellido {isOrderMode && '*'}</label><input className="qf-input" maxLength={80} value={form.surname} onChange={e => sf('surname', e.target.value)} placeholder="Tu apellido" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div><label className="qf-label">Email *</label><input className="qf-input" type="email" maxLength={120} value={form.email} onChange={e => sf('email', e.target.value)} placeholder="tu@email.com" /></div>
              <div><label className="qf-label">Teléfono / WhatsApp {isOrderMode && '*'}</label><input className="qf-input" maxLength={30} value={form.phone} onChange={e => sf('phone', e.target.value)} placeholder="+503 7000-0000" /></div>
            </div>
            {isOrderMode && (
              <div style={{ marginBottom: 14 }}>
                <label className="qf-label">Dirección de envío</label>
                <input className="qf-input" maxLength={200} value={form.shipping_addr} onChange={e => sf('shipping_addr', e.target.value)} placeholder="Dirección completa o 'recogeré en tienda'" />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label className="qf-label">Instagram (opcional)</label>
              <input className="qf-input" maxLength={60} value={form.instagram} onChange={e => sf('instagram', e.target.value)} placeholder="@tuusuario" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="qf-label">Mensaje / detalles</label>
              <textarea className="qf-input" maxLength={1500} rows={2} value={form.message} onChange={e => sf('message', e.target.value)} placeholder="Talla, ocasión, personalización…" style={{ resize: 'vertical' }} />
            </div>

            {/* Métodos de pago — solo en modo pedido */}
            {isOrderMode && availableMethods.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>Método de pago *</div>
                <div style={{ display:'grid', gap:10, marginBottom:24 }}>
                  {availableMethods.map(m => (
                    <label key={m} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background: form.payment_method === m ? 'rgba(184,151,74,.12)' : 'rgba(255,255,255,.03)', border: `1px solid ${form.payment_method === m ? 'var(--gold)' : 'rgba(255,255,255,.08)'}`, borderRadius:10, cursor:'pointer' }}>
                      <input type="radio" name="pmethod" value={m} checked={form.payment_method === m} onChange={() => sf('payment_method', m)} style={{ accentColor: 'var(--gold)' }} />
                      <span style={{ fontSize:22 }}>{PAY_ICON[m]}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, color:'#fff', fontWeight:500 }}>{PAY_LBL[m]}</div>
                        {m === 'transfer' && settings.bank_name && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{settings.bank_name} · te pasaremos los datos al confirmar</div>}
                        {m === 'cash' && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Pagarás al recibir tu pedido</div>}
                        {m === 'paypal' && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Te enviaremos el link de pago</div>}
                        {m === 'card' && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Pago seguro online</div>}
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}

            {qErr && <div style={{ color: '#e57373', fontSize: 12, marginBottom: 10 }}>{qErr}</div>}
            <button onClick={submitOrder} disabled={submitting || selCount === 0}
              style={{ width: '100%', background: 'var(--gold)', color: 'var(--dark)', border: 'none', padding: 15, borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: submitting || selCount === 0 ? .6 : 1 }}>
              {submitting ? 'Enviando…' : `${ctaLabel} · ${usd(selTotal)} →`}
            </button>
            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: 'var(--muted)' }}>
              {isOrderMode ? 'Al enviar, recibiremos tu pedido y te contactaremos para confirmar.' : 'Al enviar aceptas que nos contactemos contigo.'}
            </div>
          </div>
        </div>
      )}

      <a className="web-wa" href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola! Me gustaría ver el catálogo de bybega.')}`} target="_blank" rel="noreferrer" style={{ bottom: selCount > 0 && !showCart ? 90 : 24 }} aria-label="WhatsApp">💬</a>
    </div>
  )
}
