import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'GestorCitasMedicas',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

async function runTest() {
  console.log('=============================================');
  console.log('Probando conexión a SQL Server...');
  console.log(`Servidor:  ${dbConfig.server}`);
  console.log(`Puerto:    ${dbConfig.port}`);
  console.log(`Usuario:   ${dbConfig.user}`);
  console.log(`Base de Datos: ${dbConfig.database}`);
  console.log('=============================================');

  try {
    const pool = await sql.connect(dbConfig);
    console.log('\n[Éxito] ¡Conectado correctamente a SQL Server!');
    
    // Test a basic query
    const res = await pool.request().query("SELECT name FROM sys.databases WHERE name = 'GestorCitasMedicas'");
    if (res.recordset.length > 0) {
      console.log(`[Base de Datos] Encontrada base de datos: ${res.recordset[0].name}`);
      
      // Test tables
      const tables = await pool.request().query(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
      );
      console.log('\nTablas existentes en la base de datos:');
      tables.recordset.forEach(t => console.log(` - ${t.TABLE_NAME}`));
    } else {
      console.log('\n[Advertencia] No se encontró la base de datos "GestorCitasMedicas". Asegúrate de haber ejecutado el script SQL.');
    }
    
    await sql.close();
    console.log('\nConexión cerrada de forma limpia.');
  } catch (error) {
    console.error('\n[Error de Conexión]:');
    console.error(error.message);
    console.log('\nSugerencias de solución:');
    console.log('1. Asegúrate de que el servidor SQL Server esté en ejecución.');
    console.log('2. Verifica que las credenciales en backend/.env sean las correctas.');
    console.log('3. Asegúrate de que SQL Server tenga habilitadas las conexiones TCP/IP (en el Administrador de Configuración de SQL Server).');
    console.log('4. Revisa si el puerto 1433 está bloqueado o si estás usando una instancia con nombre (ej. localhost\\SQLEXPRESS) en DB_SERVER.');
  }
  console.log('=============================================');
}

runTest();
