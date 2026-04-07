import { useState, useEffect, useRef } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'

const ACTIONS = [
  { value: 'catalog', label: 'Ir al catálogo completo' },
  { value: 'featured', label: 'Ir a destacados' },
  { value: 'contact', label: 'Ir a contacto / cotizar' },
  { value: 'whatsapp', label: 'Abrir WhatsApp' },
  { value: 'product', label: 'Ir a un producto específico' },
]

const BADGE_COLORS = [
  { value: 'gold', label: 'Dorado', bg: '#b8974a', text: '#1a1714' },
  { value: 'red', label: 'Rojo / Oferta', bg: '#c0392b', text: '#fff' },
  { value: 'blue', label: 'Azul / Nuevo', bg: '#1a5276', text: '#fff' },
  { value: 'purple', label: 'Morado / Especial', bg: '#5b3dcf', text: '#fff' },
  { value: 'green', label: 'Verde / Disponible', bg: '#2e7d52', text: '#fff' },
]

function BannerPreview({ banner, settings }) {
  const bc = BADGE_COLORS.find(c => c.value === banner.badge_color) || BADGE_COLORS[0]
  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden', position: 'relative',
      background: `linear-gradient(135deg, ${banner.bg_from || '#1a1714'}, ${banner.bg_to || '#2e2820'})`,
      padding: '32px 28px', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center'
    }}>
      {banner.image_url && (
        <img src={banner.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: .25 }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {banner.badge && (
            <span style={{ background: bc.bg, color: bc.text, fontSize: 10, padding: '3px 10px', borderRadius: 4, fontWeight: 700, letterSpacing: 1 }}>
              {banner.badge}
            </span>
          )}
          {banner.discount_pct > 0 && (
            <span style={{ background: '#c0392b', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 4, fontWeight: 700 }}>
              -{banner.discount_pct}%
            </span>
          )}
          {banner.expires_at && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
              Hasta {new Date(banner.expires_at + 'T12:00:00').toLocaleDateString('es-SV', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {banner.emoji && !banner.image_url && (
            <div style={{ fontSize: 52, lineHeight: 1, flexShrink: 0 }}>{banner.emoji}</div>
          )}
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, color: '#fff', lineHeight: 1.2, fontWeight: 300 }}>
              {banner.title || 'Título del banner'}
            </div>
            {banner.subtitle && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', marginTop: 6, lineHeight: 1.5 }}>
                {banner.subtitle}
              </div>
            )}
            {banner.button_text && (
              <div style={{ marginTop: 14 }}>
                <span style={{ background: '#b8974a', color: '#1a1714', padding: '8px 18px', borderRadius: 6, fontSize: 12, fontWeight: 500 }}>
                  {banner.button_text}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function BannerModal({ banner, products, onSave, onClose }) {
  const [f, setF] = useState({
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    badge: banner?.badge || '',
    badge_color: banner?.badge_color || 'gold',
    image_url: banner?.image_url || '',
    emoji: banner?.emoji || '✨',
    bg_from: banner?.bg_from || '#1a1714',
    bg_to: banner?.bg_to || '#2e2820',
    button_text: banner?.button_text || 'Ver oferta',
    button_action: banner?.button_action || 'catalog',
    product_id: banner?.product_id || '',
    discount_pct: banner?.discount_pct || 0,
    expires_at: banner?.expires_at || '',
    active: banner?.active ?? true,
    sort_order: banner?.sort_order || 0
  })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const fileName = `banner-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(fileName, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
      s('image_url', publicUrl)
    }
    setUploading(false)
  }

  const EMOJIS = ['✨','💍','📿','💎','🔮','⭐','🌟','👑','💫','🌸','🎁','🏆','🦋','✦','💐']

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box lg" style={{ width: 'min(820px,95vw)' }}>
        <div className="modal-title">{banner ? 'Editar' : 'Nuevo'} banner</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div className="fg"><label>Título principal *</label>
              <input value={f.title} onChange={e => s('title', e.target.value)} placeholder="Oferta Especial" />
            </div>
            <div className="fg"><label>Subtítulo</label>
              <textarea rows={2} value={f.subtitle} onChange={e => s('subtitle', e.target.value)} placeholder="Descripción breve de la oferta o colección" />
            </div>
            <div className="fr">
              <div className="fg"><label>Texto del badge</label>
                <input value={f.badge} onChange={e => s('badge', e.target.value)} placeholder="OFERTA, NUEVO, ESPECIAL…" />
              </div>
              <div className="fg"><label>Color del badge</label>
                <select value={f.badge_color} onChange={e => s('badge_color', e.target.value)}>
                  {BADGE_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="fr">
              <div className="fg"><label>% de descuento (0 = sin descuento)</label>
                <input type="number" min={0} max={99} value={f.discount_pct} onChange={e => s('discount_pct', parseInt(e.target.value) || 0)} />
              </div>
              <div className="fg"><label>Válido hasta (opcional)</label>
                <input type="date" value={f.expires_at} onChange={e => s('expires_at', e.target.value)} />
              </div>
            </div>
            <div className="fr">
              <div className="fg"><label>Texto del botón</label>
                <input value={f.button_text} onChange={e => s('button_text', e.target.value)} placeholder="Ver oferta" />
              </div>
              <div className="fg"><label>Al hacer clic en el botón</label>
                <select value={f.button_action} onChange={e => s('button_action', e.target.value)}>
                  {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
            </div>
            {f.button_action === 'product' && (
              <div className="fg"><label>Producto específico</label>
                <select value={f.product_id} onChange={e => s('product_id', e.target.value)}>
                  <option value="">— Seleccionar producto —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div className="fr">
              <div className="fg"><label>Orden (menor = primero)</label>
                <input type="number" min={0} value={f.sort_order} onChange={e => s('sort_order', parseInt(e.target.value) || 0)} />
              </div>
              <div className="fg" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: 13, color: 'var(--dark)' }}>
                  <input type="checkbox" checked={f.active} onChange={e => s('active', e.target.checked)} />
                  Banner activo (visible en la web)
                </label>
              </div>
            </div>
          </div>

          <div>
            <div className="fg">
              <label>Vista previa</label>
              <div style={{ marginTop: 6 }}><BannerPreview banner={f} /></div>
            </div>
            <div className="fg" style={{ marginTop: 14 }}>
              <label>Fondo del banner</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>Color 1</div>
                  <input type="color" value={f.bg_from} onChange={e => s('bg_from', e.target.value)}
                    style={{ width: 44, height: 32, border: '0.5px solid rgba(0,0,0,.15)', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>Color 2</div>
                  <input type="color" value={f.bg_to} onChange={e => s('bg_to', e.target.value)}
                    style={{ width: 44, height: 32, border: '0.5px solid rgba(0,0,0,.15)', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>Presets rápidos</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['#1a1714','#2e2820'],['#0a1628','#1a3a5c'],['#1a0a28','#3a1a5c'],['#1a2810','#2e4a20'],['#280a0a','#4a1a1a']].map(([a,b],i)=>(
                      <div key={i} onClick={() => { s('bg_from',a); s('bg_to',b) }}
                        style={{ width:28, height:28, borderRadius:6, background:`linear-gradient(135deg,${a},${b})`, cursor:'pointer', border:'2px solid '+(f.bg_from===a?'var(--gold)':'transparent') }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="fg">
              <label>Imagen de fondo (opcional)</label>
              {f.image_url ? (
                <div style={{ position: 'relative', marginTop: 6 }}>
                  <img src={f.image_url} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: '0.5px solid rgba(0,0,0,.12)' }} />
                  <button onClick={() => s('image_url', '')} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 10, lineHeight: '20px', textAlign: 'center', padding: 0 }}>✕</button>
                </div>
              ) : (
                <div onClick={() => !uploading && fileRef.current?.click()}
                  style={{ border: '1.5px dashed rgba(0,0,0,.15)', borderRadius: 8, padding: '14px', textAlign: 'center', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', marginTop: 6 }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,.15)'}>
                  {uploading ? 'Subiendo…' : '📷 Subir imagen de fondo (opcional)'}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>La imagen se mostrará con opacidad reducida. Recomendado: 1200×500px</p>
            </div>
            <div className="fg">
              <label>Emoji (si no hay imagen)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {EMOJIS.map(e => (
                  <span key={e} onClick={() => s('emoji', e)}
                    style={{ fontSize: 22, cursor: 'pointer', padding: 4, borderRadius: 6, border: `2px solid ${f.emoji === e ? 'var(--gold)' : 'transparent'}`, background: f.emoji === e ? 'var(--gold-p)' : 'transparent' }}>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={() => { if (!f.title) return alert('Título requerido'); onSave(f); onClose() }}>Guardar banner</button>
        </div>
      </div>
    </div>
  )
}

export default function Banners() {
  const { products, settings } = useData()
  const [banners, setBanners] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [previewIdx, setPreviewIdx] = useState(0)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await supabase.from('banners').select('*').order('sort_order')
    if (data) setBanners(data)
    setLoading(false)
  }

  const save = async (data, id) => {
    if (id) await supabase.from('banners').update(data).eq('id', id)
    else await supabase.from('banners').insert(data)
    await load()
  }

  const del = async (id) => {
    if (!confirm('¿Eliminar este banner?')) return
    await supabase.from('banners').delete().eq('id', id)
    await load()
  }

  const toggleActive = async (id, current) => {
    await supabase.from('banners').update({ active: !current }).eq('id', id)
    await load()
  }

  const moveOrder = async (id, dir) => {
    const idx = banners.findIndex(b => b.id === id)
    const target = banners[idx + dir]
    if (!target) return
    await supabase.from('banners').update({ sort_order: target.sort_order }).eq('id', id)
    await supabase.from('banners').update({ sort_order: banners[idx].sort_order }).eq('id', target.id)
    await load()
  }

  const active = banners.filter(b => b.active)
  const cur = active[previewIdx % Math.max(active.length, 1)]

  const BADGE_COLORS_MAP = Object.fromEntries(BADGE_COLORS.map(c => [c.value, c]))

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt">Carrusel de <span>Ofertas</span></div>
          <div className="ps">{banners.length} banners · {active.length} activos en la web</div>
        </div>
        <button className="btn btn-gold" onClick={() => setModal('new')}>+ Nuevo banner</button>
      </div>

      {/* LIVE PREVIEW */}
      {active.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div className="card-title">Vista previa del carrusel</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewIdx(p => (p - 1 + active.length) % active.length)}>‹</button>
              <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>{(previewIdx % active.length) + 1} / {active.length}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewIdx(p => (p + 1) % active.length)}>›</button>
            </div>
          </div>
          {cur && <BannerPreview banner={cur} settings={settings} />}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            {active.map((_, i) => (
              <div key={i} onClick={() => setPreviewIdx(i)}
                style={{ width: i === previewIdx % active.length ? 20 : 6, height: 6, borderRadius: 3, background: i === previewIdx % active.length ? 'var(--gold)' : 'rgba(0,0,0,.2)', cursor: 'pointer', transition: 'all .3s' }} />
            ))}
          </div>
        </div>
      )}

      {/* BANNERS TABLE */}
      {loading ? <div className="ps">Cargando…</div> : (
        <div className="tw">
          <table>
            <thead><tr><th>Orden</th><th>Banner</th><th>Badge</th><th>Acción del botón</th><th>Descuento</th><th>Vence</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {banners.length ? banners.map((b, idx) => {
                const bc = BADGE_COLORS_MAP[b.badge_color] || BADGE_COLORS_MAP.gold
                return (
                  <tr key={b.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <button onClick={() => moveOrder(b.id, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', padding: '0 4px' }}>▲</button>
                        <span style={{ textAlign: 'center', fontSize: 13 }}>{b.sort_order}</span>
                        <button onClick={() => moveOrder(b.id, 1)} disabled={idx === banners.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', padding: '0 4px' }}>▼</button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 48, height: 36, borderRadius: 6, background: `linear-gradient(135deg,${b.bg_from||'#1a1714'},${b.bg_to||'#2e2820'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                          {b.image_url ? <img src={b.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .6 }} /> : b.emoji}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{b.title}</div>
                          {b.subtitle && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.subtitle.slice(0, 50)}{b.subtitle.length > 50 ? '…' : ''}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{b.badge ? <span style={{ background: bc.bg, color: bc.text, fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{b.badge}</span> : '—'}</td>
                    <td style={{ fontSize: 12 }}>{ACTIONS.find(a => a.value === b.button_action)?.label || b.button_action}</td>
                    <td>{b.discount_pct > 0 ? <span className="tag tg-r">-{b.discount_pct}%</span> : '—'}</td>
                    <td style={{ fontSize: 12 }}>{b.expires_at ? new Date(b.expires_at + 'T12:00:00').toLocaleDateString('es-SV', { day: '2-digit', month: 'short' }) : 'Sin vencimiento'}</td>
                    <td>
                      <button onClick={() => toggleActive(b.id, b.active)}
                        style={{ background: b.active ? 'rgba(46,125,82,.12)' : 'rgba(0,0,0,.06)', color: b.active ? 'var(--success)' : 'var(--muted)', border: 'none', borderRadius: 20, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                        {b.active ? '● Activo' : '○ Inactivo'}
                      </button>
                    </td>
                    <td style={{ display: 'flex', gap: 4, padding: '8px 14px' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setModal(b)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(b.id)}>✕</button>
                    </td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 28 }}>
                  Sin banners. Crea el primero con el botón de arriba.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <BannerModal
          banner={modal === 'new' ? null : modal}
          products={products}
          onSave={d => save(d, modal?.id || null)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
