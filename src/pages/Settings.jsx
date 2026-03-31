import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const { settings, saveSettingsBatch, showToast, employees, loadEmployees } = useData()

  const [form, setForm] = useState({ company:'', nit:'', address:'', phone:'', email:'', instagram:'', slogan:'', web3forms_key:'', notif_email:'' })
  const [empModal, setEmpModal] = useState(null)
  const [testResult, setTestResult] = useState('')
  const [inviting, setInviting] = useState(false)
  const [newEmp, setNewEmp] = useState({ email:'', name:'', role:'vendedor' })

  useEffect(() => {
    if (settings.company) {
      setForm({
        company: settings.company || '',
        nit: settings.nit || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        instagram: settings.instagram || '',
        slogan: settings.slogan || '',
        web3forms_key: settings.web3forms_key || '',
        notif_email: settings.notif_email || ''
      })
    }
  }, [settings])

  const s = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const saveAll = () => saveSettingsBatch(form)

  const testEmail = async () => {
    if (!form.web3forms_key) { setTestResult('❌ Ingresa tu clave Web3Forms primero'); return }
    setTestResult('Enviando prueba…')
    try {
      const r = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: form.web3forms_key, subject: 'Prueba de email - bybega sistema', name: 'bybega Sistema', email: form.notif_email || form.email, message: '¡Email de prueba desde el panel bybega! Todo funciona correctamente.' })
      })
      const d = await r.json()
      setTestResult(d.success ? '✓ Email enviado. Revisa tu bandeja.' : '❌ Clave inválida o email incorrecto')
    } catch { setTestResult('❌ Error de conexión') }
  }

  const inviteEmployee = async () => {
    if (!newEmp.email || !newEmp.name) return
    setInviting(true)
    const { error } = await supabase.auth.admin?.inviteUserByEmail
      ? await supabase.auth.admin.inviteUserByEmail(newEmp.email, { data: { name: newEmp.name, role: newEmp.role } })
      : { error: null }

    // Fallback: signUp if admin invite not available
    if (!supabase.auth.admin) {
      const tempPass = 'bybega' + Math.random().toString(36).slice(2, 8)
      const { error: e } = await supabase.auth.signUp({ email: newEmp.email, password: tempPass, options: { data: { name: newEmp.name, role: newEmp.role } } })
      if (!e) { showToast(`Empleado creado. Contraseña temporal: ${tempPass}`); setNewEmp({ email:'', name:'', role:'vendedor' }); loadEmployees() }
      else showToast('Error: ' + e.message)
    } else if (!error) {
      showToast('Invitación enviada a ' + newEmp.email)
      setNewEmp({ email:'', name:'', role:'vendedor' })
      loadEmployees()
    }
    setInviting(false)
  }

  const ROLES = { admin: 'Administrador', vendedor: 'Vendedor', logistica: 'Logística', lectura: 'Solo lectura' }

  return (
    <div className="page">
      <div className="ph">
        <div><div className="pt"><span>Configuración</span></div><div className="ps">Datos del negocio, email y empleados</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Business data */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Datos del negocio</div>
          <div className="fg"><label>Nombre de la empresa</label><input value={form.company} onChange={e => s('company', e.target.value)} /></div>
          <div className="fg"><label>NIT</label><input value={form.nit} onChange={e => s('nit', e.target.value)} placeholder="0000-000000-000-0" /></div>
          <div className="fg"><label>Dirección fiscal</label><input value={form.address} onChange={e => s('address', e.target.value)} /></div>
          <div className="fr">
            <div className="fg"><label>Teléfono / WhatsApp</label><input value={form.phone} onChange={e => s('phone', e.target.value)} /></div>
            <div className="fg"><label>Email</label><input value={form.email} onChange={e => s('email', e.target.value)} /></div>
          </div>
          <div className="fg"><label>Instagram</label><input value={form.instagram} onChange={e => s('instagram', e.target.value)} placeholder="@bybega_shop" /></div>
          <div className="fg"><label>Eslogan (web pública)</label><input value={form.slogan} onChange={e => s('slogan', e.target.value)} /></div>
          <button className="btn btn-gold" onClick={saveAll}>Guardar datos</button>
        </div>

        {/* Email config */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>📧 Notificaciones por email</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.7 }}>
            Cuando alguien llene el formulario web, recibirás un email automático con los datos del cliente y los productos consultados.
          </div>
          <div style={{ background: '#f9f7f4', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 12, lineHeight: 1.8, color: 'var(--mid)' }}>
            <strong>Pasos para activar:</strong><br />
            1. Ve a <strong style={{ color: 'var(--info)' }}>web3forms.com/access</strong><br />
            2. Ingresa tu email → recibirás tu clave<br />
            3. Pega la clave abajo y guarda
          </div>
          <div className="fg"><label>Email de notificaciones</label><input type="email" value={form.notif_email} onChange={e => s('notif_email', e.target.value)} placeholder="tu@email.com" /></div>
          <div className="fg"><label>Clave Web3Forms (Access Key)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={form.web3forms_key} onChange={e => s('web3forms_key', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style={{ flex: 1 }} />
              <a href="https://web3forms.com/access" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ textDecoration: 'none', lineHeight: 1.8 }}>Obtener clave</a>
            </div>
          </div>
          {testResult && <div style={{ fontSize: 12, marginBottom: 10, color: testResult.startsWith('✓') ? 'var(--success)' : testResult.startsWith('❌') ? 'var(--danger)' : 'var(--muted)' }}>{testResult}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-gold" onClick={saveAll}>Guardar</button>
            <button className="btn btn-outline" onClick={testEmail}>Probar envío</button>
          </div>
          {form.web3forms_key
            ? <div style={{ marginTop: 10, fontSize: 12, color: 'var(--success)' }}>✓ Email configurado</div>
            : <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>⚠ Configura tu clave para activar los emails</div>
          }
        </div>
      </div>

      {/* Employees */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Empleados ({employees.length}/5)</div>
        </div>
        <div className="tw" style={{ marginBottom: 20 }}>
          <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th></tr></thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 500 }}>{e.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{e.email || '—'}</td>
                  <td><span className="tag tg-b">{ROLES[e.role] || e.role}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ borderTop: '1px solid rgba(0,0,0,.07)', paddingTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Agregar nuevo empleado</div>
          <div className="fr3">
            <div className="fg"><label>Nombre</label><input value={newEmp.name} onChange={e => setNewEmp(p => ({ ...p, name: e.target.value }))} placeholder="Nombre completo" /></div>
            <div className="fg"><label>Email</label><input type="email" value={newEmp.email} onChange={e => setNewEmp(p => ({ ...p, email: e.target.value }))} placeholder="empleado@email.com" /></div>
            <div className="fg"><label>Rol</label>
              <select value={newEmp.role} onChange={e => setNewEmp(p => ({ ...p, role: e.target.value }))}>
                {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-gold" onClick={inviteEmployee} disabled={inviting}>
            {inviting ? 'Creando…' : '+ Crear empleado'}
          </button>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
            Se creará el usuario en Supabase Auth. El empleado podrá iniciar sesión con su email y la contraseña que se mostrará en pantalla.
          </div>
        </div>
      </div>
    </div>
  )
}
