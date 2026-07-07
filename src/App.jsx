import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import PacienteDashboard from './components/PacienteDashboard';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

const MainApp = () => {
  const { user } = useAuth();
  const [isRegisterView, setIsRegisterView] = useState(false);

  if (!user) {
    return isRegisterView ? (
      <Register onToggleView={() => setIsRegisterView(false)} />
    ) : (
      <Login onToggleView={() => setIsRegisterView(true)} />
    );
  }

  // Route based on roles
  if (user.Rol === 'Admin') {
    return <AdminDashboard />;
  }

  return <PacienteDashboard />;
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
