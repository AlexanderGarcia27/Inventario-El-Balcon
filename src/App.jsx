import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Login from './components/Login';
import Dashboard from './views/Dashboard';
import Inventario from './views/Inventario';
import Ventas from './views/Ventas';
// ¡IMPORTAR EL NUEVO COMPONENTE DE GANANCIAS!
import Ganancias from './views/Ganancias';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/inicio" replace /> : <Login />}
      />
      <Route
        path="/inicio"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventario"
        element={
          <ProtectedRoute>
            <Inventario />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ventas"
        element={
          <ProtectedRoute>
            <Ventas />
          </ProtectedRoute>
        }
      />
      {/* NUEVA RUTA: /ganancias */}
      <Route
        path="/ganancias"
        element={
          <ProtectedRoute>
            <Ganancias />
          </ProtectedRoute>
        }
      />
      {/* FIN NUEVA RUTA */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/inicio" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;