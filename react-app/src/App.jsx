import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ClientesProvider } from './context/ClientesContext'
import ProtectedRoute from './routes/ProtectedRoute'
import MainLayout from './layout/MainLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ClientesTablaPage from './pages/ClientesTablaPage'
import ClienteFormPage from './pages/ClienteFormPage'
import ClienteEditarPage from './pages/ClienteEditarPage'
import AbonoPage from './pages/AbonoPage'
import CambiarContrasenaPage from './pages/CambiarContrasenaPage'

export default function App() {
  return (
    <AuthProvider>
      <ClientesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/panel" element={<DashboardPage />} />
                <Route path="/clientes/nuevo" element={<ClienteFormPage />} />
                <Route path="/clientes/nuevo/:tipo" element={<ClienteFormPage />} />
                <Route path="/clientes/editar/:id" element={<ClienteEditarPage />} />
                <Route path="/clientes/abono/:id" element={<AbonoPage />} />
                <Route path="/clientes/:tipo" element={<ClientesTablaPage />} />
                <Route path="/cuenta/contrasena" element={<CambiarContrasenaPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ClientesProvider>
    </AuthProvider>
  )
}
