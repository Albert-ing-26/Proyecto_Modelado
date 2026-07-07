import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login = ({ onToggleView }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, ingresa tu email y contraseña.');
      return;
    }

    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.message);
    }
  };

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="clinical-auth-container">
      <div className="clinical-auth-card animate-fade-in">
        <div className="clinical-brand">
          <span className="medical-icon">🏥</span>
          <h2>Centro Médico Salud</h2>
          <p>Gestor de Citas Médicas</p>
        </div>
        
        <h3>Iniciar Sesión</h3>
        {error && <div className="clinical-error-msg">{error}</div>}
        
        <form onSubmit={handleSubmit} className="clinical-form">
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="clinical-btn primary" disabled={loading}>
            {loading ? 'Accediendo...' : 'Ingresar'}
          </button>
        </form>

        <div className="clinical-auth-toggle">
          ¿No tienes una cuenta?{' '}
          <button className="link-btn" onClick={onToggleView}>
            Regístrate aquí
          </button>
        </div>

        <div className="demo-shortcuts">
          <p className="demo-title">Accesos Rápidos de Prueba:</p>
          <div className="demo-grid">
            <button 
              className="demo-card-btn" 
              onClick={() => handleQuickLogin('juan@gmail.com', '1230')}
            >
              <strong>Paciente: Juan</strong>
              <span>juan@gmail.com (1230)</span>
            </button>
            <button 
              className="demo-card-btn" 
              onClick={() => handleQuickLogin('milagros@gmail.com', '1234')}
            >
              <strong>Paciente: Milagros</strong>
              <span>milagros@gmail.com (1234)</span>
            </button>
            <button 
              className="demo-card-btn admin" 
              onClick={() => handleQuickLogin('admin@citas.com', 'admin123')}
            >
              <strong>Administrador</strong>
              <span>admin@citas.com (admin123)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
