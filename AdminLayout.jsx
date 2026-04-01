import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'

const NAV = [
  { section: 'Principal' },
  { to: '/admin', label: 'Dashboard', icon: '◈', end: true },
  { section: 'Catálogo' },
  { to: '/admin/productos', label: 'Productos', icon: '◇' },
  { to: '/admin/categorias', label: 'Categorías', icon: '⊞' },
  { section: 'Ventas' },
  { to: '/admin/clientes', label: 'Clientes', icon: '◎' },
  { to: '/admin/oportunidades', label: 'Oportunidades', icon: '◉' },
  { to: '/admin/pedidos', label: 'Pedidos', icon: '▤' },
  { to: '/admin/facturas', label: 'Facturas', icon: '◈' },
  { to: '/admin/entregas', label: 'Entregas', icon: '▷' },
  { to: '/admin/inventario', label: 'Inventario', icon: '◫' },
  { section: 'Sistema' },
  { to: '/admin/configuracion', label: 'Configuración', icon: '⚙' },
]

export default function AdminLayout() {
  const { profile, logout } = useData()
  const nav = useNavigate()

  const roleLabel = { admin: 'Administrador', vendedor: 'Vendedor', logistica: 'Logística', lectura: 'Solo lectura' }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-name">bybega</div>
          <div className="sb-logo-sub">Gestión Integral</div>
        </div>
        <nav className="sb-nav">
          {NAV.map((item, i) =>
            item.section ? (
              <div className="sb-section" key={i}>{item.section}</div>
            ) : (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => 'ni' + (isActive ? ' active' : '')}>
                <span className="ni-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            )
          )}
          <div className="sb-section">Web</div>
          <div className="ni" onClick={() => window.open('/web', '_blank')}>
            <span className="ni-icon">🌐</span>
            <span>Web pública</span>
          </div>
        </nav>
        <div className="sb-user">
          <div className="sb-user-name">{profile?.name || 'Usuario'}</div>
          <div className="sb-user-role">{roleLabel[profile?.role] || profile?.role}</div>
          <button className="logout-btn" onClick={() => { logout(); nav('/login') }}>← Salir</button>
        </div>
      </aside>
      <main className="main-area">
        <Outlet />
      </main>
    </div>
  )
}
