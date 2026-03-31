import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'

export default function Login() {
  const { login } = useData()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setErr('')
    const error = await login(email, pass)
    setLoading(false)
    if (error) setErr(error)
    else nav('/admin')
  }

  return (
    <div id="login-page">
      <form className="lb" onSubmit={submit}>
        <div className="lb-logo">bybega</div>
        <div className="lb-sub">Sistema de Gestión · El Salvador</div>
        <label>Correo</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@bybega.com" required autoFocus />
        <label>Contraseña</label>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required />
        {err && <div style={{ color: '#e57373', fontSize: 12, marginBottom: 10 }}>{err}</div>}
        <button className="lb-btn" type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar al sistema'}
        </button>
      </form>
    </div>
  )
}
