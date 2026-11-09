-- ------------------------------------------------------------------------------------------------------------------------
-- ACTUALIZACIÓN para bases YA CREADAS: limpieza de columnas (08/11/2026)
--  - Se elimina SolicitudInicio.CorreoVal: nunca se usó (los mensajes al emprendedor quedan en MotivoRechazo y
--    MensajeResolucionFinal).
--  - Expediente.idEmpleadoCargo pasa a llamarse idUsuarioCargo: siempre guardó el idUsuario de quien cargó el
--    expediente (su clave foránea apunta a Usuario). Se recrea el trigger de auditoría que lo usa.
--  No cambia ninguna columna que usen las Estadísticas.
--
-- Ejecutar UNA vez con el usuario root (MySQL Workbench, archivo completo con el rayo).
-- Se puede volver a ejecutar sin problema: solo cambia lo que falta.
-- Requiere haber ejecutado antes "Actualizacion resolucion final 2026-11-08.sql".
-- Para una base nueva no hace falta: ya está en Tablas.sql y Triggers.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- 1. Quitar SolicitudInicio.CorreoVal
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SolicitudInicio' AND COLUMN_NAME = 'CorreoVal');
SET @sql = IF(@existe = 1,
    'ALTER TABLE SolicitudInicio DROP COLUMN CorreoVal',
    'SELECT ''La columna CorreoVal ya no existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 2. Expediente.idEmpleadoCargo -> idUsuarioCargo (la clave foránea a Usuario se mantiene)
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Expediente' AND COLUMN_NAME = 'idEmpleadoCargo');
SET @sql = IF(@existe = 1,
    'ALTER TABLE Expediente RENAME COLUMN idEmpleadoCargo TO idUsuarioCargo',
    'SELECT ''La columna idUsuarioCargo ya tiene el nombre nuevo'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 3. Trigger de auditoría del Expediente (copiado de Triggers.sql) con el nombre nuevo
DROP TRIGGER IF EXISTS tg_auditoria_expediente_insert;
DELIMITER //
CREATE TRIGGER tg_auditoria_expediente_insert
AFTER INSERT ON Expediente
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
        @usuario_id, 'INSERT', 'Expediente', NEW.idExpediente,
        CONCAT('Expediente generado para Solicitud ID: ', NEW.idSolicitudInicio, ' por Usuario ID: ', NEW.idUsuarioCargo),
        @usuario_ip
    );
END;
//
DELIMITER ;
