import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './MainLayout.css'

export default function MainLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <nav className="main-nav">
        <ul>
          <li><Link to="/panel">Inicio</Link></li>
          <li><Link to="/clientes/nuevo">Registrar usuario</Link></li>
          <li><Link to="/cuenta/contrasena">Cambiar contraseña</Link></li>
          <li className="main-nav__spacer" />
          <li>
            <button type="button" className="link-button" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </li>
        </ul>
      </nav>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
