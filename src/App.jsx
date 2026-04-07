import { Routes, Route, Navigate } from 'react-router-dom'
import { useData } from './context/DataContext'
import Login from './pages/Login'
import AdminLayout from './pages/AdminLayout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Opportunities from './pages/Opportunities'
import Orders from './pages/Orders'
import Invoices from './pages/Invoices'
import Deliveries from './pages/Deliveries'
import Inventory from './pages/Inventory'
import Suppliers from './pages/Suppliers'
import Repairs from './pages/Repairs'
import CustomOrders from './pages/CustomOrders'
import Expenses from './pages/Expenses'
import Certificates from './pages/Certificates'
import Settings from './pages/Settings'
import Banners from './pages/Banners'
import WebView from './pages/WebView'

function Toast() {
  const { toast } = useData()
  if (!toast) return null
  return <div className="toast">{toast}</div>
}

function ProtectedRoute({ children }) {
  const { user, loading } = useData()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#1a1714', color:'#b8974a', fontFamily:'Cormorant Garamond, serif', fontSize:24, letterSpacing:2 }}>
      bybega…
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/web" element={<WebView />} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="productos" element={<Products />} />
          <Route path="categorias" element={<Categories />} />
          <Route path="clientes" element={<Clients />} />
          <Route path="clientes/:id" element={<ClientDetail />} />
          <Route path="oportunidades" element={<Opportunities />} />
          <Route path="pedidos" element={<Orders />} />
          <Route path="personalizados" element={<CustomOrders />} />
          <Route path="facturas" element={<Invoices />} />
          <Route path="entregas" element={<Deliveries />} />
          <Route path="reparaciones" element={<Repairs />} />
          <Route path="inventario" element={<Inventory />} />
          <Route path="proveedores" element={<Suppliers />} />
          <Route path="gastos" element={<Expenses />} />
          <Route path="certificados" element={<Certificates />} />
          <Route path="configuracion" element={<Settings />} />
          <Route path="banners" element={<Banners />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
      <Toast />
    </>
  )
}
