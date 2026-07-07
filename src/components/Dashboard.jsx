import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const isAdmin = user?.Rol === 'Admin';

  // Navigation state
  const [activeTab, setActiveTab] = useState(isAdmin ? 'citas-dia' : 'mis-citas');

  // Common UI feedback state
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // ==========================================
  // PATIENT DASHBOARD LOGIC
  // ==========================================
  const [appointments, setAppointments] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  // Booking Form State
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');

  // Fetch Patient Appointments
  const fetchPatientAppointments = async () => {
    if (isAdmin) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/patients/${user.ID_Usuario}/appointments`);
      if (!res.ok) throw new Error('No se pudieron obtener tus citas.');
      const data = await res.json();
      setAppointments(data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Specialties
  const fetchSpecialties = async () => {
    try {
      const res = await fetch('/api/specialties');
      if (!res.ok) throw new Error('Error al cargar especialidades.');
      const data = await res.json();
      setSpecialties(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Doctors when Specialty changes
  useEffect(() => {
    if (!selectedSpecialty) {
      setDoctors([]);
      setSelectedDoctor('');
      return;
    }
    const fetchDoctors = async () => {
      try {
        const res = await fetch(`/api/specialties/${selectedSpecialty}/doctors`);
        if (!res.ok) throw new Error('Error al cargar médicos.');
        const data = await res.json();
        setDoctors(data);
        setSelectedDoctor('');
        setAvailableSlots([]);
        setSelectedSlot('');
      } catch (err) {
        console.error(err);
      }
    };
    fetchDoctors();
  }, [selectedSpecialty]);

  // Fetch Available Slots when Doctor or Date changes
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) {
      setAvailableSlots([]);
      setSelectedSlot('');
      return;
    }
    const fetchSlots = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/doctors/${selectedDoctor}/available-slots?date=${selectedDate}`);
        if (!res.ok) throw new Error('Error al cargar horarios disponibles.');
        const data = await res.json();
        setAvailableSlots(data);
        setSelectedSlot('');
      } catch (err) {
        console.error(err);
        setErrorMsg('Error al cargar horarios disponibles.');
      } finally {
        setLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  // Handle Booking Submit
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      setErrorMsg('Por favor completa todos los campos del formulario.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ID_Paciente: user.ID_Usuario,
          ID_Medico: selectedDoctor,
          Fecha: selectedDate,
          Hora: selectedSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'No se pudo reservar la cita.');
      }

      setSuccessMsg('¡Cita reservada con éxito!');
      // Reset form
      setSelectedSpecialty('');
      setSelectedDoctor('');
      setSelectedDate('');
      setSelectedSlot('');
      // Refresh list and change tab
      fetchPatientAppointments();
      setTimeout(() => {
        setActiveTab('mis-citas');
        setSuccessMsg('');
      }, 1500);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Cancel Appointment
  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta cita?')) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      setLoading(true);
      const res = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ID_Paciente: user.ID_Usuario }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'No se pudo cancelar la cita.');
      }
      setSuccessMsg('Cita cancelada correctamente.');
      fetchPatientAppointments();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ADMINISTRATOR DASHBOARD LOGIC
  // ==========================================
  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [adminDate, setAdminDate] = useState(getTodayString());
  const [adminAppointments, setAdminAppointments] = useState([]);

  const fetchAdminAppointments = async () => {
    if (!isAdmin || !adminDate) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/appointments?date=${adminDate}`);
      if (!res.ok) throw new Error('Error al cargar las citas del día.');
      const data = await res.json();
      setAdminAppointments(data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial Data loading and triggers
  useEffect(() => {
    if (isAdmin) {
      fetchAdminAppointments();
    } else {
      fetchPatientAppointments();
      fetchSpecialties();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminAppointments();
    }
  }, [adminDate]);

  // Group appointments by doctor for the admin panel
  const groupAppointmentsByDoctor = (list) => {
    const groups = {};
    list.forEach(cita => {
      const doc = cita.MedicoNombre;
      if (!groups[doc]) {
        groups[doc] = [];
      }
      groups[doc].push(cita);
    });
    return groups;
  };

  const groupedAdminAppointments = groupAppointmentsByDoctor(adminAppointments);
  const totalCitas = adminAppointments.length;
  const activasCitas = adminAppointments.filter(c => c.Estado === 'Pendiente').length;
  const canceladasCitas = adminAppointments.filter(c => c.Estado === 'Cancelada').length;

  return (
    <div className="dashboard-container">
      {/* Navbar Header */}
      <header className="dashboard-header glass-panel">
        <div className="header-brand">
          <span className="brand-logo">🩺 GestorCitas</span>
          <span className="role-badge">{isAdmin ? 'ADMINISTRACIÓN' : 'PACIENTE'}</span>
        </div>
        <div className="header-user">
          <span className="user-name">Hola, <strong>{user?.Nombre}</strong></span>
          <button className="logout-btn secondary-btn" onClick={logout}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="dashboard-main">
        {/* Navigation Tabs */}
        <div className="dashboard-tabs">
          {!isAdmin ? (
            <>
              <button
                className={`tab-link ${activeTab === 'mis-citas' ? 'active' : ''}`}
                onClick={() => { setActiveTab('mis-citas'); setErrorMsg(''); setSuccessMsg(''); fetchPatientAppointments(); }}
              >
                📅 Mis Citas
              </button>
              <button
                className={`tab-link ${activeTab === 'nueva-cita' ? 'active' : ''}`}
                onClick={() => { setActiveTab('nueva-cita'); setErrorMsg(''); setSuccessMsg(''); }}
              >
                ➕ Nueva Cita
              </button>
            </>
          ) : (
            <button
              className={`tab-link ${activeTab === 'citas-dia' ? 'active' : ''}`}
              onClick={() => { setActiveTab('citas-dia'); setErrorMsg(''); setSuccessMsg(''); fetchAdminAppointments(); }}
            >
              📊 Citas del Día
            </button>
          )}
        </div>

        {/* Global Notifications */}
        {errorMsg && <div className="notification error-msg animate-fade-in">{errorMsg}</div>}
        {successMsg && <div className="notification success-msg animate-fade-in">{successMsg}</div>}

        {/* Tab Contents */}
        <main className="tab-content">
          {loading && (
            <div className="loader-container">
              <div className="spinner"></div>
              <p>Procesando datos...</p>
            </div>
          )}

          {/* PACIENTE - TAB: MIS CITAS */}
          {!isAdmin && activeTab === 'mis-citas' && (
            <section className="citas-section animate-fade-in">
              <h2>Historial de Reservas</h2>
              {appointments.length === 0 ? (
                <div className="empty-state card glass-panel">
                  <p>No tienes citas médicas agendadas en este momento.</p>
                  <button className="primary-btn" onClick={() => setActiveTab('nueva-cita')}>
                    Reservar mi primera cita
                  </button>
                </div>
              ) : (
                <div className="citas-grid">
                  {appointments.map(cita => (
                    <div className="cita-card card glass-panel" key={cita.ID_Cita}>
                      <div className="cita-card-header">
                        <span className="especialidad-tag">{cita.EspecialidadNombre}</span>
                        <span className={`estado-badge ${cita.Estado.toLowerCase()}`}>
                          {cita.Estado}
                        </span>
                      </div>
                      <div className="cita-card-body">
                        <h3>{cita.MedicoNombre}</h3>
                        <div className="cita-detail">
                          <span className="icon">📅</span>
                          <span>{cita.Fecha}</span>
                        </div>
                        <div className="cita-detail">
                          <span className="icon">⏰</span>
                          <span>{cita.Hora} Hrs</span>
                        </div>
                      </div>
                      {cita.Estado === 'Pendiente' && (
                        <div className="cita-card-actions">
                          <button
                            className="danger-btn text-btn"
                            onClick={() => handleCancelAppointment(cita.ID_Cita)}
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
          )}

          {/* PACIENTE - TAB: NUEVA CITA */}
          {!isAdmin && activeTab === 'nueva-cita' && (
            <section className="booking-section animate-fade-in">
              <div className="booking-layout card glass-panel">
                <h2>Agendar Nueva Cita</h2>
                <form onSubmit={handleBookAppointment} className="booking-form">
                  <div className="form-group">
                    <label htmlFor="specialty">Especialidad</label>
                    <select
                      id="specialty"
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      required
                    >
                      <option value="">Seleccione una especialidad</option>
                      {specialties.map(esp => (
                        <option key={esp.ID_Especialidad} value={esp.ID_Especialidad}>
                          {esp.Nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="doctor">Médico Disponible</label>
                    <select
                      id="doctor"
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                      disabled={!selectedSpecialty}
                      required
                    >
                      <option value="">Seleccione un médico</option>
                      {doctors.map(doc => (
                        <option key={doc.ID_Medico} value={doc.ID_Medico}>
                          {doc.Nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="date">Fecha de la Cita</label>
                    <input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={getTodayString()}
                      disabled={!selectedDoctor}
                      required
                    />
                  </div>

                  {selectedDate && selectedDoctor && (
                    <div className="slots-container">
                      <label>Horarios Disponibles</label>
                      {availableSlots.length === 0 ? (
                        <p className="no-slots-msg">
                          No hay horarios disponibles para la fecha seleccionada. Por favor, elija otra fecha.
                        </p>
                      ) : (
                        <div className="slots-grid">
                          {availableSlots.map(slot => (
                            <button
                              key={slot}
                              type="button"
                              className={`slot-btn ${selectedSlot === slot ? 'selected' : ''}`}
                              onClick={() => setSelectedSlot(slot)}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="primary-btn submit-booking"
                    disabled={loading || !selectedSlot}
                  >
                    Confirmar Reserva de Cita
                  </button>
                </form>
              </div>
            </section>
          )}

          {/* ADMIN - TAB: CITAS DEL DIA */}
          {isAdmin && activeTab === 'citas-dia' && (
            <section className="admin-section animate-fade-in">
              <div className="admin-controls card glass-panel">
                <div className="date-picker-container">
                  <label htmlFor="admin-date">Seleccionar Fecha de Reporte</label>
                  <input
                    id="admin-date"
                    type="date"
                    value={adminDate}
                    onChange={(e) => setAdminDate(e.target.value)}
                  />
                </div>
                
                <div className="admin-summary">
                  <div className="stat-card">
                    <span className="stat-number">{totalCitas}</span>
                    <span className="stat-label">Total Citas</span>
                  </div>
                  <div className="stat-card pending">
                    <span className="stat-number">{activasCitas}</span>
                    <span className="stat-label">Pendientes</span>
                  </div>
                  <div className="stat-card cancelled">
                    <span className="stat-number">{canceladasCitas}</span>
                    <span className="stat-label">Canceladas</span>
                  </div>
                </div>
              </div>

              {adminAppointments.length === 0 ? (
                <div className="empty-state card glass-panel">
                  <p>No se encontraron citas agendadas para el día {adminDate}.</p>
                </div>
              ) : (
                <div className="admin-appointments-grouped">
                  {Object.keys(groupedAdminAppointments).map(medico => (
                    <div className="doctor-appointments-card card glass-panel" key={medico}>
                      <div className="doctor-header">
                        <h3>{medico}</h3>
                        <span className="doctor-specialty-badge">
                          {groupedAdminAppointments[medico][0].EspecialidadNombre}
                        </span>
                      </div>
                      
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Hora</th>
                            <th>Paciente</th>
                            <th>Email</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedAdminAppointments[medico].map(cita => (
                            <tr key={cita.ID_Cita} className={cita.Estado.toLowerCase()}>
                              <td className="time-col">{cita.Hora} Hrs</td>
                              <td className="name-col">{cita.PacienteNombre}</td>
                              <td>{cita.PacienteEmail}</td>
                              <td>
                                <span className={`estado-badge ${cita.Estado.toLowerCase()}`}>
                                  {cita.Estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
      
      <footer className="dashboard-footer">
        <p>© {new Date().getFullYear()} Gestor de Citas Médicas. Diseñado para la clase de Modelado de Datos.</p>
      </footer>
    </div>
  );
};

export default Dashboard;
