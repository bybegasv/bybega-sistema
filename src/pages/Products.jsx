import { useState, useRef } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'

const EMOJIS = ['💍','📿','✨','💎','🔮','⭐','🌟','👑','💫','🌸','🦋','✦']
const STATUS_CLS = { disponible: 'tg-g', reservado: 'tg', vendido: 'tg-r', agotado: 'tg-gray' }

function ProductModal({ prod, cats, onSave, onClose }) {
  const [form, setForm] = useState({
    name: prod?.name || '',
    ref: prod?.ref || '',
    cat_id: prod?.cat_id || cats[0]?.id || '',
    price: prod?.price || '',
    material: prod?.material || '',
    description: prod?.description || '',
    emoji: prod?.emoji || '💍',
    status: prod?.status || 'disponible',
    image_url: prod?.image_url || ''
  })
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(prod?.image_url || '')
  const fileRef = useRef()

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar 5MB')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { upsert: true })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)

      set('image_url', publicUrl)
      setPreview(publicUrl)
    } catch (err) {
      alert('Error al subir imagen: ' + err.message)
    }
    setUploading(false)
  }

  const removeImage = () => {
    set('image_url', '')
    setPreview('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = () => {
    if (!form.name || !form.price) return alert('Nombre y precio son requeridos')
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box lg">
        <div className="modal-title">{prod ? 'Editar' : 'Nueva'} joya</div>

        <div className="fg"><label>Nombre</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Anillo Eternal Gold" />
        </div>

        <div className="fr">
          <div className="fg"><label>Referencia</label>
            <input value={form.ref} onChange={e => set('ref', e.target.value)} placeholder="ANI-001" />
          </div>
          <div className="fg"><label>Categoría</label>
            <select value={form.cat_id} onChange={e => set('cat_id', e.target.value)}>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="fr">
          <div className="fg"><label>Precio (USD)</label>
            <input type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" />
          </div>
          <div className="fg"><label>Material</label>
            <input value={form.material} onChange={e => set('material', e.target.value)} placeholder="Oro 18k, Plata 925…" />
          </div>
        </div>

        <div className="fg"><label>Descripción</label>
          <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div className="fg"><label>Estado</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            {['disponible','reservado','vendido','agotado'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* IMAGE UPLOAD */}
        <div className="fg">
          <label>Foto del producto</label>
          {preview ? (
            <div style={{ position: 'relative', display: 'inline-block', marginTop: 6 }}>
              <img
                src={preview}
                alt="preview"
                style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, border: '0.5px solid rgba(0,0,0,.12)' }}
              />
              <button
                onClick={removeImage}
                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: '1.5px dashed rgba(0,0,0,.15)', borderRadius: 8, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', marginTop: 6, transition: 'border-color .15s' }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--gold)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,.15)'}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {uploading ? 'Subiendo imagen…' : 'Clic para subir foto · JPG, PNG, WEBP · máx 5MB'}
              </div>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
            disabled={uploading}
          />
        </div>

        {/* EMOJI fallback */}
        {!preview && (
          <div className="fg">
            <label>Icono (si no hay foto)</label>
            <div className="ep">
              {EMOJIS.map(e => (
                <span key={e} className={`eo ${form.emoji === e ? 'sel' : ''}`} onClick={() => set('emoji', e)}>{e}</span>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={submit} disabled={uploading}>
            {uploading ? 'Subiendo…' : 'Guardar'}
          </button>
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

  const featured = products.filter(p => p.featured).length

  const filtered = products.filter(p =>
    (cat === 'todos' || p.cat_id === cat) &&
    (p.name.toLowerCase().includes(q.toLowerCase()) || (p.ref || '').toLowerCase().includes(q.toLowerCase()))
  )

  const handleSave = async (data) => {
    await saveProduct(data, modal?.id || null)
    setModal(null)
  }

  const handleDelete = async (id, imageUrl) => {
    if (!confirm('¿Eliminar este producto?')) return
    if (imageUrl) {
      const path = imageUrl.split('/product-images/')[1]
      if (path) await supabase.storage.from('product-images').remove([path])
    }
    await deleteProduct(id)
  }

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt">Galería de <span>Productos</span></div>
          <div className="ps">{products.length} referencias · {featured}/5 destacados para la web</div>
        </div>
        <button className="btn btn-gold" onClick={() => setModal('new')}>+ Nueva joya</button>
      </div>

      <div className="fb">
        <input className="si" placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} />
        <button className={`fi ${cat === 'todos' ? 'active' : ''}`} onClick={() => setCat('todos')}>Todos</button>
        {categories.map(c => (
          <button key={c.id} className={`fi ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>{c.name}</button>
        ))}
      </div>

      <div className="pg">
        {filtered.map(p => (
          <div className="pc" key={p.id}>
            <div className="pi" style={{ padding: 0, overflow: 'hidden' }}>
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 44 }}>{p.emoji}</span>
              )}
              {p.featured && <span className="pc-feat">★ Dest.</span>}
              <span className={`pc-status tag ${STATUS_CLS[p.status] || 'tg-gray'}`}>{p.status}</span>
            </div>
            <div className="pinfo">
              <div className="pname">{p.name}</div>
              <div className="pref">{p.ref} · {catName(p.cat_id)}</div>
              <div className="pprice">{usd(p.price)}</div>
              <div className="pactions">
                <button className="btn btn-outline btn-sm" onClick={() => setModal(p)}>Editar</button>
                <button
                  className="btn btn-sm"
                  onClick={() => toggleFeatured(p.id, p.featured)}
                  style={{ background: p.featured ? 'var(--gold)' : 'transparent', color: p.featured ? 'var(--dark)' : 'var(--muted)', border: '1px solid rgba(0,0,0,.12)' }}
                  title={p.featured ? 'Quitar destacado' : 'Destacar'}
                >★</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id, p.image_url)}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <ProductModal
          prod={modal === 'new' ? null : modal}
          cats={categories}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
