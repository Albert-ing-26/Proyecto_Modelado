import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getPool, execQuery } from './db.js';
import { runSeeding } from './seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Forzar UTF-8 en todas las respuestas HTTP
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Log HTTP requests
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// Helper para validar formato YYYY-MM-DD
const isValidDateFormat = (dateStr) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
};

// ==========================================
// 1. AUTENTICACIÓN
// ==========================================

// Login de Usuario
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email y contraseña son requeridos.' });
  }

  try {
    const result = await execQuery(
      `SELECT ID_Usuario,
              CAST(Nombre AS NVARCHAR(150)) AS Nombre,
              CAST(Email  AS NVARCHAR(150)) AS Email,
              CAST(Rol    AS NVARCHAR(20))  AS Rol
       FROM Usuario
       WHERE Email = @email AND Password_Hash = @password`,
      { email, password }
    );

    if (result.recordset.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
    }

    res.json({ success: true, user: result.recordset[0] });
  } catch (error) {
    console.error('[API Login] Error:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

// Registro de Paciente
app.post('/api/auth/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
  }

  try {
    const result = await execQuery(
      'EXEC sp_RegistrarPaciente @Nombre = @nombre, @Email = @email, @Password_Hash = @password',
      { nombre, email, password }
    );
    res.status(201).json({ success: true, user: result.recordset[0] });
  } catch (error) {
    console.error('[API Register] Error:', error.message);
    if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, message: 'El email ya se encuentra registrado.' });
    }
    res.status(500).json({ success: false, message: 'Error al registrar el paciente.' });
  }
});

// ==========================================
// 2. CATÁLOGOS
// ==========================================

// Obtener todas las especialidades
app.get('/api/specialties', async (req, res) => {
  try {
    const result = await execQuery(
      `SELECT ID_Especialidad,
              CAST(Nombre AS NVARCHAR(100)) AS Nombre
       FROM Especialidad
       ORDER BY Nombre`
    );
    res.json(result.recordset);
  } catch (error) {
    console.error('[API Specialties] Error:', error.message);
    res.status(500).json({ message: 'Error al obtener especialidades.' });
  }
});

// Obtener médicos de una especialidad
app.get('/api/specialties/:specialtyId/doctors', async (req, res) => {
  const specialtyId = parseInt(req.params.specialtyId, 10);
  if (isNaN(specialtyId)) {
    return res.status(400).json({ message: 'ID de especialidad inválido.' });
  }

  try {
    const result = await execQuery(
      `SELECT ID_Medico,
              CAST(Nombre AS NVARCHAR(150)) AS Nombre,
              ID_Especialidad
       FROM Medico
       WHERE ID_Especialidad = @specialtyId
       ORDER BY Nombre`,
      { specialtyId }
    );
    res.json(result.recordset);
  } catch (error) {
    console.error('[API Doctors] Error:', error.message);
    res.status(500).json({ message: 'Error al obtener médicos.' });
  }
});

// ==========================================
// 3. DISPONIBILIDAD Y CITAS
// ==========================================

// Horarios disponibles para un médico en una fecha
app.get('/api/doctors/:doctorId/available-hours', async (req, res) => {
  const doctorId = parseInt(req.params.doctorId, 10);
  const { fecha } = req.query;

  if (isNaN(doctorId)) {
    return res.status(400).json({ message: 'ID de médico inválido.' });
  }

  if (!fecha || !isValidDateFormat(fecha)) {
    return res.json([]);
  }

  try {
    const result = await execQuery(
      'EXEC sp_ObtenerHorariosDisponibles @ID_Medico = @doctorId, @Fecha = @fecha',
      { doctorId, fecha }
    );

    const horas = result.recordset.map(row => {
      if (row.Hora instanceof Date) {
        return row.Hora.toISOString().substring(11, 16);
      }
      if (typeof row.Hora === 'object' && row.Hora.milliseconds !== undefined) {
        const totalMs = row.Hora.milliseconds;
        const hrs  = Math.floor(totalMs / 3600000).toString().padStart(2, '0');
        const mins = Math.floor((totalMs % 3600000) / 60000).toString().padStart(2, '0');
        return `${hrs}:${mins}`;
      }
      return String(row.Hora).substring(0, 5);
    });

    res.json(horas);
  } catch (error) {
    console.error('[API Availability] Error:', error.message);
    res.status(500).json({ message: 'Error al obtener horarios disponibles.' });
  }
});

// Reservar una cita
app.post('/api/appointments', async (req, res) => {
  const { ID_Paciente, ID_Medico, Fecha, Hora } = req.body;

  if (!ID_Paciente || !ID_Medico || !Fecha || !Hora) {
    return res.status(400).json({ success: false, message: 'Todos los datos de la cita son obligatorios.' });
  }

  const patientId = parseInt(ID_Paciente, 10);
  const doctorId  = parseInt(ID_Medico,   10);

  if (isNaN(patientId) || isNaN(doctorId)) {
    return res.status(400).json({ success: false, message: 'IDs de paciente o médico inválidos.' });
  }

  if (!isValidDateFormat(Fecha)) {
    return res.status(400).json({ success: false, message: 'Formato de fecha inválido (debe ser AAAA-MM-DD).' });
  }

  try {
    const result = await execQuery(
      'EXEC sp_ReservarCita @ID_Paciente = @patientId, @ID_Medico = @doctorId, @Fecha = @Fecha, @Hora = @Hora',
      { patientId, doctorId, Fecha, Hora }
    );
    res.status(201).json({ success: true, appointment: result.recordset[0] });
  } catch (error) {
    console.error('[API Book Appointment] Error:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Listar citas de un paciente — con CAST en columnas de texto
app.get('/api/patients/:patientId/appointments', async (req, res) => {
  const patientId = parseInt(req.params.patientId, 10);
  if (isNaN(patientId)) {
    return res.status(400).json({ message: 'ID de paciente inválido.' });
  }

  try {
    const result = await execQuery(
      `SELECT c.ID_Cita,
              c.Fecha,
              c.Hora,
              CAST(c.Estado AS NVARCHAR(20))         AS Estado,
              c.Fecha_Creacion,
              CAST(m.Nombre AS NVARCHAR(150))         AS MedicoNombre,
              CAST(e.Nombre AS NVARCHAR(100))         AS EspecialidadNombre
       FROM Cita c
       JOIN Medico      m ON c.ID_Medico      = m.ID_Medico
       JOIN Especialidad e ON m.ID_Especialidad = e.ID_Especialidad
       WHERE c.ID_Paciente = @patientId
       ORDER BY c.Fecha DESC, c.Hora DESC`,
      { patientId }
    );
    res.json(result.recordset);
  } catch (error) {
    console.error('[API Patient Appointments] Error:', error.message);
    res.status(500).json({ message: 'Error al obtener citas del paciente.' });
  }
});

// Cancelar una cita
app.post('/api/appointments/:appointmentId/cancel', async (req, res) => {
  const appointmentId = parseInt(req.params.appointmentId, 10);
  const { ID_Paciente } = req.body;

  if (isNaN(appointmentId)) {
    return res.status(400).json({ message: 'ID de cita inválido.' });
  }

  if (!ID_Paciente) {
    return res.status(400).json({ message: 'El ID del paciente es requerido para cancelar.' });
  }

  const patientId = parseInt(ID_Paciente, 10);
  if (isNaN(patientId)) {
    return res.status(400).json({ message: 'ID de paciente inválido.' });
  }

  try {
    await execQuery(
      'EXEC sp_CancelarCita @ID_Cita = @appointmentId, @ID_Paciente = @patientId',
      { appointmentId, patientId }
    );
    res.json({ success: true, message: 'La cita ha sido cancelada correctamente.' });
  } catch (error) {
    console.error('[API Cancel Appointment] Error:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// 4. ADMINISTRACIÓN
// ==========================================

// Citas del día para el administrador — con CAST en columnas de texto
app.get('/api/admin/appointments', async (req, res) => {
  const { fecha } = req.query;
  if (!fecha || !isValidDateFormat(fecha)) {
    return res.json([]);
  }

  try {
    const result = await execQuery(
      'EXEC sp_ObtenerCitasDia @Fecha = @fecha',
      { fecha }
    );

    // Normalizar columnas de texto
    const rows = result.recordset.map(row => ({
      ...row,
      MedicoNombre:        row.MedicoNombre        ? String(row.MedicoNombre)        : row.MedicoNombre,
      EspecialidadNombre:  row.EspecialidadNombre  ? String(row.EspecialidadNombre)  : row.EspecialidadNombre,
      PacienteNombre:      row.PacienteNombre      ? String(row.PacienteNombre)      : row.PacienteNombre,
      PacienteEmail:       row.PacienteEmail       ? String(row.PacienteEmail)       : row.PacienteEmail,
      Estado:              row.Estado              ? String(row.Estado)              : row.Estado,
    }));

    res.json(rows);
  } catch (error) {
    console.error('[API Admin Appointments] Error:', error.message);
    res.status(500).json({ message: 'Error al obtener reporte diario de citas.' });
  }
});

// ==========================================
// BOOTSTRAP
// ==========================================
async function startServer() {
  try {
    await getPool();
    await runSeeding();
  } catch (error) {
    console.warn('\n[Bootstrap] ADVERTENCIA: No se pudo conectar a la base de datos GestorCitasMedicas.');
    console.warn('[Bootstrap] Asegúrate de que el servicio de SQL Server esté activo y configurado.\n');
  }

  app.listen(PORT, () => {
    console.log(`[Server] Express corriendo en http://localhost:${PORT}`);
  });
}

startServer();
