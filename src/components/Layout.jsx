import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';
import InicioIcon from '../assets/Inicio.svg';
import InventarioIcon from '../assets/inventario.svg';
import VentasIcon from '../assets/ventas.png';

const Layout = ({ children }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">
            Materiales el Balcon
          </h1>
        </div>
        <nav className="sidebar-nav">
          <Link
            to="/inicio"
            className={`nav-link ${isActive('/inicio') ? 'active' : ''}`}
          >
            <img src={InicioIcon} alt="Inicio" className="nav-icon" />
            <span>Inicio</span>
          </Link>
          <Link
            to="/inventario"
            className={`nav-link ${isActive('/inventario') ? 'active' : ''}`}
          >
            <img src={InventarioIcon} alt="Inventario" className="nav-icon" />
            <span>Inventario</span>
          </Link>
          <Link
            to="/ventas"
            className={`nav-link ${isActive('/ventas') ? 'active' : ''}`}
          >
            <img src={VentasIcon} alt="Ventas" className="nav-icon" />
            <span>Ventas</span>
          </Link>
        </nav>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export const Header = ({ title, showSearch = false, showUser = true, actionButton }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="page-header">
      <h1 className="page-title">{title}</h1>
      <div className="header-actions">
        <button className="logout-button" onClick={handleLogout}>
          Cerrar sesion
        </button>
        {actionButton}
      </div>
    </header>
  );
};

export default Layout;

