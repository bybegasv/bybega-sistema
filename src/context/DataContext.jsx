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
      loadSettings()
    }
  }, [user])

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
    if (id) await supabase.from('clients').update(data).eq('id', id)
    else await supabase.from('clients').insert(data)
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
      settings, saveSetting, saveSettingsBatch,
      employees, loadEmployees,
      usd, fdate, catName, clientName, statusBadge, segBadge
    }}>
      {children}
    </DataContext.Provider>
  )
}
