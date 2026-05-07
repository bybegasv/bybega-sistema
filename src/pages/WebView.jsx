import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const PAY_LBL  = { cash: 'Efectivo (contra entrega)', transfer: 'Transferencia bancaria', paypal: 'PayPal', wompi: 'Wompi (BAC)', n1co: 'N1co', card: 'Otra pasarela' }
const PAY_ICON = { cash: '💵', transfer: '🏦', paypal: '🅿️', wompi: '💳', n1co: '📱', card: '🌐' }

export default function WebView() {
  const [settings, setSettings] = useState({})
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [cat, setCat] = useState('todos')
  const [selected, setSelected] = useState({})
  const [showCart, setShowCart] = useState(false)
  const [submitted, setSubmitted] = useState(null)
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
    } catch { setLoadErr(true) }
  }

  const usd = n => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const catName = id => categories.find(c => c.id === id)?.name || ''

  const isOrderMode = (settings.web_mode || 'pedido') === 'pedido'
  const ctaLabel = isOrderMode ? 'Realizar pedido' : 'Solicitar cotización'

  const availableMethods = []
  if (settings.pay_cash_enabled === 'true')     availableMethods.push('cash')
  if (settings.pay_transfer_enabled === 'true') availableMethods.push('transfer')
  if (settings.pay_wompi_enabled === 'true')    availableMethods.push('wompi')
  if (settings.pay_n1co_enabled === 'true')     availableMethods.push('n1co')
  if (settings.pay_paypal_enabled === 'true')   availableMethods.push('paypal')
  if (settings.pay_card_enabled === 'true')     availableMethods.push('card')

  const toggle = (id) => setSelected(prev => {
    const n = { ...prev }; if (n[id]) delete n[id]; else n[id] = 1; return n
  })
  const setQty = (id, q) => setSelected(prev => {
    const n = { ...prev }; const qty = Math.max(1, parseInt(q) || 1)
    if (n[id] !== undefined) n[id] = qty; return n
  })

  const selProducts = products.filter(p => selected[p.id]).map(p => ({ ...p, qty: selected[p.id] }))
  const selTotal = selProducts.reduce((a, p) => a + (Number(p.price) * p.qty), 0)
  const featured = products.filter(p => p.featured).slice(0, 5)
  const filtered = cat === 'todos' ? products : products.filter(p => p.cat_id === cat)
  const selCount = Object.keys(selected).length

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }))

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
      let clientId = null
      const { data: existing } = await supabase.from('clients').select('id').eq('email', email).maybeSingle()
      if (existing) clientId = existing.id
      else {
        const { data: newClient, error: cErr } = await supabase.from('clients').insert({
          name, surname, email, phone, instagram: form.instagram.trim(),
          shipping_addr: form.shipping_addr.trim(),
          segment: 'nuevo', source: 'web',
          notes: `Lead desde web · ${new Date().toLocaleDateString('es-SV')}`
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
          notes: (form.message ? form.message + '\n\n' : '') + 'Productos:\n' + prodNames
        })
      }

      let orderNum = null
      if (isOrderMode && clientId) {
        const items = selProducts.map(p => ({
          product_id: p.id, name: p.name, price: Number(p.price), qty: p.qty, sub: Number(p.price) * p.qty
        }))
        const { data: newOrder, error: oErr } = await supabase.from('orders').insert({
          client_id: clientId, items,
          subtotal: selTotal, iva_rate: 0, iva_amt: 0, total: selTotal,
          status: 'pendiente',
          date: new Date().toISOString().slice(0, 10),
          notes: form.message || '',
          shipping_addr: form.shipping_addr.trim(),
          payment_method: form.payment_method,
          source: 'web'
        }).select('id').single()
        if (!oErr && newOrder) orderNum = newOrder.id
      }

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
        } catch { console.warn('Email failed; data saved') }
      }

      setSubmitted({ method: form.payment_method, orderNum, total: selTotal })
      setSelected({})
    } catch {
      setQErr('Hubo un error al enviar. Por favor intenta por WhatsApp.')
    }
    setSubmitting(false)
  }

  const submitContactForm = async () => {
    const name = contactForm.name.trim()
    const email = contactForm.email.trim().toLowerCase()
    const message = contactForm.message.trim()
    if (!name) return setContactErr('Tu nombre es obligatorio')
    if (!EMAIL_RE.test(email)) return setContactErr('Email no válido')
    if (!message) return setContactErr('Escribe un mensaje')
    setContactSending(true); setContactErr('')

    try {
      let clientId = null
      const { data: existing } = await supabase.from('clients').select('id').eq('email', email).maybeSingle()
      if (existing) clientId = existing.id
      else {
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
        } catch {}
      }
      setContactSent(true)
    } catch {
      setContactErr('Hubo un error. Intenta por WhatsApp.')
    }
    setContactSending(false)
  }

  const wa = (settings.phone || '').replace(/\D/g, '')

  const goTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior:'smooth' }); setMenuOpen(false) }

  // Carousel render usado en cards de catálogo y destacados
  const renderImg = (p) => {
    const imgs = p.images?.length ? p.images : (p.image_url ? [p.image_url] : [])
    const idx = carouselIdx[p.id] || 0
    if (!imgs.length) return <span style={{ fontSize:60 }}>{p.emoji}</span>
    return (
      <>
        <img src={imgs[idx]} alt={p.name} />
        {imgs.length > 1 && (
          <>
            <div className="mg-fp-arrows">
              <button onClick={e => { e.stopPropagation(); setCarouselIdx(ci => ({...ci, [p.id]: (idx-1+imgs.length)%imgs.length})) }} aria-label="Anterior">‹</button>
              <button onClick={e => { e.stopPropagation(); setCarouselIdx(ci => ({...ci, [p.id]: (idx+1)%imgs.length})) }} aria-label="Siguiente">›</button>
            </div>
            <div className="mg-fp-dots">{imgs.map((_,i) => <div key={i} className={i===idx?'on':''} />)}</div>
          </>
        )}
      </>
    )
  }

  // ─────────────────────────────────────────────
  // PANTALLA DE ÉXITO POST-PEDIDO
  // ─────────────────────────────────────────────
  if (submitted) {
    const m = submitted.method
    const orderTag = submitted.orderNum ? '#' + String(submitted.orderNum).padStart(3,'0') : ''
    return (
      <div className="mg-shell">
        <div className="mg-overlay">
          <div className="mg-overlay-inner">
            <div className="mg-overlay-head">
              <div className="mg-overlay-brand">{settings.company || 'bybega'}</div>
            </div>
            <div className="mg-success">
              <div style={{ fontSize:54, marginBottom:14 }}>✦</div>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:36, color:'var(--mg-gold)', fontStyle:'italic', marginBottom:8 }}>
                {isOrderMode ? '¡Pedido recibido!' : '¡Solicitud enviada!'}
              </div>
              {isOrderMode && submitted.orderNum && (
                <div style={{ fontSize:14, color:'var(--mg-mid)', marginBottom:24 }}>
                  Pedido <strong>{orderTag}</strong> · Total <strong style={{ color:'var(--mg-gold)' }}>{usd(submitted.total)}</strong>
                </div>
              )}
            </div>

            {isOrderMode && m === 'transfer' && (
              <div className="mg-success-card">
                <h4>🏦 Datos para transferencia</h4>
                <div style={{ fontSize:14, lineHeight:2.1, color:'var(--mg-mid)' }}>
                  <div>Banco: <strong style={{ color:'var(--mg-black)' }}>{settings.bank_name || '—'}</strong></div>
                  <div>Titular: <strong style={{ color:'var(--mg-black)' }}>{settings.bank_holder || '—'}</strong></div>
                  <div>Cuenta ({settings.bank_type || '—'}): <strong style={{ color:'var(--mg-black)' }}>{settings.bank_account || '—'}</strong></div>
                  <div>Referencia: <strong>Pedido {orderTag}</strong></div>
                  <div>Monto: <strong style={{ color:'var(--mg-gold)' }}>{usd(submitted.total)}</strong></div>
                </div>
                <div style={{ marginTop:14, fontSize:12, color:'var(--mg-mid)' }}>
                  Tras transferir, envíanos el comprobante por WhatsApp citando el pedido <strong>{orderTag}</strong>.
                </div>
              </div>
            )}

            {isOrderMode && m === 'wompi' && settings.wompi_link && (
              <div className="mg-success-card" style={{ textAlign:'center' }}>
                <h4>💳 Pagar con Wompi</h4>
                <a href={settings.wompi_link} target="_blank" rel="noreferrer"
                   style={{ display:'inline-block', padding:'12px 28px', background:'#005FAA', color:'#fff', borderRadius:30, fontSize:14, fontWeight:500, textDecoration:'none' }}>
                  Ir a Wompi · {usd(submitted.total)}
                </a>
                <div style={{ marginTop:12, fontSize:12, color:'var(--mg-mid)' }}>Indica en el concepto: Pedido {orderTag}</div>
              </div>
            )}

            {isOrderMode && m === 'n1co' && settings.n1co_link && (
              <div className="mg-success-card" style={{ textAlign:'center' }}>
                <h4>📱 Pagar con N1co</h4>
                <a href={settings.n1co_link} target="_blank" rel="noreferrer"
                   style={{ display:'inline-block', padding:'12px 28px', background:'#7c3aed', color:'#fff', borderRadius:30, fontSize:14, fontWeight:500, textDecoration:'none' }}>
                  Ir a N1co · {usd(submitted.total)}
                </a>
                <div style={{ marginTop:12, fontSize:12, color:'var(--mg-mid)' }}>Indica en el concepto: Pedido {orderTag}</div>
              </div>
            )}

            {isOrderMode && m === 'paypal' && settings.paypal_link && (
              <div className="mg-success-card" style={{ textAlign:'center' }}>
                <h4>🅿️ Pagar con PayPal</h4>
                <a href={settings.paypal_link.startsWith('http') ? settings.paypal_link : `https://paypal.me/${settings.paypal_link}`} target="_blank" rel="noreferrer"
                   style={{ display:'inline-block', padding:'12px 28px', background:'#0070ba', color:'#fff', borderRadius:30, fontSize:14, fontWeight:500, textDecoration:'none' }}>
                  Ir a PayPal · {usd(submitted.total)}
                </a>
                <div style={{ marginTop:12, fontSize:12, color:'var(--mg-mid)' }}>Indica en el concepto: Pedido {orderTag}</div>
              </div>
            )}

            {isOrderMode && m === 'card' && settings.card_link && (
              <div className="mg-success-card" style={{ textAlign:'center' }}>
                <h4>🌐 Pagar online</h4>
                <a href={settings.card_link} target="_blank" rel="noreferrer"
                   style={{ display:'inline-block', padding:'12px 28px', background:'var(--mg-gold)', color:'var(--mg-black)', borderRadius:30, fontSize:14, fontWeight:600, textDecoration:'none' }}>
                  Ir al pago · {usd(submitted.total)}
                </a>
                <div style={{ marginTop:12, fontSize:12, color:'var(--mg-mid)' }}>Indica en el concepto: Pedido {orderTag}</div>
              </div>
            )}

            {isOrderMode && m === 'cash' && (
              <div className="mg-success-card">
                <h4>💵 Pago contra entrega</h4>
                <div style={{ fontSize:14, color:'var(--mg-mid)', lineHeight:1.7 }}>
                  Tu pedido fue recibido. Te contactaremos por WhatsApp para coordinar la entrega y el cobro en efectivo.
                </div>
              </div>
            )}

            <div style={{ fontSize:14, color:'var(--mg-mid)', lineHeight:1.8, maxWidth:520, margin:'0 auto', textAlign:'center', marginTop:24 }}>
              También recibirás los detalles en tu correo. Cualquier duda, escríbenos por WhatsApp.
            </div>
            <div style={{ textAlign:'center', marginTop:32 }}>
              <button className="mg-btn-black" onClick={() => { setSubmitted(null); setShowCart(false); setForm({ name:'', surname:'', email:'', phone:'', instagram:'', message:'', shipping_addr:'', payment_method:'' }) }}>
                Seguir explorando<span className="mg-arrow"></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // PÁGINA PRINCIPAL
  // ─────────────────────────────────────────────
  return (
    <div className="mg-shell">

      {/* NAV */}
      <nav className="mg-nav">
        <div className="mg-brand">by<b>{(settings.company || 'bybega').replace(/^by/i,'')}</b></div>
        <div className="mg-nav-links">
          <button onClick={() => goTo('mg-hero')}>Inicio</button>
          {featured.length > 0 && <button onClick={() => goTo('mg-featured')}>Destacados</button>}
          <button onClick={() => goTo('mg-catalog')}>Catálogo</button>
          <button onClick={() => goTo('mg-process')}>Proceso</button>
          <button onClick={() => goTo('mg-atelier')}>Atelier</button>
          <button onClick={() => goTo('mg-contact')}>Contacto</button>
        </div>
        <button className="mg-nav-cta" onClick={() => goTo('mg-catalog')}>{ctaLabel.split(' ')[0]} pieza</button>
        <button className="mg-burger" aria-label="Menú" onClick={() => setMenuOpen(o => !o)}>{menuOpen ? '✕' : '☰'}</button>
      </nav>
      <div className={`mg-mobile ${menuOpen ? 'open' : ''}`}>
        {[['mg-hero','Inicio'],['mg-featured','Destacados'],['mg-catalog','Catálogo'],['mg-process','Proceso'],['mg-atelier','Atelier'],['mg-contact','Contacto']].map(([id,label]) => (
          <button key={id} onClick={() => goTo(id)}>{label}</button>
        ))}
      </div>

      {/* HERO */}
      <section className="mg-hero" id="mg-hero">
        <div className="mg-hero-num">'{new Date().getFullYear().toString().slice(-2)}</div>
        <div className="mg-hero-text">
          <div className="mg-hero-eyebrow">{settings.company || 'bybega'} · Joyería artesanal</div>
          <h1 className="mg-hero-title">
            {(settings.slogan || 'Joyas que cuentan tu historia').split(' ').map((w,i,arr) =>
              i === Math.floor(arr.length/2) ? <em key={i}>{w} </em> : w + ' '
            )}
          </h1>
          <p className="mg-hero-sub">Diseño contemporáneo. Oficio centenario. Piezas hechas a mano en {settings.address || 'El Salvador'}, una a una, para que duren generaciones.</p>
          <div className="mg-hero-actions">
            <button className="mg-btn-black" onClick={() => goTo('mg-catalog')}>Ver colección<span className="mg-arrow"></span></button>
            <button className="mg-btn-text" onClick={() => goTo('mg-atelier')}>Conocer el atelier <span className="mg-arrow"></span></button>
          </div>
          {loadErr && <div style={{ color:'#c0392b', fontSize:12, marginTop:14 }}>No pudimos cargar el catálogo. Recarga la página.</div>}
        </div>
        {featured[0] && (featured[0].images?.[0] || featured[0].image_url) ? (
          <div className="mg-hero-img">
            <img src={featured[0].images?.[0] || featured[0].image_url} alt={featured[0].name} />
            <div className="mg-hero-img-meta">
              <div className="mg-hero-img-meta-num">{products.length}+</div>
              <div className="mg-hero-img-meta-text"><strong>Piezas únicas</strong>en colección</div>
            </div>
          </div>
        ) : (
          <div className="mg-hero-img">
            <div style={{ width:'100%', aspectRatio:'4/5', borderRadius:4, background:'linear-gradient(135deg,#f5ead8 0%,#e8dcc8 100%)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:120, color:'#b8974a' }}>✦</div>
            <div className="mg-hero-img-meta">
              <div className="mg-hero-img-meta-num">{products.length || '—'}</div>
              <div className="mg-hero-img-meta-text"><strong>Piezas únicas</strong>en colección</div>
            </div>
          </div>
        )}
      </section>

      {/* MARQUEE */}
      <div className="mg-marquee">
        <div className="mg-marquee-track">
          <span>Hecho a mano</span><span>Oro 18k certificado</span><span>Diseño exclusivo</span><span>Garantía de por vida</span><span>Envíos a todo El Salvador</span>
          <span>Hecho a mano</span><span>Oro 18k certificado</span><span>Diseño exclusivo</span><span>Garantía de por vida</span><span>Envíos a todo El Salvador</span>
        </div>
      </div>

      {/* DESTACADOS */}
      {featured.length > 0 && (
        <section className="mg-section" id="mg-featured">
          <div className="mg-section-head">
            <div className="mg-section-head-left">
              <div className="mg-section-num">— 01</div>
              <div className="mg-section-eyebrow">Lo más codiciado</div>
              <h2 className="mg-section-title">Piezas <em>destacadas</em> de la temporada.</h2>
            </div>
            <button className="mg-section-link" onClick={() => goTo('mg-catalog')}>Ver todo <span className="mg-arrow"></span></button>
          </div>
          <div className="mg-feat-grid">
            {featured.map((p, i) => (
              <article key={p.id} className={`mg-fp ${i === 0 ? 'mg-fp-big' : ''} ${selected[p.id] ? 'sel' : ''}`}>
                <div className="mg-fp-img">
                  {renderImg(p)}
                  {p.featured && <span className="mg-fp-tag">★ Destacado</span>}
                  <span className="mg-fp-num">{String(i+1).padStart(2,'0')}</span>
                  {selected[p.id] && <span className="mg-fp-check">✓</span>}
                </div>
                <div className="mg-fp-body">
                  <h3 className="mg-fp-name">{p.name}</h3>
                  <div className="mg-fp-mat">{p.material || catName(p.cat_id)}</div>
                  <div className="mg-fp-foot">
                    <span>
                      {p.original_price && Number(p.original_price) > Number(p.price) && (
                        <span className="mg-fp-price-old">{usd(p.original_price)}</span>
                      )}
                      <span className="mg-fp-price">{usd(p.price)}</span>
                      {p.original_price && Number(p.original_price) > Number(p.price) && (
                        <span className="mg-fp-disc" style={{ marginLeft:6 }}>-{Math.round((1-p.price/p.original_price)*100)}%</span>
                      )}
                    </span>
                    <button className={`mg-fp-cta ${selected[p.id] ? 'on' : ''}`} onClick={() => toggle(p.id)}>
                      {selected[p.id] ? '✓ En el pedido' : 'Añadir al pedido →'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* CATÁLOGO */}
      <section className="mg-section mg-catalog" id="mg-catalog">
        <div className="mg-section-head">
          <div className="mg-section-head-left">
            <div className="mg-section-num">— 02</div>
            <div className="mg-section-eyebrow">Catálogo completo</div>
            <h2 className="mg-section-title">Toda la <em>colección</em>.</h2>
          </div>
        </div>
        <div className="mg-catalog-bar">
          <div className="mg-catalog-tools">
            <button className={`mg-cat-btn ${cat === 'todos' ? 'active' : ''}`} onClick={() => setCat('todos')}>Todas ({products.length})</button>
            {categories.map(c => {
              const cnt = products.filter(p => p.cat_id === c.id).length
              return cnt > 0 ? (
                <button key={c.id} className={`mg-cat-btn ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>{c.name} ({cnt})</button>
              ) : null
            })}
          </div>
          <div className="mg-catalog-meta">{filtered.length} {filtered.length === 1 ? 'pieza' : 'piezas'} · ordenado por novedad</div>
        </div>
        <div className="mg-catalog-grid">
          {filtered.map((p, i) => (
            <article key={p.id} className={`mg-fp ${selected[p.id] ? 'sel' : ''}`}>
              <div className="mg-fp-img">
                {renderImg(p)}
                {p.featured && <span className="mg-fp-tag">★</span>}
                <span className="mg-fp-num">{String(i+1).padStart(2,'0')}</span>
                {selected[p.id] && <span className="mg-fp-check">✓</span>}
              </div>
              <div className="mg-fp-body">
                <h3 className="mg-fp-name">{p.name}</h3>
                <div className="mg-fp-mat">{p.material} {p.material && '·'} {catName(p.cat_id)}</div>
                <div className="mg-fp-foot">
                  <span>
                    {p.original_price && Number(p.original_price) > Number(p.price) && (
                      <span className="mg-fp-price-old">{usd(p.original_price)}</span>
                    )}
                    <span className="mg-fp-price">{usd(p.price)}</span>
                  </span>
                  <button className={`mg-fp-cta ${selected[p.id] ? 'on' : ''}`} onClick={() => toggle(p.id)}>
                    {selected[p.id] ? '✓' : '+ Añadir →'}
                  </button>
                </div>
              </div>
            </article>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 20px', color:'var(--mg-mid)' }}>No hay piezas en esta categoría.</div>
          )}
        </div>
      </section>

      {/* PROCESO */}
      <section className="mg-section mg-process" id="mg-process">
        <div className="mg-section-head">
          <div className="mg-section-head-left">
            <div className="mg-section-num">— 03</div>
            <div className="mg-section-eyebrow">Cómo trabajamos</div>
            <h2 className="mg-section-title">El <em>proceso</em>, paso a paso.</h2>
          </div>
        </div>
        <div className="mg-proc-grid">
          <div className="mg-proc">
            <div className="mg-proc-num">— 01 —</div>
            <div className="mg-proc-icon">✎</div>
            <h3>Diseño en boceto</h3>
            <p>Conversamos contigo y dibujamos a mano la pieza. Ajustamos hasta que sea exactamente lo que imaginas.</p>
          </div>
          <div className="mg-proc">
            <div className="mg-proc-num">— 02 —</div>
            <div className="mg-proc-icon">◇</div>
            <h3>Selección de material</h3>
            <p>Eliges el metal (oro 18k, plata 925) y la gema. Todo certificado y de origen verificado.</p>
          </div>
          <div className="mg-proc">
            <div className="mg-proc-num">— 03 —</div>
            <div className="mg-proc-icon">✦</div>
            <h3>Hecho a mano</h3>
            <p>Una sola orfebre trabaja tu pieza de principio a fin: martillado, engaste, pulido. Sin máquinas en serie.</p>
          </div>
          <div className="mg-proc">
            <div className="mg-proc-num">— 04 —</div>
            <div className="mg-proc-icon">♡</div>
            <h3>Entrega y garantía</h3>
            <p>Empaque artesanal. Ajuste de talla, pulido y reparación gratis de por vida.</p>
          </div>
        </div>
      </section>

      {/* ATELIER */}
      <section className="mg-atelier" id="mg-atelier">
        <div className="mg-atelier-wrap">
          <div className="mg-atelier-img">
            <div className="mg-atelier-deco"></div>
            {featured[1] && (featured[1].images?.[0] || featured[1].image_url) ? (
              <img src={featured[1].images?.[0] || featured[1].image_url} alt="Atelier" />
            ) : (
              <div style={{ width:'100%', aspectRatio:'4/5', borderRadius:6, background:'linear-gradient(135deg,#f5ead8,#e8dcc8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:80, color:'#b8974a' }}>✦</div>
            )}
            <div className="mg-atelier-deco-num">'{new Date(settings.created_at || Date.now()).getFullYear().toString().slice(-2)}</div>
          </div>
          <div className="mg-atelier-text">
            <div className="mg-section-num">— 04</div>
            <div className="mg-section-eyebrow">Sobre nosotras</div>
            <h2 className="mg-section-title">Un atelier <em>familiar</em>.</h2>
            <p>{settings.company || 'bybega'} nació como un proyecto de familia. Hoy somos un equipo pequeño de orfebres con una obsesión compartida: el detalle.</p>
            <p>No fabricamos en serie. Cada joya pasa por las manos de una sola persona, de principio a fin — y eso se nota cuando la usas.</p>
            <div className="mg-atelier-stats">
              <div><div className="mg-as-num">{products.length}+</div><div className="mg-as-lbl">Piezas únicas</div></div>
              <div><div className="mg-as-num">{categories.length}</div><div className="mg-as-lbl">Colecciones</div></div>
              <div><div className="mg-as-num">100%</div><div className="mg-as-lbl">Hecho a mano</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="mg-cta-banner">
        <div className="mg-cta-eyebrow">¿Tienes algo en mente?</div>
        <h2 className="mg-cta-title">Diseñemos una pieza <em>solo para ti</em>.</h2>
        <p className="mg-cta-sub">Cuéntanos qué imaginas. Te respondemos personalmente en menos de 24 horas con un boceto y cotización.</p>
        <button className="mg-btn-black" onClick={() => goTo('mg-contact')}>{ctaLabel}<span className="mg-arrow"></span></button>
      </section>

      {/* CONTACTO */}
      <section className="mg-contact" id="mg-contact">
        <div className="mg-contact-wrap">
          <div className="mg-contact-info">
            <div className="mg-section-num">— 05</div>
            <div className="mg-section-eyebrow">Hablemos</div>
            <h2 className="mg-section-title">Cuéntanos qué <em>imaginas</em>.</h2>
            <p>Respondemos cada mensaje personalmente. Si lo prefieres, escríbenos por WhatsApp y conversemos.</p>
            <div className="mg-contact-list">
              {settings.email     && <div className="mg-contact-row"><div className="mg-contact-icon">✉</div><div><strong>Correo</strong><span>{settings.email}</span></div></div>}
              {settings.phone     && <div className="mg-contact-row"><div className="mg-contact-icon">📱</div><div><strong>WhatsApp</strong><span>{settings.phone}</span></div></div>}
              {settings.instagram && <div className="mg-contact-row"><div className="mg-contact-icon">◎</div><div><strong>Instagram</strong><span>{settings.instagram}</span></div></div>}
              {settings.address   && <div className="mg-contact-row"><div className="mg-contact-icon">📍</div><div><strong>Atelier</strong><span>{settings.address}</span></div></div>}
            </div>
            {wa && (
              <button onClick={() => window.open(`https://wa.me/${wa}?text=${encodeURIComponent('Hola! Me gustaría consultar sobre sus joyas.')}`, '_blank')}
                style={{ marginTop:24, background:'#25d366', color:'#fff', border:'none', borderRadius:30, padding:'13px 24px', fontSize:13, cursor:'pointer', fontWeight:600 }}>
                💬 Escribir por WhatsApp
              </button>
            )}
          </div>

          <form className="mg-form" onSubmit={e => { e.preventDefault(); submitContactForm() }}>
            <div className="mg-form-title">Envíanos un mensaje</div>
            <div className="mg-form-sub">Te respondemos en menos de 24 horas</div>
            {contactSent ? (
              <div style={{ textAlign:'center', padding:'24px 0' }}>
                <div style={{ fontSize:36, marginBottom:12 }}>✦</div>
                <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:24, color:'var(--mg-gold)', marginBottom:8, fontStyle:'italic' }}>¡Mensaje enviado!</div>
                <div style={{ fontSize:13, color:'var(--mg-mid)' }}>Te responderemos pronto.</div>
                <button type="button" onClick={() => { setContactSent(false); setContactForm({ name:'', email:'', phone:'', message:'' }) }}
                  style={{ marginTop:16, background:'transparent', border:'1px solid var(--mg-line)', color:'var(--mg-black)', padding:'8px 18px', borderRadius:30, fontSize:12, cursor:'pointer' }}>
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <>
                <div className="mg-form-row">
                  <div><label>Nombre *</label><input maxLength={80} value={contactForm.name} onChange={e => setContactForm(p => ({...p, name: e.target.value}))} /></div>
                  <div><label>Teléfono</label><input maxLength={30} value={contactForm.phone} onChange={e => setContactForm(p => ({...p, phone: e.target.value}))} /></div>
                </div>
                <div style={{ marginBottom:14 }}><label>Email *</label><input type="email" maxLength={120} value={contactForm.email} onChange={e => setContactForm(p => ({...p, email: e.target.value}))} /></div>
                <div style={{ marginBottom:14 }}><label>Mensaje *</label><textarea maxLength={1500} rows={4} value={contactForm.message} onChange={e => setContactForm(p => ({...p, message: e.target.value}))} /></div>
                {contactErr && <div style={{ color:'#c0392b', fontSize:12, marginBottom:10 }}>{contactErr}</div>}
                <button type="submit" className="mg-form-button" disabled={contactSending}>
                  {contactSending ? 'Enviando…' : 'Enviar mensaje →'}
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mg-footer">
        <div className="mg-foot">
          <div className="mg-foot-brand">
            <div className="mg-brand">by<b>{(settings.company || 'bybega').replace(/^by/i,'')}</b></div>
            <p>{settings.slogan || 'Joyas hechas a mano'}<br />{settings.address}</p>
          </div>
          <div>
            <h5>Catálogo</h5>
            <ul>{categories.map(c => <li key={c.id} onClick={() => { setCat(c.id); goTo('mg-catalog') }}>{c.name}</li>)}</ul>
          </div>
          <div>
            <h5>Atelier</h5>
            <ul>
              <li onClick={() => goTo('mg-atelier')}>Sobre nosotras</li>
              <li onClick={() => goTo('mg-process')}>Proceso</li>
              <li onClick={() => goTo('mg-contact')}>Contacto</li>
            </ul>
          </div>
          <div>
            <h5>Contacto</h5>
            <ul>
              {settings.email     && <li>{settings.email}</li>}
              {settings.phone     && <li>{settings.phone}</li>}
              {settings.instagram && <li>{settings.instagram}</li>}
            </ul>
          </div>
        </div>
        <div className="mg-foot-base">
          <div>© {new Date().getFullYear()} {settings.company || 'bybega'} · Todos los derechos reservados</div>
          <div>Hecho con cuidado en El Salvador</div>
        </div>
      </footer>

      {/* WHATSAPP FAB */}
      {wa && <a className="mg-wa" href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola! Me gustaría ver el catálogo.')}`} target="_blank" rel="noreferrer" style={{ bottom: selCount > 0 && !showCart ? 100 : 30 }}>💬</a>}

      {/* SELECTION BAR */}
      {selCount > 0 && !showCart && (
        <div className="mg-sel-bar">
          <div className="mg-sel-bar-text">
            <strong>{selCount} {selCount === 1 ? 'pieza' : 'piezas'}</strong>
            <span>seleccionadas · total {usd(selTotal)}</span>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setSelected({})} style={{ background:'transparent', border:'1px solid rgba(255,255,255,.2)', color:'rgba(255,255,255,.7)', padding:'10px 18px', borderRadius:30, fontSize:13, cursor:'pointer' }}>Limpiar</button>
            <button onClick={() => { setShowCart(true); setForm(p => ({ ...p, payment_method: availableMethods[0] || '' })) }}
              style={{ background:'var(--mg-gold)', color:'var(--mg-black)', border:'none', padding:'10px 24px', borderRadius:30, fontSize:13, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
              {ctaLabel}<span className="mg-arrow"></span>
            </button>
          </div>
        </div>
      )}

      {/* CART OVERLAY */}
      {showCart && (
        <div className="mg-overlay">
          <div className="mg-overlay-inner">
            <div className="mg-overlay-head">
              <button className="mg-overlay-back" onClick={() => setShowCart(false)}>← Volver al catálogo</button>
              <div className="mg-overlay-brand">{settings.company || 'bybega'}</div>
            </div>

            <div className="mg-section-num">— Tu {isOrderMode ? 'pedido' : 'cotización'}</div>
            <h2 className="mg-section-title" style={{ marginBottom:32 }}>
              {isOrderMode ? <>Confirma tu <em>pedido</em>.</> : <>Tu <em>cotización</em>.</>}
            </h2>

            {/* Productos seleccionados */}
            <div style={{ marginBottom:28 }}>
              <div className="mg-section-eyebrow" style={{ marginBottom:12 }}>Productos</div>
              {selProducts.map(p => (
                <div key={p.id} className="mg-cart-row">
                  <div className="img">{p.images?.[0] ? <img src={p.images[0]} alt="" /> : (p.image_url ? <img src={p.image_url} alt="" /> : p.emoji)}</div>
                  <div>
                    <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18 }}>{p.name}</div>
                    <div style={{ fontSize:11, color:'var(--mg-mid)' }}>{usd(p.price)} c/u</div>
                  </div>
                  <input className="qty" type="number" min="1" value={p.qty} onChange={e => setQty(p.id, e.target.value)} />
                  <span className="price" style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, color:'var(--mg-gold)', textAlign:'right' }}>{usd(Number(p.price) * p.qty)}</span>
                  <button className="del" onClick={() => toggle(p.id)} style={{ background:'none', border:'none', color:'var(--mg-mid)', fontSize:16, cursor:'pointer' }}>✕</button>
                </div>
              ))}
              <div className="mg-cart-total">
                <span style={{ fontSize:13, color:'var(--mg-mid)' }}>Total</span>
                <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:26, color:'var(--mg-gold)', fontStyle:'italic' }}>{usd(selTotal)}</span>
              </div>
            </div>

            {/* Datos */}
            <div className="mg-section-eyebrow" style={{ marginBottom:12, paddingTop:18, borderTop:'1px solid var(--mg-line)' }}>Tus datos</div>
            <div className="mg-form" style={{ padding:0, background:'transparent', borderRadius:0 }}>
              <div className="mg-form-row">
                <div><label>Nombre *</label><input maxLength={80} value={form.name} onChange={e => sf('name', e.target.value)} /></div>
                <div><label>Apellido {isOrderMode && '*'}</label><input maxLength={80} value={form.surname} onChange={e => sf('surname', e.target.value)} /></div>
              </div>
              <div className="mg-form-row">
                <div><label>Email *</label><input type="email" maxLength={120} value={form.email} onChange={e => sf('email', e.target.value)} /></div>
                <div><label>WhatsApp {isOrderMode && '*'}</label><input maxLength={30} value={form.phone} onChange={e => sf('phone', e.target.value)} /></div>
              </div>
              {isOrderMode && (
                <div style={{ marginBottom:14 }}>
                  <label>Dirección de envío</label>
                  <input maxLength={200} value={form.shipping_addr} onChange={e => sf('shipping_addr', e.target.value)} placeholder="Dirección completa o 'recogeré en tienda'" />
                </div>
              )}
              <div style={{ marginBottom:14 }}>
                <label>Instagram (opcional)</label>
                <input maxLength={60} value={form.instagram} onChange={e => sf('instagram', e.target.value)} placeholder="@tuusuario" />
              </div>
              <div style={{ marginBottom:isOrderMode ? 14 : 24 }}>
                <label>Mensaje / detalles</label>
                <textarea maxLength={1500} rows={2} value={form.message} onChange={e => sf('message', e.target.value)} placeholder="Talla, ocasión, personalización…" />
              </div>
            </div>

            {/* Métodos de pago */}
            {isOrderMode && availableMethods.length > 0 && (
              <>
                <div className="mg-section-eyebrow" style={{ marginBottom:12, paddingTop:18, borderTop:'1px solid var(--mg-line)' }}>Método de pago *</div>
                <div style={{ display:'grid', gap:8, marginBottom:24 }}>
                  {availableMethods.map(m => (
                    <label key={m} className={`mg-pay-card ${form.payment_method === m ? 'sel' : ''}`}>
                      <input type="radio" name="pmethod" value={m} checked={form.payment_method === m} onChange={() => sf('payment_method', m)} style={{ accentColor:'var(--mg-gold)' }} />
                      <span className="ico">{PAY_ICON[m]}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:500 }}>{PAY_LBL[m]}</div>
                        {m === 'transfer' && settings.bank_name && <div style={{ fontSize:11, color:'var(--mg-mid)', marginTop:2 }}>{settings.bank_name} · te pasaremos los datos al confirmar</div>}
                        {m === 'cash' && <div style={{ fontSize:11, color:'var(--mg-mid)', marginTop:2 }}>Pagarás al recibir tu pedido</div>}
                        {m === 'wompi' && <div style={{ fontSize:11, color:'var(--mg-mid)', marginTop:2 }}>Pago seguro con tarjeta vía Wompi (BAC)</div>}
                        {m === 'n1co' && <div style={{ fontSize:11, color:'var(--mg-mid)', marginTop:2 }}>Pago digital con N1co</div>}
                        {m === 'paypal' && <div style={{ fontSize:11, color:'var(--mg-mid)', marginTop:2 }}>Te enviaremos el link de pago</div>}
                        {m === 'card' && <div style={{ fontSize:11, color:'var(--mg-mid)', marginTop:2 }}>Pago online seguro</div>}
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}

            {qErr && <div style={{ color:'#c0392b', fontSize:13, marginBottom:12 }}>{qErr}</div>}
            <button className="mg-form-button" onClick={submitOrder} disabled={submitting || selCount === 0}>
              {submitting ? 'Enviando…' : `${ctaLabel} · ${usd(selTotal)} →`}
            </button>
            <div style={{ textAlign:'center', marginTop:14, fontSize:11, color:'var(--mg-mid)' }}>
              {isOrderMode ? 'Al enviar, recibiremos tu pedido y te contactaremos para confirmar.' : 'Al enviar aceptas que nos contactemos contigo.'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
