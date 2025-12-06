import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    (async () => {
      const result = await login(username, password);
      if (result && result.success) {
        navigate('/inicio');
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
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="login-button">
            Iniciar sesion
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;


