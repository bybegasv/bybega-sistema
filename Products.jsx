import { useState, useRef } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'

const EMOJIS = ['💍','📿','✨','💎','🔮','⭐','🌟','👑','💫','🌸','🦋','✦']
const STATUS_CLS = { disponible:'tg-g', reservado:'tg', vendido:'tg-r', agotado:'tg-gray' }
const MAX_PHOTOS = 5

function ProductModal({ prod, cats, onSave, onClose }) {
  const [form, setForm] = useState({
    name: prod?.name || '', ref: prod?.ref || '',
    cat_id: prod?.cat_id || cats[0]?.id || '',
    price: prod?.price || '', original_price: prod?.original_price || '',
    material: prod?.material || '', description: prod?.description || '',
    emoji: prod?.emoji || '💍', status: prod?.status || 'disponible',
    store: prod?.store || 'ambas',
    stock_total: prod?.stock_total || 0, stock_t1: prod?.stock_t1 || 0, stock_t2: prod?.stock_t2 || 0,
    low_stock_alert: prod?.low_stock_alert || 3,
    images: prod?.images || [], image_url: prod?.image_url || ''
  })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const current = form.images || []
    const remaining = MAX_PHOTOS - current.length
    if (remaining <= 0) { alert('Máximo 5 fotos por producto'); return }
    setUploading(true)
    const newUrls = []
    for (const file of files.slice(0, remaining)) {
      if (file.size > 5 * 1024 * 1024) continue
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('product-images').upload(fileName, file, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
        newUrls.push(publicUrl)
      }
    }
    const updated = [...current, ...newUrls]
    setForm(p => ({ ...p, images: updated, image_url: updated[0] || p.image_url }))
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const removeImage = async (url, idx) => {
    const path = url.split('/product-images/')[1]
    if (path) await supabase.storage.from('product-images').remove([path])
    const updated = form.images.filter((_, i) => i !== idx)
    setForm(p => ({ ...p, images: updated, image_url: updated[0] || '' }))
  }

  const imgs = form.images || []

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box lg" style={{ width: 'min(780px, 95vw)' }}>
        <div className="modal-title">{prod ? 'Editar' : 'Nueva'} joya</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20 }}>
          <div>
            <div className="fg"><label>Nombre</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Anillo Eternal Gold" /></div>
            <div className="fr">
              <div className="fg"><label>Referencia</label><input value={form.ref} onChange={e => set('ref', e.target.value)} placeholder="ANI-001" /></div>
              <div className="fg"><label>Categoría</label><select value={form.cat_id} onChange={e => set('cat_id', e.target.value)}>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
            <div className="fr">
              <div className="fg"><label>Precio actual (USD)</label><input type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" /></div>
              <div className="fg"><label>Precio anterior tachado</label><input type="number" step="0.01" value={form.original_price} onChange={e => set('original_price', e.target.value)} placeholder="Opcional" /></div>
            </div>
            <div className="fr">
              <div className="fg"><label>Material</label><input value={form.material} onChange={e => set('material', e.target.value)} placeholder="Oro 18k..." /></div>
              <div className="fg"><label>Tienda</label>
                <select value={form.store} onChange={e => set('store', e.target.value)}>
                  <option value="ambas">Ambas tiendas</option>
                  <option value="tienda1">Tienda 1</option>
                  <option value="tienda2">Tienda 2</option>
                </select>
              </div>
            </div>
            <div className="fg"><label>Descripción</label><textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
            <div className="fr">
              <div className="fg"><label>Estado</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}>
                  {['disponible','reservado','vendido','agotado'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="fg"><label>Alerta stock (unid.)</label><input type="number" min="1" value={form.low_stock_alert} onChange={e => set('low_stock_alert', parseInt(e.target.value)||3)} /></div>
            </div>
            <div className="fr3">
              <div className="fg"><label>Stock total</label><input type="number" min="0" value={form.stock_total} onChange={e => set('stock_total', parseInt(e.target.value)||0)} /></div>
              <div className="fg"><label>Stock T1</label><input type="number" min="0" value={form.stock_t1} onChange={e => set('stock_t1', parseInt(e.target.value)||0)} /></div>
              <div className="fg"><label>Stock T2</label><input type="number" min="0" value={form.stock_t2} onChange={e => set('stock_t2', parseInt(e.target.value)||0)} /></div>
            </div>
          </div>
          <div>
            <div className="fg">
              <label>Fotos ({imgs.length}/{MAX_PHOTOS})</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                {imgs.map((url, idx) => (
                  <div key={idx} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:'0.5px solid rgba(0,0,0,.12)' }}>
                    <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    {idx === 0 && <span style={{ position:'absolute', bottom:3, left:3, background:'var(--gold)', color:'var(--dark)', fontSize:9, padding:'1px 5px', borderRadius:3 }}>PRINCIPAL</span>}
                    <button onClick={() => removeImage(url, idx)} style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.65)', color:'#fff', border:'none', borderRadius:'50%', width:18, height:18, cursor:'pointer', fontSize:9, lineHeight:'18px', textAlign:'center', padding:0 }}>✕</button>
                  </div>
                ))}
                {imgs.length < MAX_PHOTOS && (
                  <div onClick={() => !uploading && fileRef.current?.click()}
                    style={{ aspectRatio:'1', borderRadius:8, border:'1.5px dashed rgba(0,0,0,.15)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:uploading?'wait':'pointer', gap:4 }}
                    onMouseOver={e => e.currentTarget.style.borderColor='var(--gold)'}
                    onMouseOut={e => e.currentTarget.style.borderColor='rgba(0,0,0,.15)'}>
                    <span style={{ fontSize:20 }}>📷</span>
                    <span style={{ fontSize:10, color:'var(--muted)' }}>{uploading ? 'Subiendo…' : '+ Agregar'}</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleUpload} disabled={uploading} />
              <p style={{ fontSize:11, color:'var(--muted)', marginTop:5, lineHeight:1.5 }}>La 1ª es la principal. Puedes subir varias a la vez. Máx 5MB c/u.</p>
            </div>
            {imgs.length === 0 && (
              <div className="fg"><label>Icono (sin fotos)</label>
                <div className="ep">{EMOJIS.map(e => <span key={e} className={`eo ${form.emoji===e?'sel':''}`} onClick={() => set('emoji', e)}>{e}</span>)}</div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={() => { if (!form.name || !form.price) return alert('Nombre y precio requeridos'); onSave(form) }} disabled={uploading}>{uploading ? 'Subiendo…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

export default function Products() {
  const { products, categories, saveProduct, deleteProduct, toggleFeatured, catName, usd } = useData()
  const [modal, setModal] = useState(null)
  const [cat, setCat] = useState('todos')
  const [q, setQ] = useState('')
  const [storeFilter, setStoreFilter] = useState('todos')

  const featured = products.filter(p => p.featured).length
  const lowStock = products.filter(p => p.stock_total > 0 && p.stock_total <= (p.low_stock_alert || 3)).length
  const storeLbl = { ambas:'Ambas', tienda1:'T1', tienda2:'T2' }

  const filtered = products.filter(p =>
    (cat === 'todos' || p.cat_id === cat) &&
    (storeFilter === 'todos' || p.store === storeFilter || p.store === 'ambas') &&
    (p.name.toLowerCase().includes(q.toLowerCase()) || (p.ref||'').toLowerCase().includes(q.toLowerCase()))
  )

  const handleDelete = async (id, images) => {
    if (!confirm('¿Eliminar?')) return
    if (images?.length) {
      const paths = images.map(u => u.split('/product-images/')[1]).filter(Boolean)
      if (paths.length) await supabase.storage.from('product-images').remove(paths)
    }
    await deleteProduct(id)
  }

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt">Galería de <span>Productos</span></div>
          <div className="ps">{products.length} referencias · {featured}/5 destacados {lowStock > 0 && <span className="tag tg-r" style={{ fontSize:10, marginLeft:6 }}>⚠ {lowStock} stock bajo</span>}</div>
        </div>
        <button className="btn btn-gold" onClick={() => setModal('new')}>+ Nueva joya</button>
      </div>
      <div className="fb">
        <input className="si" placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} />
        <button className={`fi ${cat==='todos'?'active':''}`} onClick={() => setCat('todos')}>Todos</button>
        {categories.map(c => <button key={c.id} className={`fi ${cat===c.id?'active':''}`} onClick={() => setCat(c.id)}>{c.name}</button>)}
        <span style={{ borderLeft:'1px solid rgba(0,0,0,.1)', paddingLeft:8, display:'flex', gap:6 }}>
          {['todos','tienda1','tienda2'].map(s => (
            <button key={s} className={`fi ${storeFilter===s?'active':''}`} onClick={() => setStoreFilter(s)}>
              {s==='todos'?'Todas':s==='tienda1'?'Tienda 1':'Tienda 2'}
            </button>
          ))}
        </span>
      </div>
      <div className="pg">
        {filtered.map(p => {
          const mainImg = p.images?.[0] || p.image_url
          const isLow = p.stock_total > 0 && p.stock_total <= (p.low_stock_alert || 3)
          return (
            <div className="pc" key={p.id}>
              <div className="pi" style={{ padding:0, overflow:'hidden' }}>
                {mainImg ? <img src={mainImg} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:44 }}>{p.emoji}</span>}
                {p.featured && <span className="pc-feat">★ Dest.</span>}
                <span className={`pc-status tag ${STATUS_CLS[p.status]||'tg-gray'}`}>{p.status}</span>
                {p.images?.length > 1 && <span style={{ position:'absolute', bottom:6, right:6, background:'rgba(0,0,0,.5)', color:'#fff', fontSize:10, padding:'2px 5px', borderRadius:3 }}>+{p.images.length-1}</span>}
              </div>
              <div className="pinfo">
                <div className="pname">{p.name}</div>
                <div className="pref">{p.ref} · <span className="tag tg-b" style={{ fontSize:10 }}>{storeLbl[p.store]||'Ambas'}</span></div>
                <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:6 }}>
                  {p.original_price && <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:13, color:'var(--muted)', textDecoration:'line-through' }}>{usd(p.original_price)}</span>}
                  <span className="pprice" style={{ marginTop:0 }}>{usd(p.price)}</span>
                  {p.original_price && <span className="tag tg-r" style={{ fontSize:10 }}>-{Math.round((1-p.price/p.original_price)*100)}%</span>}
                </div>
                <div style={{ fontSize:11, color:isLow?'var(--danger)':'var(--muted)', marginTop:2 }}>
                  Stock: {p.stock_total} {isLow&&'⚠'} · T1:{p.stock_t1} T2:{p.stock_t2}
                </div>
                <div className="pactions">
                  <button className="btn btn-outline btn-sm" onClick={() => setModal(p)}>Editar</button>
                  <button className="btn btn-sm" onClick={() => toggleFeatured(p.id, p.featured)}
                    style={{ background:p.featured?'var(--gold)':'transparent', color:p.featured?'var(--dark)':'var(--muted)', border:'1px solid rgba(0,0,0,.12)' }}>★</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id, p.images)}>✕</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {modal && <ProductModal prod={modal==='new'?null:modal} cats={categories} onSave={d => { saveProduct(d, modal?.id||null); setModal(null) }} onClose={() => setModal(null)} />}
    </div>
  )
}
