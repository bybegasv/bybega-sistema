import { useState, useRef } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'
import { downloadTemplate, exportProducts, parseImportFile, validateRows, chunk } from '../lib/productsXlsx'

const EMOJIS = ['💍','📿','✨','💎','🔮','⭐','🌟','👑','💫','🌸','🦋','✦']
const STATUS_CLS = { disponible:'tg-g', reservado:'tg', vendido:'tg-r', agotado:'tg-gray' }
const MAX_PHOTOS = 5

// ════════════════════════════════════════════════════════════════
// PRODUCT MODAL (alta / edición)
// ════════════════════════════════════════════════════════════════
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
  const [uploadErr, setUploadErr] = useState('')
  const fileRef = useRef()
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploadErr('')
    const current = form.images || []
    const remaining = MAX_PHOTOS - current.length
    if (remaining <= 0) { setUploadErr('Máximo 5 fotos por producto'); return }
    setUploading(true)
    const newUrls = []
    for (const file of files.slice(0, remaining)) {
      if (file.size > 5 * 1024 * 1024) { setUploadErr(`"${file.name}" supera 5MB y se omitió`); continue }
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('product-images').upload(fileName, file, { upsert: true })
      if (error) { setUploadErr('Error al subir: ' + error.message); continue }
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
      newUrls.push(publicUrl)
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

  const submit = () => {
    if (!form.name?.trim() || !form.price) return alert('Nombre y precio son obligatorios')
    if (Number(form.price) < 0) return alert('Precio inválido')
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box lg" style={{ width: 'min(780px, 95vw)' }}>
        <div className="modal-title">{prod ? 'Editar' : 'Nueva'} joya</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20 }}>
          <div>
            <div className="fg"><label>Nombre</label><input maxLength={120} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Anillo Eternal Gold" /></div>
            <div className="fr">
              <div className="fg"><label>Referencia</label><input maxLength={40} value={form.ref} onChange={e => set('ref', e.target.value)} placeholder="ANI-001" /></div>
              <div className="fg"><label>Categoría</label><select value={form.cat_id} onChange={e => set('cat_id', e.target.value)}>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
            <div className="fr">
              <div className="fg"><label>Precio actual (USD)</label><input type="number" step="0.01" min="0" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" /></div>
              <div className="fg"><label>Precio anterior tachado</label><input type="number" step="0.01" min="0" value={form.original_price} onChange={e => set('original_price', e.target.value)} placeholder="Opcional" /></div>
            </div>
            <div className="fr">
              <div className="fg"><label>Material</label><input maxLength={80} value={form.material} onChange={e => set('material', e.target.value)} placeholder="Oro 18k..." /></div>
              <div className="fg"><label>Tienda</label>
                <select value={form.store} onChange={e => set('store', e.target.value)}>
                  <option value="ambas">Ambas tiendas</option>
                  <option value="tienda1">Tienda 1</option>
                  <option value="tienda2">Tienda 2</option>
                </select>
              </div>
            </div>
            <div className="fg"><label>Descripción</label><textarea maxLength={1000} rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
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
              {uploadErr && <p style={{ fontSize:11, color:'var(--danger)', marginTop:5 }}>{uploadErr}</p>}
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
          <button className="btn btn-gold" onClick={submit} disabled={uploading}>{uploading ? 'Subiendo…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// IMPORT MODAL — previsualización y confirmación
// ════════════════════════════════════════════════════════════════
function ImportModal({ result, onConfirm, onClose, busy, progress }) {
  if (!result) return null
  const { toCreate, toUpdate, errors, newCategories, skipped } = result
  const total = toCreate.length + toUpdate.length

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal-box lg" style={{ width:'min(820px, 96vw)' }}>
        <div className="modal-title">Importar productos · Previsualización</div>

        {/* Resumen */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
          <div style={{ background:'rgba(46,125,82,.08)', padding:'12px 14px', borderRadius:8, borderLeft:'3px solid var(--success)' }}>
            <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Crear</div>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28, color:'var(--success)' }}>{toCreate.length}</div>
          </div>
          <div style={{ background:'rgba(184,151,74,.08)', padding:'12px 14px', borderRadius:8, borderLeft:'3px solid var(--gold)' }}>
            <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Actualizar</div>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28, color:'var(--gold)' }}>{toUpdate.length}</div>
          </div>
          <div style={{ background:'rgba(26,82,118,.06)', padding:'12px 14px', borderRadius:8, borderLeft:'3px solid var(--info)' }}>
            <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Nuevas categorías</div>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28, color:'var(--info)' }}>{newCategories.length}</div>
          </div>
          <div style={{ background: errors.length ? 'rgba(192,57,43,.06)' : '#f9f7f4', padding:'12px 14px', borderRadius:8, borderLeft:`3px solid ${errors.length ? 'var(--danger)' : '#ccc'}` }}>
            <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Errores</div>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28, color: errors.length ? 'var(--danger)' : 'var(--muted)' }}>{errors.length}</div>
          </div>
        </div>

        {/* Categorías a crear */}
        {newCategories.length > 0 && (
          <div style={{ background:'#f9f7f4', padding:'12px 16px', borderRadius:8, marginBottom:14, fontSize:13 }}>
            <strong>Se crearán {newCategories.length} categoría{newCategories.length !== 1 ? 's' : ''} nueva{newCategories.length !== 1 ? 's' : ''}:</strong>{' '}
            {newCategories.join(', ')}
          </div>
        )}

        {/* Errores */}
        {errors.length > 0 && (
          <div style={{ maxHeight:140, overflowY:'auto', background:'rgba(192,57,43,.04)', border:'1px solid rgba(192,57,43,.18)', borderRadius:8, padding:'10px 14px', marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--danger)', marginBottom:6 }}>Filas con errores (no se importarán):</div>
            <ul style={{ fontSize:12, color:'var(--mid)', paddingLeft:18, margin:0 }}>
              {errors.map((e, i) => <li key={i}>Fila {e.row}: {e.message}</li>)}
            </ul>
          </div>
        )}

        {/* Previsualización de las primeras filas */}
        {total > 0 && (
          <div style={{ maxHeight:260, overflowY:'auto', border:'1px solid var(--border)', borderRadius:8 }}>
            <table style={{ width:'100%', fontSize:12, borderCollapse:'collapse' }}>
              <thead style={{ background:'#f9f7f4', position:'sticky', top:0 }}>
                <tr>
                  <th style={{ padding:'8px 10px', textAlign:'left', borderBottom:'1px solid var(--border)' }}>Acción</th>
                  <th style={{ padding:'8px 10px', textAlign:'left', borderBottom:'1px solid var(--border)' }}>Nombre</th>
                  <th style={{ padding:'8px 10px', textAlign:'left', borderBottom:'1px solid var(--border)' }}>Ref</th>
                  <th style={{ padding:'8px 10px', textAlign:'left', borderBottom:'1px solid var(--border)' }}>Categoría</th>
                  <th style={{ padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)' }}>Precio</th>
                  <th style={{ padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)' }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {[...toCreate.map(r => ({...r, action:'crear'})), ...toUpdate.map(r => ({...r, action:'actualizar'}))].slice(0, 30).map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding:'6px 10px', borderBottom:'1px solid #f0eee8' }}>
                      <span className={`tag ${r.action === 'crear' ? 'tg-g' : 'tg'}`} style={{ fontSize:10 }}>{r.action}</span>
                    </td>
                    <td style={{ padding:'6px 10px', borderBottom:'1px solid #f0eee8' }}>{r.data.name}</td>
                    <td style={{ padding:'6px 10px', borderBottom:'1px solid #f0eee8', fontFamily:'monospace' }}>{r.data.ref || '—'}</td>
                    <td style={{ padding:'6px 10px', borderBottom:'1px solid #f0eee8' }}>{r.data.cat_name}</td>
                    <td style={{ padding:'6px 10px', borderBottom:'1px solid #f0eee8', textAlign:'right' }}>${Number(r.data.price).toFixed(2)}</td>
                    <td style={{ padding:'6px 10px', borderBottom:'1px solid #f0eee8', textAlign:'right' }}>{r.data.stock_total}</td>
                  </tr>
                ))}
                {(toCreate.length + toUpdate.length) > 30 && (
                  <tr><td colSpan={6} style={{ padding:'10px', textAlign:'center', color:'var(--muted)', fontStyle:'italic' }}>
                    … y {toCreate.length + toUpdate.length - 30} fila{(toCreate.length + toUpdate.length - 30) !== 1 ? 's' : ''} más
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {skipped > 0 && <div style={{ fontSize:11, color:'var(--muted)', marginTop:8 }}>Se omitieron {skipped} fila{skipped !== 1 ? 's' : ''} vacía{skipped !== 1 ? 's' : ''}.</div>}

        {busy && (
          <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(184,151,74,.08)', borderRadius:6, fontSize:13 }}>
            Importando… {progress.done}/{progress.total}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn btn-gold" onClick={onConfirm} disabled={busy || total === 0}>
            {busy ? 'Importando…' : `Confirmar importación (${total} producto${total !== 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PRODUCTS PAGE
// ════════════════════════════════════════════════════════════════
export default function Products() {
  const { products, categories, saveProduct, deleteProduct, toggleFeatured, saveCategory, catName, usd, showToast } = useData()
  const [modal, setModal] = useState(null)
  const [cat, setCat] = useState('todos')
  const [q, setQ] = useState('')
  const [storeFilter, setStoreFilter] = useState('todos')
  const importRef = useRef()
  const [importResult, setImportResult] = useState(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })

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

  // ── IMPORTACIÓN ─────────────────────────────────────────────
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const rows = await parseImportFile(file)
      const result = validateRows(rows, { categories, products })
      setImportResult(result)
    } catch (err) {
      alert('No pudimos leer el archivo: ' + (err.message || err))
    }
    if (importRef.current) importRef.current.value = ''
  }

  const handleImportConfirm = async () => {
    if (!importResult) return
    setImportBusy(true)
    const total = importResult.toCreate.length + importResult.toUpdate.length + importResult.newCategories.length
    let done = 0
    setImportProgress({ done, total })

    // 1) Releer categorías DESDE LA BD (no del state — puede estar stale después de
    //    imports previos en la misma sesión, lo que causaría duplicados).
    const { data: freshCats } = await supabase.from('categories').select('id,name').order('sort_order')
    const catNameMap = {}
    ;(freshCats || []).forEach(c => { catNameMap[c.name.trim().toLowerCase()] = c.id })

    // 2) Crear sólo las categorías que REALMENTE no existen (case-insensitive + trim)
    for (const rawName of importResult.newCategories) {
      const key = String(rawName).trim().toLowerCase()
      if (catNameMap[key]) { done++; setImportProgress({ done, total }); continue }
      const { data, error } = await supabase.from('categories')
        .insert({ name: String(rawName).trim(), color: 'tg', sort_order: (freshCats?.length || 0) + 1 })
        .select('id,name').single()
      if (!error && data) catNameMap[key] = data.id
      done++; setImportProgress({ done, total })
    }

    const resolveCat = (n) => catNameMap[String(n).trim().toLowerCase()] || null

    // Saneo para INSERT/UPDATE: numéricos vacíos → null/0, cat_id vacío → null
    const sanitize = (raw) => {
      const numFields = ['price','original_price','stock_total','stock_t1','stock_t2','low_stock_alert']
      const out = { ...raw }
      numFields.forEach(k => {
        if (out[k] === '' || out[k] === undefined || out[k] === null) {
          out[k] = k === 'original_price' ? null : (k === 'low_stock_alert' ? 3 : 0)
        } else {
          const n = Number(out[k]); out[k] = isFinite(n) ? n : (k === 'original_price' ? null : 0)
        }
      })
      return out
    }

    // 3) Crear productos en batches (INSERT puede inicializar images:[])
    for (const batch of chunk(importResult.toCreate, 20)) {
      const rows = batch.map(b => {
        const { cat_name, ...rest } = b.data
        return sanitize({ ...rest, cat_id: resolveCat(cat_name), images: [], image_url: '' })
      })
      const { error } = await supabase.from('products').insert(rows)
      if (error) console.error('Insert batch error:', error)
      done += batch.length; setImportProgress({ done, total })
    }

    // 4) UPDATE — NUNCA tocar images/image_url/emoji para no borrar las fotos existentes.
    //    Solo actualizamos los campos editables desde Excel.
    for (const u of importResult.toUpdate) {
      const { cat_name, images, image_url, emoji, ...rest } = u.data
      const payload = sanitize({ ...rest, cat_id: resolveCat(cat_name) })
      const { error } = await supabase.from('products').update(payload).eq('id', u.id)
      if (error) console.error('Update error:', error, u.id)
      done++; setImportProgress({ done, total })
    }

    setImportBusy(false)
    setImportResult(null)
    showToast(`Importación completa: ${importResult.toCreate.length} creados, ${importResult.toUpdate.length} actualizados`)
    setTimeout(() => window.location.reload(), 800)
  }

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt">Galería de <span>Productos</span></div>
          <div className="ps">{products.length} referencias · {featured}/5 destacados {lowStock > 0 && <span className="tag tg-r" style={{ fontSize:10, marginLeft:6 }}>⚠ {lowStock} stock bajo</span>}</div>
        </div>
        <div className="ph-actions">
          <button className="btn btn-ghost" onClick={() => downloadTemplate(categories)} title="Descargar plantilla Excel vacía">📥 Plantilla</button>
          <button className="btn btn-ghost" onClick={() => exportProducts(products, categories)} disabled={products.length === 0} title="Exportar productos actuales a Excel">📤 Exportar</button>
          <button className="btn btn-outline" onClick={() => importRef.current?.click()} title="Importar productos desde Excel">📂 Importar</button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:'none' }} onChange={handleImportFile} />
          <button className="btn btn-gold" onClick={() => setModal('new')}>+ Nueva joya</button>
        </div>
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
                  {p.original_price && Number(p.original_price) > Number(p.price) && <span className="tag tg-r" style={{ fontSize:10 }}>-{Math.round((1-p.price/p.original_price)*100)}%</span>}
                </div>
                <div style={{ fontSize:11, color:isLow?'var(--danger)':'var(--muted)', marginTop:2 }}>
                  Stock: {p.stock_total ?? 0} {isLow&&'⚠'} · T1:{p.stock_t1 ?? 0} T2:{p.stock_t2 ?? 0}
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

      <ImportModal
        result={importResult}
        onConfirm={handleImportConfirm}
        onClose={() => setImportResult(null)}
        busy={importBusy}
        progress={importProgress}
      />
    </div>
  )
}
