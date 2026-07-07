import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const PacienteDashboard = () => {
  const { user, logout } = useAuth();
  
  // States for list of appointments
  const [appointments, setAppointments] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  // States for booking form
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableHours, setAvailableHours] = useState([]);
  const [selectedHour, setSelectedHour] = useState('');
  
  // Feedback states
  const [bookingLoading, setBookingLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmModalData, setConfirmModalData] = useState(null);

  // Fetch patient's appointments
  const fetchAppointments = async () => {
    try {
      setListLoading(true);
      const res = await fetch(`/api/patients/${user.ID_Usuario}/appointments`);
      if (!res.ok) throw new Error('Error al cargar historial de citas');
      const data = await res.json();
      setAppointments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setListLoading(false);
    }
  };

  // Fetch specialties on mount
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const res = await fetch('/api/specialties');
        if (!res.ok) throw new Error('Error al cargar especialidades');
        const data = await res.json();
        setSpecialties(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchAppointments();
    fetchSpecialties();
  }, []);

  // Fetch doctors when specialty changes
  useEffect(() => {
    const fetchDoctors = async () => {
      if (!selectedSpecialty) {
        setDoctors([]);
        setSelectedDoctor('');
        return;
      }
      try {
        const res = await fetch(`/api/specialties/${selectedSpecialty}/doctors`);
        if (!res.ok) throw new Error('Error al cargar médicos');
        const data = await res.json();
        setDoctors(data);
        setSelectedDoctor('');
      } catch (error) {
        console.error(error);
      }
    };

    fetchDoctors();
  }, [selectedSpecialty]);

  // Fetch available hours when doctor or date changes
  useEffect(() => {
    const fetchHours = async () => {
      if (!selectedDoctor || !selectedDate) {
        setAvailableHours([]);
        setSelectedHour('');
        return;
      }
      try {
        const res = await fetch(`/api/doctors/${selectedDoctor}/available-hours?fecha=${selectedDate}`);
        if (!res.ok) throw new Error('Error al cargar disponibilidad');
        const data = await res.json();
        setAvailableHours(data);
        setSelectedHour('');
      } catch (error) {
        console.error(error);
        setAvailableHours([]);
      }
    };

    fetchHours();
  }, [selectedDoctor, selectedDate]);

  // Handle book appointment
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedDate || !selectedHour) {
      setErrorMsg('Por favor selecciona un médico, fecha y hora.');
      return;
    }

    setBookingLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ID_Paciente: user.ID_Usuario,
          ID_Medico: parseInt(selectedDoctor, 10),
          Fecha: selectedDate,
          Hora: selectedHour
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccessMsg(`¡Cita agendada correctamente para el ${selectedDate} a las ${selectedHour}!`);
        // Reset form
        setSelectedSpecialty('');
        setSelectedDoctor('');
        setSelectedDate('');
        setAvailableHours([]);
        setSelectedHour('');
        // Refresh list
        fetchAppointments();
      } else {
        setErrorMsg(data.message || 'Error al reservar la cita.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudo establecer conexión con el servidor.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle cancel appointment (triggered from modal confirmation)
  const handleCancelAppointment = async (appointmentId) => {
    setConfirmModalData(null); // Cerrar modal inmediatamente
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ID_Paciente: user.ID_Usuario })
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg('Cita cancelada correctamente.');
        fetchAppointments();
      } else {
        setErrorMsg(data.message || 'No se pudo cancelar la cita.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar cancelar.');
    }
  };

  // Helper to format date
  const formatDateString = (sqlDate) => {
    if (!sqlDate) return '';
    const dateObj = new Date(sqlDate);
    // Ignore timezone shift for pure SQL Date
    const parts = sqlDate.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateObj.toLocaleDateString();
  };

  // Helper to format time (e.g. 08:00:00 -> 08:00)
  const formatTimeString = (sqlTime) => {
    if (!sqlTime) return '';
    if (sqlTime.includes('T')) {
      return sqlTime.split('T')[1].substring(0, 5);
    }
    return sqlTime.substring(0, 5);
  };

  // Get minimum date for input (today)
  const getTodayDateString = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  };

  return (
    <div className="clinical-dashboard">
      {/* Navigation */}
      <nav className="clinical-nav">
        <div className="nav-brand">
          <span className="medical-icon">🏥</span>
          <h1>Portal Médico Salud</h1>
        </div>
        <div className="nav-user-info">
          <span>Paciente: <strong>{user.Nombre}</strong></span>
          <button className="clinical-logout-btn" onClick={logout}>Cerrar Sesión</button>
        </div>
      </nav>

      {/* Main Content Layout */}
      <div className="clinical-layout">
        
        {/* Left Side: Appointment History */}
        <section className="clinical-section appointments-list-panel">
          <h2>Mis Citas Médicas</h2>
          {successMsg && <div className="clinical-success-banner">{successMsg}</div>}
          {errorMsg && <div className="clinical-error-banner">{errorMsg}</div>}
          
          {listLoading ? (
            <div className="list-loading">
              <div className="spinner"></div>
              <p>Cargando citas...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="empty-state">
              <p>No tienes citas médicas programadas.</p>
              <span>Usa el panel de la derecha para agendar tu primera cita.</span>
            </div>
          ) : (
            <div className="appointments-grid">
              {appointments.map((app) => (
                <div key={app.ID_Cita} className={`appointment-card status-${app.Estado.toLowerCase()}`}>
                  <div className="card-header">
                    <span className="app-specialty">{app.EspecialidadNombre}</span>
                    <span className={`status-badge ${app.Estado.toLowerCase()}`}>
                      {app.Estado}
                    </span>
                  </div>
                  <div className="card-body">
                    <p className="app-doctor">👨‍⚕️ {app.MedicoNombre}</p>
                    <div className="app-time">
                      <span>📅 {formatDateString(app.Fecha)}</span>
                      <span>⏰ {formatTimeString(app.Hora)} hrs</span>
                    </div>
                  </div>
                  {app.Estado === 'Pendiente' && (
                    <div className="card-footer">
                      <button 
                        className="cancel-app-btn"
                        onClick={() => setConfirmModalData(app)}
                      >
                        Cancelar Cita
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Side: Appointment Booking */}
        <section className="clinical-section booking-form-panel">
          <h2>Reservar Nueva Cita</h2>
          
          <form onSubmit={handleBookAppointment} className="booking-form">
            
            {/* 1. Specialty Dropdown */}
            <div className="form-group">
              <label htmlFor="specialty">Especialidad Médica</label>
              <select
                id="specialty"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                required
              >
                <option value="">-- Seleccionar Especialidad --</option>
                {specialties.map((spec) => (
                  <option key={spec.ID_Especialidad} value={spec.ID_Especialidad}>
                    {spec.Nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Doctor Dropdown */}
            <div className="form-group">
              <label htmlFor="doctor">Médico Especialista</label>
              <select
                id="doctor"
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                disabled={!selectedSpecialty}
                required
              >
                <option value="">-- Seleccionar Médico --</option>
                {doctors.map((doc) => (
                  <option key={doc.ID_Medico} value={doc.ID_Medico}>
                    {doc.Nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Date Picker */}
            <div className="form-group">
              <label htmlFor="date">Fecha de Atención</label>
              <input
                id="date"
                type="date"
                min={getTodayDateString()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={!selectedDoctor}
                required
              />
            </div>

            {/* 4. Hours Selection Grid */}
            {selectedDoctor && selectedDate && (
              <div className="hours-selection-group">
                <label>Horarios Disponibles</label>
                {availableHours.length === 0 ? (
                  <p className="no-hours-msg">
                    ⚠️ No hay horarios disponibles para esta fecha. Selecciona otro día.
                  </p>
                ) : (
                  <div className="hours-grid">
                    {availableHours.map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        className={`hour-slot-btn ${selectedHour === hour ? 'selected' : ''}`}
                        onClick={() => setSelectedHour(hour)}
                      >
                        {hour.substring(0, 5)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button 
              type="submit" 
              className="clinical-btn success"
              disabled={bookingLoading || !selectedHour}
            >
              {bookingLoading ? 'Agendando...' : 'Confirmar Reserva'}
            </button>

          </form>
        </section>

      </div>

      {/* Ventana Modal de Confirmación de Cancelación */}
      {confirmModalData && (
        <div className="clinical-modal-overlay">
          <div className="clinical-modal animate-fade-in">
            <span className="modal-warning-icon">⚠️</span>
            <h3>Confirmar Cancelación</h3>
            <p>
              ¿Estás seguro de que deseas cancelar la cita de <strong>{confirmModalData.EspecialidadNombre}</strong> con el/la <strong>{confirmModalData.MedicoNombre}</strong>?<br />
              Programada para el <strong>{formatDateString(confirmModalData.Fecha)}</strong> a las <strong>{formatTimeString(confirmModalData.Hora)} hrs</strong>.
            </p>
            <div className="modal-actions">
              <button 
                className="clinical-btn danger" 
                onClick={() => handleCancelAppointment(confirmModalData.ID_Cita)}
              >
                Sí, Cancelar Cita
              </button>
              <button 
                className="clinical-btn secondary" 
                onClick={() => setConfirmModalData(null)}
              >
                No, Conservar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PacienteDashboard;
