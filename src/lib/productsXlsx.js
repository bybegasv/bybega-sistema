// ============================================================
// Productos · Plantilla / Exportar / Importar (formato Excel .xlsx)
// La librería XLSX se carga DINÁMICAMENTE (lazy) para no inflar el
// bundle inicial — solo se descarga cuando el usuario usa export/import.
// ============================================================

// Columnas canónicas del archivo Excel y el campo correspondiente en BD.
// El orden aquí es el orden visual de las columnas en la plantilla.
export const COLUMNS = [
  { key: 'nombre',          dbField: 'name',            required: true,  example: 'Anillo Solitario Eternal' },
  { key: 'referencia',      dbField: 'ref',             required: false, example: 'ANI-001' },
  { key: 'categoria',       dbField: 'cat_id',          required: true,  example: 'Anillos' },
  { key: 'material',        dbField: 'material',        required: false, example: 'Oro 18k' },
  { key: 'descripcion',     dbField: 'description',     required: false, example: 'Pieza única hecha a mano' },
  { key: 'precio',          dbField: 'price',           required: true,  example: 1280 },
  { key: 'precio_anterior', dbField: 'original_price',  required: false, example: '' },
  { key: 'tienda',          dbField: 'store',           required: false, example: 'ambas' },
  { key: 'estado',          dbField: 'status',          required: false, example: 'disponible' },
  { key: 'stock_total',     dbField: 'stock_total',     required: false, example: 5 },
  { key: 'stock_t1',        dbField: 'stock_t1',        required: false, example: 3 },
  { key: 'stock_t2',        dbField: 'stock_t2',        required: false, example: 2 },
  { key: 'alerta_stock',    dbField: 'low_stock_alert', required: false, example: 2 },
  { key: 'destacado',       dbField: 'featured',        required: false, example: 'no' },
  { key: 'emoji',           dbField: 'emoji',           required: false, example: '💍' },
]

const VALID_STORE  = new Set(['ambas','tienda1','tienda2'])
const VALID_STATUS = new Set(['disponible','reservado','vendido','agotado'])

// Carga perezosa de la librería XLSX
let _XLSX = null
const loadXLSX = async () => {
  if (_XLSX) return _XLSX
  _XLSX = await import('xlsx')
  return _XLSX
}

// ── Descargar plantilla vacía (con encabezados + 1 fila de ejemplo) ────
export async function downloadTemplate(categories = []) {
  const XLSX = await loadXLSX()
  const headers = COLUMNS.map(c => c.key + (c.required ? ' *' : ''))
  const exampleRow = COLUMNS.map(c => c.example)

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow])
  ws['!cols'] = COLUMNS.map(c => ({ wch: Math.max(c.key.length + 3, 14) }))

  const catSheet = XLSX.utils.aoa_to_sheet([
    ['Categorías disponibles (usa el nombre EXACTO en la columna "categoria")'],
    [],
    ...categories.map(c => [c.name])
  ])
  catSheet['!cols'] = [{ wch: 50 }]

  const instructions = [
    ['Plantilla de carga masiva — Productos bybega'],
    [],
    ['Cómo usar:'],
    ['1. Borra la fila de ejemplo (fila 2).'],
    ['2. Llena una fila por producto.'],
    ['3. Columnas con * son obligatorias.'],
    ['4. La categoría debe coincidir exactamente con un nombre de la hoja "Categorías".'],
    ['   Si pones una categoría que no existe, se creará automáticamente.'],
    ['5. Si pones la misma "referencia" que un producto ya existente, se ACTUALIZA. Si no, se CREA.'],
    [],
    ['Valores válidos:'],
    ['  tienda:    ambas | tienda1 | tienda2'],
    ['  estado:    disponible | reservado | vendido | agotado'],
    ['  destacado: si | no'],
    [],
    ['Notas:'],
    ['  precio_anterior es opcional, sirve para mostrar descuentos.'],
    ['  Si dejas stock vacío, se asume 0.'],
    ['  Las fotos NO se importan desde Excel — se suben después desde el panel.'],
    [],
    ['Guarda el archivo como .xlsx y súbelo desde Productos → Importar.'],
  ]
  const insSheet = XLSX.utils.aoa_to_sheet(instructions)
  insSheet['!cols'] = [{ wch: 90 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws,        'Productos')
  XLSX.utils.book_append_sheet(wb, catSheet,  'Categorías')
  XLSX.utils.book_append_sheet(wb, insSheet,  'Instrucciones')

  XLSX.writeFile(wb, `bybega-plantilla-productos.xlsx`)
}

// ── Exportar productos actuales ────────────────────────────────────────
export async function exportProducts(products = [], categories = []) {
  const XLSX = await loadXLSX()
  const catName = (id) => categories.find(c => c.id === id)?.name || ''
  const headers = COLUMNS.map(c => c.key)
  const rows = products.map(p => [
    p.name || '',
    p.ref || '',
    catName(p.cat_id),
    p.material || '',
    p.description || '',
    p.price ?? '',
    p.original_price ?? '',
    p.store || 'ambas',
    p.status || 'disponible',
    p.stock_total ?? 0,
    p.stock_t1 ?? 0,
    p.stock_t2 ?? 0,
    p.low_stock_alert ?? 3,
    p.featured ? 'si' : 'no',
    p.emoji || '💍'
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = COLUMNS.map(c => ({ wch: Math.max(c.key.length + 3, 14) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Productos')
  const ts = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `bybega-productos-${ts}.xlsx`)
}

// ── Leer archivo Excel subido ──────────────────────────────────────────
export async function parseImportFile(file) {
  const XLSX = await loadXLSX()
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheetName = wb.SheetNames.find(n => /producto/i.test(n)) || wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })
  return json
}

// Normaliza un encabezado del archivo Excel ("Nombre *", "NOMBRE", "nombre") → "nombre"
function normalizeHeader(h) {
  return String(h || '').toLowerCase().replace(/\*/g, '').replace(/\s+/g, '').replace(/\./g,'').trim()
}

// ── Validar + transformar las filas en operaciones DB ─────────────────
export function validateRows(rawRows, { categories = [], products = [] } = {}) {
  const headerMap = {}
  COLUMNS.forEach(c => { headerMap[c.key] = c })

  const out = {
    toCreate: [],
    toUpdate: [],
    newCategories: new Set(),
    errors: [],
    skipped: 0,
  }

  const catByName = {}
  categories.forEach(c => { catByName[c.name.trim().toLowerCase()] = c })
  const prodByRef = {}
  products.forEach(p => { if (p.ref) prodByRef[p.ref.trim().toLowerCase()] = p })

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2
    const r = {}
    Object.entries(row).forEach(([k, v]) => {
      const key = normalizeHeader(k)
      if (headerMap[key]) r[key] = v
    })

    const name = String(r.nombre || '').trim()
    if (!name) {
      const anyVal = Object.values(r).some(v => String(v || '').trim() !== '')
      if (!anyVal) { out.skipped++; return }
      out.errors.push({ row: rowNum, message: 'Falta el nombre del producto' })
      return
    }

    const categoria = String(r.categoria || '').trim()
    if (!categoria) {
      out.errors.push({ row: rowNum, message: `Falta la categoría para "${name}"` })
      return
    }

    const price = Number(r.precio)
    if (!isFinite(price) || price < 0) {
      out.errors.push({ row: rowNum, message: `Precio inválido para "${name}" (${r.precio})` })
      return
    }

    const original = r.precio_anterior !== '' && r.precio_anterior !== undefined ? Number(r.precio_anterior) : null
    if (original !== null && (!isFinite(original) || original < 0)) {
      out.errors.push({ row: rowNum, message: `Precio anterior inválido para "${name}"` })
      return
    }

    const storeVal = String(r.tienda || 'ambas').trim().toLowerCase()
    if (!VALID_STORE.has(storeVal)) {
      out.errors.push({ row: rowNum, message: `Tienda inválida "${r.tienda}" para "${name}" (usa: ambas, tienda1, tienda2)` })
      return
    }

    const statusVal = String(r.estado || 'disponible').trim().toLowerCase()
    if (!VALID_STATUS.has(statusVal)) {
      out.errors.push({ row: rowNum, message: `Estado inválido "${r.estado}" para "${name}"` })
      return
    }

    const catKey = categoria.toLowerCase()
    if (!catByName[catKey]) out.newCategories.add(categoria)

    const featuredVal = String(r.destacado || 'no').trim().toLowerCase()
    const featured = ['si','sí','yes','true','1','x'].includes(featuredVal)

    const num = (v, def = 0) => {
      const n = Number(v)
      return isFinite(n) ? n : def
    }

    const productData = {
      name,
      ref: String(r.referencia || '').trim() || '',
      cat_name: categoria,
      price,
      original_price: original,
      material: String(r.material || '').trim(),
      description: String(r.descripcion || '').trim(),
      store: storeVal,
      status: statusVal,
      stock_total: num(r.stock_total, 0),
      stock_t1: num(r.stock_t1, 0),
      stock_t2: num(r.stock_t2, 0),
      low_stock_alert: num(r.alerta_stock, 3),
      featured,
      emoji: String(r.emoji || '💍').trim() || '💍',
    }

    const refKey = productData.ref.toLowerCase()
    if (refKey && prodByRef[refKey]) {
      out.toUpdate.push({ id: prodByRef[refKey].id, data: productData, _rowNum: rowNum })
    } else {
      out.toCreate.push({ data: productData, _rowNum: rowNum })
    }
  })

  out.newCategories = Array.from(out.newCategories)
  return out
}

// ── Helper: divide en chunks para inserción por lotes ──────────────────
export function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
