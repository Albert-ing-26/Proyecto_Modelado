import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('clinica_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('clinica_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('clinica_user');
    }
  }, [user]);

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Credenciales incorrectas' };
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      return { success: false, message: 'No se pudo conectar al servidor de autenticación' };
    }
  };

  const register = async (nombre, email, password) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password }),
      });
      const data = await response.json();
      if (data.success) {
        // Auto-login after successful registration
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Error al registrar la cuenta' };
      }
    } catch (error) {
      console.error('Error en registro:', error);
      return { success: false, message: 'No se pudo conectar al servidor.' };
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
