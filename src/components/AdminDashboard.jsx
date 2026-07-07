import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  
  // Set default date to today in YYYY-MM-DD format
  const getTodayDateString = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  };

  const [filterDate, setFilterDate] = useState(getTodayDateString());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch appointments for the selected date
  const fetchDailySchedule = async (date) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/admin/appointments?fecha=${date}`);
      if (!res.ok) throw new Error('Error al cargar la agenda del día');
      const data = await res.json();
      setAppointments(data);
    } catch (err) {
      console.error(err);
      setError('Error al sincronizar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filterDate) {
      fetchDailySchedule(filterDate);
    }
  }, [filterDate]);

  // Helpers to format representations
  const formatDateString = (sqlDate) => {
    if (!sqlDate) return '';
    const parts = sqlDate.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return sqlDate;
  };

  const formatTimeString = (sqlTime) => {
    if (!sqlTime) return '';
    if (sqlTime.includes('T')) {
      return sqlTime.split('T')[1].substring(0, 5);
    }
    return sqlTime.substring(0, 5);
  };

  return (
    <div className="clinical-dashboard">
      {/* Navigation */}
      <nav className="clinical-nav admin-nav">
        <div className="nav-brand">
          <span className="medical-icon">🏥</span>
          <h1>Portal Administrativo</h1>
        </div>
        <div className="nav-user-info">
          <span>Administrador: <strong>{user.Nombre}</strong></span>
          <button className="clinical-logout-btn" onClick={logout}>Cerrar Sesión</button>
        </div>
      </nav>

      {/* Admin Panel Layout */}
      <main className="admin-layout animate-fade-in">
        
        {/* Daily Schedule Controls */}
        <section className="admin-controls-card">
          <div className="controls-row">
            <div className="controls-title">
              <h2>Agenda Diaria de la Clínica</h2>
              <p>Revisa y supervisa las citas médicas programadas por fecha.</p>
            </div>
            
            <div className="datepicker-group">
              <label htmlFor="agenda-date">Seleccionar Fecha: </label>
              <input
                id="agenda-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="admin-date-input"
              />
            </div>
          </div>
        </section>

        {/* Schedule Display */}
        <section className="admin-schedule-table-card">
          {error && <div className="clinical-error-banner">{error}</div>}
          
          {loading ? (
            <div className="table-loading-container">
              <div className="spinner"></div>
              <p>Cargando agenda del día {formatDateString(filterDate)}...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="table-empty-state">
              <p>📭 No hay citas registradas para el {formatDateString(filterDate)}.</p>
              <span>Intenta buscar otra fecha o espera a que los pacientes reserven citas.</span>
            </div>
          ) : (
            <div className="responsive-table-wrapper">
              <table className="admin-appointments-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Especialidad</th>
                    <th>Médico</th>
                    <th>Paciente</th>
                    <th>Correo Electrónico</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((app) => (
                    <tr key={app.ID_Cita} className={`row-status-${app.Estado.toLowerCase()}`}>
                      <td className="cell-time">
                        ⏰ {formatTimeString(app.Hora)}
                      </td>
                      <td>
                        <strong>{app.EspecialidadNombre}</strong>
                      </td>
                      <td className="cell-doctor">
                        👨‍⚕️ {app.MedicoNombre}
                      </td>
                      <td className="cell-patient">
                        {app.PacienteNombre}
                      </td>
                      <td className="cell-email">
                        {app.PacienteEmail}
                      </td>
                      <td>
                        <span className={`status-badge ${app.Estado.toLowerCase()}`}>
                          {app.Estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="table-summary-info">
                <span>Total de citas programadas para el día: <strong>{appointments.length}</strong></span>
              </div>
            </div>
          )}
        </section>

      </main>
      
      <footer className="dashboard-footer">
        <p>© {new Date().getFullYear()} Centro Médico Salud. Panel de Control de Citas.</p>
      </footer>
    </div>
  );
};

export default AdminDashboard;
