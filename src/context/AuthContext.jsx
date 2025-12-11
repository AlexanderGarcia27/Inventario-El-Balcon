import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verificar si hay un usuario guardado en localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const res = await fetch('https://backend-inventario-balcon.onrender.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // El backend espera { "usuario": ..., "password": ... }
        body: JSON.stringify({ usuario: username, password })
      });

      if (!res.ok) {
        // Try to read error message from response
        let errMsg = 'Usuario o contraseña incorrectos';
        try {
          const errJson = await res.json();
          if (errJson && errJson.message) errMsg = errJson.message;
        } catch (e) {}
        return { success: false, message: errMsg };
      }

      const data = await res.json();
      const userData = data.user ?? data;
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(userData));
      if (data.token) localStorage.setItem('token', data.token);
      return { success: true };
    } catch (error) {
      return { success: false, message: 'No se pudo conectar con el servidor' };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};



