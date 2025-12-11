import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext'; // <-- 1. Importar useData
import Swal from "sweetalert2";
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { refreshData } = useData(); // <-- 2. Obtener refreshData del contexto

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    (async () => {
      const result = await login(username, password);
      setLoading(false);

      if (result && result.success) {

        // 3. LLAMADA CLAVE: Al iniciar sesión con éxito, forzamos la carga 
        // inicial de todos los datos necesarios para la aplicación.
        // Esto evita que los componentes Dashboard/Inventario/Ventas tengan que hacer
        // la llamada la primera vez.
        await refreshData.loadAllData();

        Swal.fire({
          icon: 'success',
          title: 'Inicio de sesión exitoso',
          text: 'Bienvenido!',
          timer: 1500,
          showConfirmButton: false
        });

        setTimeout(() => {
          navigate('/inicio');
        }, 1500);
      } else {
        setError(result?.message || 'Usuario o contraseña incorrectos');
      }
    })();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Sistema de inventario</h1>
        <p className="login-subtitle">Administra productos, entradas, salidas y ventas</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="login-input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-input"
              disabled={loading}
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <span className="spinner"></span>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;