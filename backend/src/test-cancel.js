// Script para verificar que la API de cancelación de citas funciona correctamente en el Backend

async function runTest() {
  console.log('====================================================');
  console.log('Verificando API de Cancelación de Citas...');
  console.log('====================================================');

  try {
    // 1. Iniciar sesión como Milagros Gómez
    console.log('[1/4] Iniciando sesión...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'milagros@gmail.com', password: '1234' })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Error en login: ${loginRes.statusText}`);
    }
    
    const loginData = await loginRes.json();
    const milagros = loginData.user;
    console.log(`[Éxito] Logueado como: ${milagros.Nombre} (ID_Usuario: ${milagros.ID_Usuario})`);

    // 2. Obtener sus citas
    console.log('\n[2/4] Obteniendo lista de citas...');
    const appointmentsRes = await fetch(`http://localhost:5000/api/patients/${milagros.ID_Usuario}/appointments`);
    if (!appointmentsRes.ok) {
      throw new Error(`Error al obtener citas: ${appointmentsRes.statusText}`);
    }
    const appointments = await appointmentsRes.json();
    console.log(`Citas encontradas (${appointments.length}):`);
    appointments.forEach(app => {
      console.log(` - ID_Cita: ${app.ID_Cita} | Especialidad: ${app.EspecialidadNombre} | Médico: ${app.MedicoNombre} | Estado: ${app.Estado}`);
    });

    // Buscar una cita con estado 'Pendiente' para cancelar
    const pendingApp = appointments.find(app => app.Estado === 'Pendiente');
    if (!pendingApp) {
      console.log('\n[Advertencia] No se encontraron citas con estado "Pendiente" para probar la cancelación.');
      console.log('Intenta crear una cita primero en el frontend.');
      return;
    }

    console.log(`\n[Cita seleccionada para cancelar] ID_Cita: ${pendingApp.ID_Cita} (${pendingApp.EspecialidadNombre})`);

    // 3. Ejecutar la cancelación
    console.log('\n[3/4] Enviando solicitud de cancelación a la API...');
    const cancelRes = await fetch(`http://localhost:5000/api/appointments/${pendingApp.ID_Cita}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ID_Paciente: milagros.ID_Usuario })
    });

    const cancelData = await cancelRes.json();
    if (cancelRes.ok && cancelData.success) {
      console.log(`[Éxito] Respuesta del servidor: ${cancelData.message}`);
    } else {
      throw new Error(`Fallo en la cancelación: ${cancelData.message || 'Sin mensaje'}`);
    }

    // 4. Volver a listar para confirmar que cambió el estado a 'Cancelada'
    console.log('\n[4/4] Verificando cambio de estado en la base de datos...');
    const verifyRes = await fetch(`http://localhost:5000/api/patients/${milagros.ID_Usuario}/appointments`);
    const verifyApps = await verifyRes.json();
    const updatedApp = verifyApps.find(app => app.ID_Cita === pendingApp.ID_Cita);
    
    console.log('Resultado en BD:');
    console.log(` - ID_Cita: ${updatedApp.ID_Cita} | Médico: ${updatedApp.MedicoNombre} | Nuevo Estado: ${updatedApp.Estado}`);

    if (updatedApp.Estado === 'Cancelada') {
      console.log('\n====================================================');
      console.log('¡PRUEBA EXITOSA! La cita fue cancelada correctamente.');
      console.log('====================================================');
    } else {
      console.log('\n[Error] El estado de la cita no cambió a "Cancelada".');
    }

  } catch (error) {
    console.error('\n[FALLO EN LA PRUEBA]:', error.message);
  }
}

runTest();
