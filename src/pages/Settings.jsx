import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const { settings, saveSettingsBatch, showToast, employees, loadEmployees } = useData()

  const [form, setForm] = useState({
    company:'', nit:'', address:'', phone:'', email:'', instagram:'', slogan:'',
    web3forms_key:'', notif_email:'',
    pay_cash_enabled:'true', pay_transfer_enabled:'true', pay_paypal_enabled:'false', pay_card_enabled:'false',
    bank_name:'', bank_account:'', bank_holder:'', bank_type:'cuenta corriente',
    paypal_link:'', card_link:'',
    web_mode:'pedido'
  })
  const [empModal, setEmpModal] = useState(null)
  const [testResult, setTestResult] = useState('')
  const [inviting, setInviting] = useState(false)
  const [newEmp, setNewEmp] = useState({ email:'', name:'', role:'vendedor' })

  useEffect(() => {
    if (settings.company !== undefined) {
      setForm(prev => ({
        ...prev,
        company: settings.company || '',
        nit: settings.nit || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        instagram: settings.instagram || '',
        slogan: settings.slogan || '',
        web3forms_key: settings.web3forms_key || '',
        notif_email: settings.notif_email || '',
        pay_cash_enabled:     settings.pay_cash_enabled     ?? 'true',
        pay_transfer_enabled: settings.pay_transfer_enabled ?? 'true',
        pay_paypal_enabled:   settings.pay_paypal_enabled   ?? 'false',
        pay_card_enabled:     settings.pay_card_enabled     ?? 'false',
        bank_name:    settings.bank_name    || '',
        bank_account: settings.bank_account || '',
        bank_holder:  settings.bank_holder  || '',
        bank_type:    settings.bank_type    || 'cuenta corriente',
        paypal_link:  settings.paypal_link  || '',
        card_link:    settings.card_link    || '',
        web_mode:     settings.web_mode     || 'pedido'
      }))
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
    const email = newEmp.email.trim().toLowerCase()
    const name = newEmp.name.trim()
    if (!name) { showToast('El nombre es obligatorio'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { showToast('Email no válido'); return }
    setInviting(true)

    // Generamos una contraseña aleatoria fuerte que el empleado nunca verá:
    // pediremos un reset inmediato para que él mismo establezca la suya.
    const arr = new Uint8Array(18)
    crypto.getRandomValues(arr)
    const tempPass = Array.from(arr, b => b.toString(36)).join('').slice(0, 24)

    const { error: signErr } = await supabase.auth.signUp({
      email, password: tempPass,
      options: { data: { name, role: newEmp.role } }
    })

    if (signErr) {
      showToast('No se pudo crear: ' + signErr.message)
      setInviting(false)
      return
    }

    // Enviamos email de reset para que el empleado fije su contraseña
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login'
    })

    if (resetErr) {
      showToast('Empleado creado, pero no se pudo enviar el email de invitación. Pídele que use "Olvidé mi contraseña" en el login.')
    } else {
      showToast('Invitación enviada a ' + email + ' · debe revisar su correo')
    }
    setNewEmp({ email:'', name:'', role:'vendedor' })
    loadEmployees()
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

      {/* MÉTODOS DE PAGO */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-title" style={{ marginBottom: 4 }}>💳 Métodos de pago aceptados</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 18, lineHeight: 1.7 }}>
          Activa los métodos que aceptas. Los clientes verán solo los activados al hacer un pedido en la web.
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:18 }}>
          {/* Cash */}
          <div style={{ padding:16, border:'1px solid rgba(0,0,0,.08)', borderRadius:10, background: form.pay_cash_enabled === 'true' ? 'rgba(46,125,82,.04)' : 'transparent' }}>
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
              <input type="checkbox" checked={form.pay_cash_enabled === 'true'} onChange={e => s('pay_cash_enabled', e.target.checked ? 'true' : 'false')} />
              <span style={{ fontWeight:500 }}>💵 Efectivo (contra entrega)</span>
            </label>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:6, paddingLeft:24 }}>El cliente paga en efectivo al recibir o al recoger en tienda.</div>
          </div>

          {/* Transfer */}
          <div style={{ padding:16, border:'1px solid rgba(0,0,0,.08)', borderRadius:10, background: form.pay_transfer_enabled === 'true' ? 'rgba(46,125,82,.04)' : 'transparent' }}>
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
              <input type="checkbox" checked={form.pay_transfer_enabled === 'true'} onChange={e => s('pay_transfer_enabled', e.target.checked ? 'true' : 'false')} />
              <span style={{ fontWeight:500 }}>🏦 Transferencia bancaria</span>
            </label>
            {form.pay_transfer_enabled === 'true' && (
              <div style={{ marginTop:10, paddingLeft:24, display:'grid', gap:8 }}>
                <input value={form.bank_name} onChange={e => s('bank_name', e.target.value)} placeholder="Banco (BAC, Cuscatlán, Agrícola…)" style={{ padding:'8px 12px', fontSize:13, border:'1px solid rgba(0,0,0,.14)', borderRadius:6 }} />
                <input value={form.bank_holder} onChange={e => s('bank_holder', e.target.value)} placeholder="Nombre del titular" style={{ padding:'8px 12px', fontSize:13, border:'1px solid rgba(0,0,0,.14)', borderRadius:6 }} />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 140px', gap:6 }}>
                  <input value={form.bank_account} onChange={e => s('bank_account', e.target.value)} placeholder="Número de cuenta" style={{ padding:'8px 12px', fontSize:13, border:'1px solid rgba(0,0,0,.14)', borderRadius:6 }} />
                  <select value={form.bank_type} onChange={e => s('bank_type', e.target.value)} style={{ padding:'8px 12px', fontSize:13, border:'1px solid rgba(0,0,0,.14)', borderRadius:6 }}>
                    <option value="cuenta corriente">Corriente</option>
                    <option value="cuenta de ahorros">Ahorros</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* PayPal */}
          <div style={{ padding:16, border:'1px solid rgba(0,0,0,.08)', borderRadius:10, background: form.pay_paypal_enabled === 'true' ? 'rgba(46,125,82,.04)' : 'transparent' }}>
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
              <input type="checkbox" checked={form.pay_paypal_enabled === 'true'} onChange={e => s('pay_paypal_enabled', e.target.checked ? 'true' : 'false')} />
              <span style={{ fontWeight:500 }}>🅿️ PayPal</span>
            </label>
            {form.pay_paypal_enabled === 'true' && (
              <div style={{ marginTop:10, paddingLeft:24 }}>
                <input value={form.paypal_link} onChange={e => s('paypal_link', e.target.value)} placeholder="https://paypal.me/tubybega o tu email PayPal" style={{ width:'100%', padding:'8px 12px', fontSize:13, border:'1px solid rgba(0,0,0,.14)', borderRadius:6 }} />
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Crea un link en paypal.me para recibir pagos directamente.</div>
              </div>
            )}
          </div>

          {/* Card */}
          <div style={{ padding:16, border:'1px solid rgba(0,0,0,.08)', borderRadius:10, background: form.pay_card_enabled === 'true' ? 'rgba(46,125,82,.04)' : 'transparent' }}>
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
              <input type="checkbox" checked={form.pay_card_enabled === 'true'} onChange={e => s('pay_card_enabled', e.target.checked ? 'true' : 'false')} />
              <span style={{ fontWeight:500 }}>💳 Tarjeta de crédito / débito</span>
            </label>
            {form.pay_card_enabled === 'true' && (
              <div style={{ marginTop:10, paddingLeft:24 }}>
                <input value={form.card_link} onChange={e => s('card_link', e.target.value)} placeholder="Link de cobro Wompi / Stripe / N1co" style={{ width:'100%', padding:'8px 12px', fontSize:13, border:'1px solid rgba(0,0,0,.14)', borderRadius:6 }} />
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Pega el link de tu pasarela (Wompi, Stripe, N1co…). El cliente paga ahí y luego confirmas en el sistema.</div>
              </div>
            )}
          </div>
        </div>

        {/* Modo web */}
        <div style={{ paddingTop:16, borderTop:'1px solid rgba(0,0,0,.08)' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>🌐 Modo de la web pública</div>
          <div style={{ display:'flex', gap:10 }}>
            <label style={{ flex:1, padding:14, border:`2px solid ${form.web_mode==='pedido'?'var(--gold)':'rgba(0,0,0,.08)'}`, borderRadius:10, cursor:'pointer', background: form.web_mode==='pedido' ? 'rgba(184,151,74,.06)' : 'transparent' }}>
              <input type="radio" name="web_mode" checked={form.web_mode==='pedido'} onChange={() => s('web_mode','pedido')} style={{ marginRight:8 }} />
              <strong style={{ fontSize:13 }}>Realizar pedido</strong>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>El cliente arma su pedido y lo envía. Llega como pedido pendiente al admin.</div>
            </label>
            <label style={{ flex:1, padding:14, border:`2px solid ${form.web_mode==='cotizacion'?'var(--gold)':'rgba(0,0,0,.08)'}`, borderRadius:10, cursor:'pointer', background: form.web_mode==='cotizacion' ? 'rgba(184,151,74,.06)' : 'transparent' }}>
              <input type="radio" name="web_mode" checked={form.web_mode==='cotizacion'} onChange={() => s('web_mode','cotizacion')} style={{ marginRight:8 }} />
              <strong style={{ fontSize:13 }}>Solicitar cotización</strong>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>El cliente solo expresa interés. Llega como oportunidad al CRM.</div>
            </label>
          </div>
        </div>

        <button className="btn btn-gold" onClick={saveAll} style={{ marginTop:18 }}>Guardar métodos de pago</button>
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
            Se creará el usuario en Supabase Auth y se le enviará un email para que él mismo establezca su contraseña.
          </div>
        </div>
      </div>
    </div>
  )
}
