import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Register = ({ onToggleView }) => {
  const { register } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre || !email || !password || !confirmPassword) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setError('');
    setLoading(true);
    const result = await register(nombre, email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div className="clinical-auth-container">
      <div className="clinical-auth-card animate-fade-in">
        <div className="clinical-brand">
          <span className="medical-icon">🏥</span>
          <h2>Centro Médico Salud</h2>
          <p>Creación de Cuenta de Paciente</p>
        </div>

        <h3>Registro de Paciente</h3>
        {error && <div className="clinical-error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="clinical-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo</label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan Pérez"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="paciente@correo.com"
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
              placeholder="Crea una contraseña"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              required
            />
          </div>
          <button type="submit" className="clinical-btn primary" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <div className="clinical-auth-toggle">
          ¿Ya tienes cuenta?{' '}
          <button className="link-btn" onClick={onToggleView}>
            Inicia sesión aquí
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;
