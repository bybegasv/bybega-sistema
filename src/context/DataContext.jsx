import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DataContext = createContext(null)
export const useData = () => useContext(DataContext)

export function DataProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [orders, setOrders] = useState([])
  const [invoices, setInvoices] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [payments, setPayments] = useState([])
  const [events, setEvents] = useState([])
  const [shifts, setShifts] = useState([])
  const [currentShift, setCurrentShift] = useState(null)
  const [settings, setSettings] = useState({})

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }, [])

  // ── AUTH ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (id) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
    setProfile(data)
    setLoading(false)
  }

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    return null
  }

  const logout = () => supabase.auth.signOut()

  // ── LOAD ALL ──────────────────────────────────
  useEffect(() => {
    if (user) {
      loadCategories()
      loadProducts()
      loadClients()
      loadOpportunities()
      loadOrders()
      loadInvoices()
      loadDeliveries()
      loadPayments()
      loadEvents()
      loadShifts()
      loadCurrentShift()
      loadSettings()
    }
  }, [user])

  // ── HELPERS DE NORMALIZACIÓN ─────────────────
  // Convierte strings vacíos en null para columnas DATE/TIMESTAMP/UUID
  const blankToNull = (obj, fields) => {
    const out = { ...obj }
    fields.forEach(k => { if (out[k] === '' || out[k] === undefined) out[k] = null })
    return out
  }

  // ── CATEGORIES ────────────────────────────────
  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    if (data) setCategories(data)
  }
  const saveCategory = async (data, id) => {
    if (id) await supabase.from('categories').update(data).eq('id', id)
    else await supabase.from('categories').insert(data)
    await loadCategories()
    showToast('Categoría guardada ✓')
  }
  const deleteCategory = async (id) => {
    await supabase.from('categories').delete().eq('id', id)
    await loadCategories()
    showToast('Categoría eliminada')
  }

  // ── PRODUCTS ──────────────────────────────────
  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at')
    if (data) setProducts(data)
  }
  const saveProduct = async (data, id) => {
    if (id) await supabase.from('products').update(data).eq('id', id)
    else await supabase.from('products').insert(data)
    await loadProducts()
    showToast('Producto guardado ✓')
  }
  const deleteProduct = async (id) => {
    await supabase.from('products').delete().eq('id', id)
    await loadProducts()
    showToast('Producto eliminado')
  }
  const toggleFeatured = async (id, current) => {
    const featCount = products.filter(p => p.featured).length
    if (!current && featCount >= 5) { showToast('Máximo 5 destacados'); return }
    await supabase.from('products').update({ featured: !current }).eq('id', id)
    await loadProducts()
    showToast(!current ? 'Marcado como destacado' : 'Destacado eliminado')
  }

  // ── CLIENTS ───────────────────────────────────
  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    if (data) setClients(data)
  }
  const saveClient = async (data, id) => {
    // dob '' rompe columnas DATE → null
    const payload = blankToNull(data, ['dob'])
    let error
    if (id) ({ error } = await supabase.from('clients').update(payload).eq('id', id))
    else    ({ error } = await supabase.from('clients').insert(payload))
    if (error) { showToast('Error al guardar: ' + error.message); return error }
    await loadClients()
    showToast('Cliente guardado ✓')
  }
  const deleteClient = async (id) => {
    await supabase.from('clients').delete().eq('id', id)
    await loadClients()
    showToast('Cliente eliminado')
  }

  // ── OPPORTUNITIES ─────────────────────────────
  const loadOpportunities = async () => {
    const { data } = await supabase.from('opportunities').select('*').order('created_at', { ascending: false })
    if (data) setOpportunities(data)
  }
  const saveOpportunity = async (data, id) => {
    if (id) await supabase.from('opportunities').update(data).eq('id', id)
    else await supabase.from('opportunities').insert(data)
    await loadOpportunities()
    showToast('Oportunidad guardada ✓')
  }
  const deleteOpportunity = async (id) => {
    await supabase.from('opportunities').delete().eq('id', id)
    await loadOpportunities()
    showToast('Oportunidad eliminada')
  }

  // ── ORDERS ────────────────────────────────────
  const loadOrders = async () => {
    const { data } = await supabase.from('orders').select('*').order('id', { ascending: false })
    if (data) setOrders(data)
  }
  const saveOrder = async (data, id) => {
    if (id) await supabase.from('orders').update(data).eq('id', id)
    else await supabase.from('orders').insert(data)
    await loadOrders()
    showToast('Pedido guardado ✓')
  }

  // ── INVOICES ──────────────────────────────────
  const loadInvoices = async () => {
    const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
    if (data) setInvoices(data)
  }
  const createInvoice = async (order) => {
    const { data: cnt } = await supabase.from('settings').select('value').eq('key', 'inv_counter').single()
    const num = parseInt(cnt?.value || 1)
    const invNum = `BYB-${new Date().getFullYear()}-${String(num).padStart(3, '0')}`
    await supabase.from('invoices').insert({
      order_id: order.id, client_id: order.client_id, number: invNum,
      subtotal: order.subtotal, iva_rate: order.iva_rate, iva_amt: order.iva_amt,
      total: order.total, date: new Date().toISOString().slice(0, 10), paid: false
    })
    await supabase.from('settings').update({ value: String(num + 1) }).eq('key', 'inv_counter')
    await loadInvoices()
    showToast(`Factura ${invNum} creada ✓`)
    return invNum
  }
  const markInvoicePaid = async (id) => {
    await supabase.from('invoices').update({ paid: true }).eq('id', id)
    await loadInvoices()
    showToast('Factura marcada como pagada ✓')
  }

  // ── DELIVERIES ────────────────────────────────
  const loadDeliveries = async () => {
    const { data } = await supabase.from('deliveries').select('*').order('created_at', { ascending: false })
    if (data) setDeliveries(data)
  }
  const saveDelivery = async (data, id) => {
    if (id) await supabase.from('deliveries').update(data).eq('id', id)
    else await supabase.from('deliveries').insert(data)
    await loadDeliveries()
    showToast('Entrega guardada ✓')
  }

  // ── PAYMENTS (abonos) ─────────────────────────
  const loadPayments = async () => {
    const { data } = await supabase.from('payments').select('*').order('date', { ascending: false })
    if (data) setPayments(data)
  }
  const savePayment = async (data, id) => {
    const payload = blankToNull(data, ['date'])
    let error
    if (id) ({ error } = await supabase.from('payments').update(payload).eq('id', id))
    else    ({ error } = await supabase.from('payments').insert(payload))
    if (error) { showToast('Error al guardar pago: ' + error.message); return error }
    await Promise.all([loadPayments(), loadOrders()])
    showToast('Pago registrado ✓')
  }
  const deletePayment = async (id) => {
    await supabase.from('payments').delete().eq('id', id)
    await Promise.all([loadPayments(), loadOrders()])
    showToast('Pago eliminado')
  }
  const orderPayments = (orderId) => payments.filter(p => p.order_id === orderId)
  const orderPaid = (orderId) => orderPayments(orderId).reduce((a, p) => a + Number(p.amount || 0), 0)

  // ── QUICK SALE (POS / Caja) ────────────────────
  // Crea pedido + factura + abono en una sola operación.
  // Si reuseOrderId se provee, usa ese pedido existente (reserva web que vino a recoger).
  const quickSale = async ({ items, total, method, clientId, store = 'tienda1', reuseOrderId = null, notes = '' }) => {
    let orderId = reuseOrderId
    let invoiceNumber = null
    const shiftId = currentShift?.id || null

    try {
      if (!reuseOrderId) {
        // 1. Crear pedido nuevo (status confirmado para descontar stock)
        const { data: newOrder, error: oErr } = await supabase.from('orders').insert({
          client_id: clientId || null,
          items,
          subtotal: total,
          iva_rate: 0,
          iva_amt: 0,
          total,
          status: 'confirmado',
          date: new Date().toISOString().slice(0, 10),
          notes,
          store,
          payment_method: method,
          source: 'local',
          shift_id: shiftId
        }).select('id').single()
        if (oErr) throw oErr
        orderId = newOrder.id
      } else {
        // 2. Pedido existente: pasa a confirmado (si estaba en pendiente) para descontar stock
        await supabase.from('orders').update({
          status: 'confirmado',
          payment_method: method,
          shift_id: shiftId
        }).eq('id', reuseOrderId)
      }

      // 3. Crear factura
      const { data: cnt } = await supabase.from('settings').select('value').eq('key', 'inv_counter').single()
      const num = parseInt(cnt?.value || 1)
      invoiceNumber = `BYB-${new Date().getFullYear()}-${String(num).padStart(3, '0')}`
      await supabase.from('invoices').insert({
        order_id: orderId, client_id: clientId || null, number: invoiceNumber,
        subtotal: total, iva_rate: 0, iva_amt: 0,
        total, date: new Date().toISOString().slice(0, 10), paid: true
      })
      await supabase.from('settings').update({ value: String(num + 1) }).eq('key', 'inv_counter')

      // 4. Registrar el abono completo
      await supabase.from('payments').insert({
        order_id: orderId,
        amount: total,
        method,
        date: new Date().toISOString().slice(0, 10),
        reference: invoiceNumber,
        notes: 'Venta en caja',
        shift_id: shiftId
      })

      // 5. Marcar pedido como entregado (ya se cobró y el cliente se llevó)
      await supabase.from('orders').update({ status: 'entregado' }).eq('id', orderId)

      // Refrescar
      await Promise.all([loadOrders(), loadInvoices(), loadPayments(), loadProducts()])
      showToast(`✓ Venta ${invoiceNumber} registrada`)
      return { orderId, invoiceNumber }
    } catch (e) {
      showToast('Error al registrar venta: ' + (e.message || e))
      return null
    }
  }

  // ── SHIFTS (turnos / cierre de caja) ──────────
  const loadShifts = async () => {
    const { data } = await supabase.from('shifts').select('*').order('opened_at', { ascending: false }).limit(100)
    if (data) setShifts(data)
  }
  const loadCurrentShift = async () => {
    if (!user) return
    const { data } = await supabase.from('shifts')
      .select('*')
      .eq('user_id', user.id)
      .is('closed_at', null)
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setCurrentShift(data || null)
  }
  const openShift = async ({ store, opening_cash = 0, notes = '' }) => {
    if (!user) return null
    const { data, error } = await supabase.from('shifts').insert({
      user_id: user.id,
      user_name: profile?.name || (user.email || '').split('@')[0] || 'Cajera',
      store, opening_cash, notes
    }).select().single()
    if (error) { showToast('Error al abrir turno: ' + error.message); return null }
    setCurrentShift(data)
    await loadShifts()
    showToast('Turno abierto ✓')
    return data
  }
  const closeShift = async ({ declared_cash, notes }) => {
    if (!currentShift) return
    const { error } = await supabase.from('shifts').update({
      closed_at: new Date().toISOString(),
      declared_cash: declared_cash ?? null,
      notes: notes ?? currentShift.notes
    }).eq('id', currentShift.id)
    if (error) { showToast('Error al cerrar turno: ' + error.message); return }
    setCurrentShift(null)
    await loadShifts()
    showToast('Turno cerrado ✓')
  }
  const shiftPayments = (shiftId) => payments.filter(p => p.shift_id === shiftId)
  const shiftSummary = (shiftId) => {
    const pays = shiftPayments(shiftId)
    const sumMethod = m => pays.filter(p => p.method === m).reduce((a, p) => a + Number(p.amount || 0), 0)
    return {
      total: pays.reduce((a, p) => a + Number(p.amount || 0), 0),
      cash: sumMethod('cash'),
      transfer: sumMethod('transfer'),
      wompi: sumMethod('wompi'),
      n1co: sumMethod('n1co'),
      paypal: sumMethod('paypal'),
      card: sumMethod('card'),
      count: pays.length,
      payments: pays
    }
  }

  // ── EVENTS (citas / perforaciones) ────────────
  const loadEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('start_at', { ascending: true })
    if (data) setEvents(data)
  }
  const saveEvent = async (data, id) => {
    const payload = blankToNull(data, ['client_id', 'end_at'])
    let error
    if (id) ({ error } = await supabase.from('events').update(payload).eq('id', id))
    else    ({ error } = await supabase.from('events').insert(payload))
    if (error) { showToast('Error al guardar evento: ' + error.message); return error }
    await loadEvents()
    showToast('Evento guardado ✓')
  }
  const deleteEvent = async (id) => {
    await supabase.from('events').delete().eq('id', id)
    await loadEvents()
    showToast('Evento eliminado')
  }

  // ── SETTINGS ──────────────────────────────────
  const loadSettings = async () => {
    const { data } = await supabase.from('settings').select('*')
    if (data) {
      const s = {}
      data.forEach(row => { s[row.key] = row.value })
      setSettings(s)
    }
  }
  const saveSetting = async (key, value) => {
    await supabase.from('settings').upsert({ key, value })
    setSettings(prev => ({ ...prev, [key]: value }))
  }
  const saveSettingsBatch = async (obj) => {
    const rows = Object.entries(obj).map(([key, value]) => ({ key, value }))
    await supabase.from('settings').upsert(rows)
    setSettings(prev => ({ ...prev, ...obj }))
    showToast('Configuración guardada ✓')
  }

  // ── EMPLOYEES ─────────────────────────────────
  const [employees, setEmployees] = useState([])
  const loadEmployees = async () => {
    const { data } = await supabase.from('profiles').select('id, name, role')
    if (data) setEmployees(data)
  }
  useEffect(() => { if (user) loadEmployees() }, [user])

  // ── HELPERS ───────────────────────────────────
  const usd = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fdate = (d) => {
    if (!d) return '—'
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  const catName = (id) => categories.find(c => c.id === id)?.name || '—'
  const clientName = (id) => {
    const c = clients.find(x => x.id === id)
    return c ? `${c.name} ${c.surname}` : '—'
  }
  const statusBadge = (s) => {
    const m = {
      disponible:'tg-g', reservado:'tg', vendido:'tg-r', agotado:'tg-gray',
      pendiente:'tg-r', confirmado:'tg-b', proceso:'tg', listo:'tg-g', entregado:'tg-g', cancelado:'tg-gray',
      pagada:'tg-g', impaga:'tg-r', nueva:'tg-b', contactado:'tg', propuesta:'tg-purple',
      negociacion:'tg', ganada:'tg-g', perdida:'tg-r', borrador:'tg-gray',
      'en camino':'tg'
    }
    return <span className={`tag ${m[s] || 'tg-gray'}`}>{s || '—'}</span>
  }
  const segBadge = (s) => {
    const m = { vip:'tg', regular:'tg-b', nuevo:'tg-g', inactivo:'tg-gray' }
    return <span className={`tag ${m[s] || 'tg-gray'}`}>{(s || '').toUpperCase()}</span>
  }

  return (
    <DataContext.Provider value={{
      user, profile, loading, toast, showToast, login, logout,
      categories, saveCategory, deleteCategory,
      products, saveProduct, deleteProduct, toggleFeatured,
      clients, saveClient, deleteClient, loadClients,
      opportunities, saveOpportunity, deleteOpportunity,
      orders, saveOrder,
      invoices, createInvoice, markInvoicePaid,
      deliveries, saveDelivery,
      payments, savePayment, deletePayment, orderPayments, orderPaid, quickSale,
      events, saveEvent, deleteEvent,
      shifts, currentShift, openShift, closeShift, shiftSummary, loadCurrentShift,
      settings, saveSetting, saveSettingsBatch,
      employees, loadEmployees,
      usd, fdate, catName, clientName, statusBadge, segBadge
    }}>
      {children}
    </DataContext.Provider>
  )
}
