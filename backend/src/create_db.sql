CREATE DATABASE GestorCitasMedicas;
GO

USE GestorCitasMedicas;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1. Tabla de Usuarios (Pacientes y Administradores)
CREATE TABLE Usuario (
    ID_Usuario INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(150) NOT NULL,
    Email VARCHAR(150) UNIQUE NOT NULL,
    Password_Hash VARCHAR(256) NOT NULL,
    Rol VARCHAR(20) CHECK (Rol IN ('Paciente', 'Admin')) DEFAULT 'Paciente',
    Fecha_Registro DATETIME DEFAULT GETDATE()
);
GO

-- 2. Tabla de Especialidades
CREATE TABLE Especialidad (
    ID_Especialidad INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL UNIQUE
);
GO

-- 3. Tabla de Médicos
CREATE TABLE Medico (
    ID_Medico INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(150) NOT NULL,
    ID_Especialidad INT NOT NULL,
    FOREIGN KEY (ID_Especialidad) REFERENCES Especialidad(ID_Especialidad) ON DELETE CASCADE
);
GO

-- 4. Tabla de Citas
CREATE TABLE Cita (
    ID_Cita INT IDENTITY(1,1) PRIMARY KEY,
    ID_Paciente INT NOT NULL,
    ID_Medico INT NOT NULL,
    Fecha DATE NOT NULL,
    Hora TIME NOT NULL,
    Estado VARCHAR(20) CHECK (Estado IN ('Pendiente', 'Completada', 'Cancelada')) DEFAULT 'Pendiente',
    Fecha_Creacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ID_Paciente) REFERENCES Usuario(ID_Usuario) ON DELETE CASCADE,
    FOREIGN KEY (ID_Medico) REFERENCES Medico(ID_Medico) ON DELETE CASCADE
);
GO

-- ==========================================
-- REGLAS DE NEGOCIO CRÍTICAS (ÍNDICES ÚNICOS FILTRADOS)
-- ==========================================

-- Regla 1 (Concurrencia): Un médico no puede tener dos citas activas (no canceladas) a la misma hora el mismo día.
CREATE UNIQUE INDEX UX_Cita_Medico_Fecha_Hora 
ON Cita(ID_Medico, Fecha, Hora) 
WHERE Estado <> 'Cancelada';
GO

-- Regla 2 (Restricción del Paciente): Un paciente no puede tener dos citas activas (no canceladas) a la misma hora el mismo día.
CREATE UNIQUE INDEX UX_Cita_Paciente_Fecha_Hora 
ON Cita(ID_Paciente, Fecha, Hora) 
WHERE Estado <> 'Cancelada';
GO

-- ==========================================
-- PROCEDIMIENTOS ALMACENADOS
-- ==========================================

-- 1. Registrar un paciente nuevo
CREATE PROCEDURE sp_RegistrarPaciente
    @Nombre VARCHAR(150),
    @Email VARCHAR(150),
    @Password_Hash VARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Usuario (Nombre, Email, Password_Hash, Rol)
    VALUES (@Nombre, @Email, @Password_Hash, 'Paciente');
    
    SELECT ID_Usuario, Nombre, Email, Rol 
    FROM Usuario 
    WHERE ID_Usuario = SCOPE_IDENTITY();
END;
GO

-- 2. Reservar una cita médica con transacciones y validaciones concurrentes
CREATE PROCEDURE sp_ReservarCita
    @ID_Paciente INT,
    @ID_Medico INT,
    @Fecha DATE,
    @Hora TIME
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validar si el paciente ya tiene otra cita activa a la misma fecha y hora
        IF EXISTS (
            SELECT 1 FROM Cita 
            WHERE ID_Paciente = @ID_Paciente AND Fecha = @Fecha AND Hora = @Hora AND Estado <> 'Cancelada'
        )
        BEGIN
            THROW 50001, 'Ya tienes una cita agendada en la misma fecha y hora.', 1;
        END;

        -- Validar si el médico ya tiene otra cita activa a la misma fecha y hora
        IF EXISTS (
            SELECT 1 FROM Cita 
            WHERE ID_Medico = @ID_Medico AND Fecha = @Fecha AND Hora = @Hora AND Estado <> 'Cancelada'
        )
        BEGIN
            THROW 50002, 'El médico ya tiene una cita reservada en esa fecha y hora.', 1;
        END;

        -- Insertar la cita
        INSERT INTO Cita (ID_Paciente, ID_Medico, Fecha, Hora, Estado)
        VALUES (@ID_Paciente, @ID_Medico, @Fecha, @Hora, 'Pendiente');

        COMMIT TRANSACTION;
        
        -- Retornar la cita creada para el Frontend
        SELECT 
            c.ID_Cita, c.Fecha, c.Hora, c.Estado,
            m.Nombre AS MedicoNombre,
            e.Nombre AS EspecialidadNombre
        FROM Cita c
        JOIN Medico m ON c.ID_Medico = m.ID_Medico
        JOIN Especialidad e ON m.ID_Especialidad = e.ID_Especialidad
        WHERE c.ID_Cita = SCOPE_IDENTITY();

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        -- Capturar y relanzar el error de forma segura
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO

-- 3. Cancelar una cita médica cambiando su estado a 'Cancelada'
CREATE PROCEDURE sp_CancelarCita
    @ID_Cita INT,
    @ID_Paciente INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Cita
        SET Estado = 'Cancelada'
        WHERE ID_Cita = @ID_Cita AND ID_Paciente = @ID_Paciente AND Estado = 'Pendiente';

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 50003, 'No se pudo cancelar la cita. Verifique si ya está cancelada o si no le pertenece.', 1;
        END;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO

-- 4. Obtener horarios disponibles para un médico en una fecha específica
CREATE PROCEDURE sp_ObtenerHorariosDisponibles
    @ID_Medico INT,
    @Fecha DATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Definir los horarios estándar de atención médica (8 AM a 5 PM, excluyendo la hora de almuerzo de 1 PM a 2 PM)
    DECLARE @Horarios TABLE (Hora TIME);
    INSERT INTO @Horarios (Hora) VALUES 
    ('08:00:00'), ('09:00:00'), ('10:00:00'), ('11:00:00'), 
    ('12:00:00'), ('14:00:00'), ('15:00:00'), ('16:00:00'), 
    ('17:00:00');

    -- Retornar los horarios que no estén ocupados por citas no canceladas para ese médico
    SELECT Hora 
    FROM @Horarios
    WHERE Hora NOT IN (
        SELECT Hora 
        FROM Cita
        WHERE ID_Medico = @ID_Medico 
          AND Fecha = @Fecha 
          AND Estado <> 'Cancelada'
    )
    ORDER BY Hora;
END;
GO

-- 5. Obtener todas las citas de un día específico ordenadas por médico (para el Panel Admin)
CREATE PROCEDURE sp_ObtenerCitasDia
    @Fecha DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        c.ID_Cita,
        c.Fecha,
        c.Hora,
        c.Estado,
        p.Nombre AS PacienteNombre,
        p.Email AS PacienteEmail,
        m.Nombre AS MedicoNombre,
        e.Nombre AS EspecialidadNombre
    FROM Cita c
    JOIN Usuario p ON c.ID_Paciente = p.ID_Usuario
    JOIN Medico m ON c.ID_Medico = m.ID_Medico
    JOIN Especialidad e ON m.ID_Especialidad = e.ID_Especialidad
    WHERE c.Fecha = @Fecha
    ORDER BY m.Nombre, c.Hora;
END;
GO

-- ==========================================
-- DATOS SEMILLA PARA PRUEBAS RÁPIDAS
-- ==========================================
INSERT INTO Usuario (Nombre, Email, Password_Hash, Rol) VALUES 
('Juan Pérez', 'juan@gmail.com', '1230', 'Paciente'),
('Milagros Gómez', 'milagros@gmail.com', '1234', 'Paciente'),
('Administrador Principal', 'admin@citas.com', 'admin123', 'Admin');

INSERT INTO Especialidad (Nombre) VALUES 
('Cardiología'), 
('Pediatría'), 
('Dermatología'), 
('Ginecología'), 
('Medicina General');

INSERT INTO Medico (Nombre, ID_Especialidad) VALUES 
('Dr. Carlos Mendoza', 1), -- Cardiología
('Dra. Laura Torres', 1),   -- Cardiología
('Dr. Hugo Sánchez', 2),    -- Pediatría
('Dra. Sofía Rivas', 3),    -- Dermatología
('Dra. Carmen Del Prado', 4),-- Ginecología
('Dr. Alejandro Ruiz', 5);  -- Medicina General

-- Citas de prueba
INSERT INTO Cita (ID_Paciente, ID_Medico, Fecha, Hora, Estado) VALUES 
(1, 1, CAST(GETDATE() AS DATE), '08:00:00', 'Pendiente'),
(2, 3, CAST(GETDATE() AS DATE), '09:00:00', 'Pendiente');
GO
