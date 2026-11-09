-- ------------------------------------------------------------------------------------------------------------------------
-- ACTUALIZACIÓN para bases YA CREADAS: fecha de la resolución final y restricción de nuevas solicitudes de inicio (08/11/2026)
--  - FechaResolucionFinal: día en que la solicitud quedó finalizada (junto con MensajeResolucionFinal). Con ella se controla
--    que, tras un rechazo, la misma persona (DNI o correo) recién pueda presentar otra Solicitud de Inicio pasados 7 días.
--  - MensajeResolucionFinal pasa a 512 caracteres: en el "Rechazo por falta de formulario" el empleado puede escribirlo.
--  - MotivoRechazo también guarda el texto del rechazo del Ministro (el que se envía por correo al emprendedor).
--  - Índices por DNI y por correo en DatosSolicitudInicio, para buscar rápido las solicitudes anteriores de una persona.
--  No cambia ninguna columna que usen las Estadísticas.
--
-- Ejecutar UNA vez con el usuario root (MySQL Workbench, archivo completo con el rayo).
-- Se puede volver a ejecutar sin problema: solo agrega lo que falta.
-- Requiere haber ejecutado antes "Actualizacion correos decision del Area 2026-11-07.sql".
-- Para una base nueva no hace falta: ya está en Tablas.sql y Triggers.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- 1. MensajeResolucionFinal de 100 a 512 caracteres
SET @largo = (SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SolicitudInicio' AND COLUMN_NAME = 'MensajeResolucionFinal');
SET @sql = IF(@largo < 512,
    'ALTER TABLE SolicitudInicio MODIFY COLUMN MensajeResolucionFinal varchar(512) null',
    'SELECT ''MensajeResolucionFinal ya tiene 512 caracteres'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 2. SolicitudInicio.FechaResolucionFinal
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SolicitudInicio' AND COLUMN_NAME = 'FechaResolucionFinal');
SET @sql = IF(@existe = 0,
    'ALTER TABLE SolicitudInicio ADD COLUMN FechaResolucionFinal date null AFTER MensajeResolucionFinal',
    'SELECT ''La columna FechaResolucionFinal ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 3. Fecha de las solicitudes ya finalizadas, tomada de donde se registró cada resolución
UPDATE SolicitudInicio s
SET s.FechaResolucionFinal = CASE
        WHEN s.AprobacionMinistro IS NOT NULL THEN s.FechaResolucionMin
        WHEN s.MensajeResolucionFinal = 'Rechazado por el Área' THEN s.FechaFinRev
        WHEN s.MensajeResolucionFinal = 'Rechazado por Subsidio' THEN
            (SELECT u.FechaResolucion FROM Subsidio u WHERE u.idSolicitudInicio = s.idSolicitudInicio ORDER BY u.idSubsidio DESC LIMIT 1)
    END
WHERE s.MensajeResolucionFinal IS NOT NULL AND s.FechaResolucionFinal IS NULL AND s.idSolicitudInicio > 0;

-- 4. Índices para buscar las solicitudes anteriores de la misma persona
SET @existe = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DatosSolicitudInicio' AND INDEX_NAME = 'idx_DatosSolicitud_DNI');
SET @sql = IF(@existe = 0,
    'CREATE INDEX idx_DatosSolicitud_DNI ON DatosSolicitudInicio (PersonaDNI)',
    'SELECT ''El índice idx_DatosSolicitud_DNI ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

SET @existe = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DatosSolicitudInicio' AND INDEX_NAME = 'idx_DatosSolicitud_Correo');
SET @sql = IF(@existe = 0,
    'CREATE INDEX idx_DatosSolicitud_Correo ON DatosSolicitudInicio (PersonaCorreo)',
    'SELECT ''El índice idx_DatosSolicitud_Correo ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 5. Trigger de auditoría (copiado de Triggers.sql): la resolución del Ministro registra el motivo del rechazo
DROP TRIGGER IF EXISTS tg_auditoria_SolicitudInicio_update;
DELIMITER //
CREATE TRIGGER tg_auditoria_SolicitudInicio_update
AFTER UPDATE ON SolicitudInicio
FOR EACH ROW
BEGIN
    -- 1. Cambio en el Estado de Revisión del area
    IF OLD.EstadoRevisionArea <> NEW.EstadoRevisionArea THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'SolicitudInicio', NEW.idSolicitudInicio,
			CONCAT('Estado de revisión de area cambió a: ',
				CASE NEW.EstadoRevisionArea WHEN 0 THEN 'Sin revisar' WHEN 1 THEN 'En proceso' ELSE 'Finalizado' END),
			@usuario_ip);
    END IF;

    -- 2. Firma/Aprobación del area (visita tecnico - social)
    IF (OLD.AprobacionArea IS NULL AND NEW.AprobacionArea IS NOT NULL) OR (OLD.AprobacionArea <> NEW.AprobacionArea) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'SolicitudInicio', NEW.idSolicitudInicio,
			CONCAT('Dictamen del Área: ', CASE WHEN NEW.AprobacionArea = 1 THEN 'APROBADO' ELSE 'RECHAZADO' END,
				' Revisores - Tecnico: ', COALESCE(NEW.idEmpleadoTecRevisor, 'N/C'), ' - Social: ', COALESCE(NEW.idEmpleadoSocRevisor, 'N/C'),
				IF(NEW.AprobacionArea = 0 AND NEW.MotivoRechazo IS NOT NULL, CONCAT(' - Motivo: ', NEW.MotivoRechazo), '')),
			@usuario_ip);
    END IF;

    -- 3. Envío de documentos a ministro (solicitudInicio y subsidio/credito)
    IF OLD.EnvioMinistro <> NEW.EnvioMinistro AND NEW.EnvioMinistro = 1 THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'SolicitudInicio', NEW.idSolicitudInicio,
			CONCAT('Se enviaron los documentos al ministro'),
			@usuario_ip);
    END IF;

    -- 4. Resolucion Ministro (Aprobacion final
    IF (OLD.AprobacionMinistro IS NULL AND NEW.AprobacionMinistro IS NOT NULL) OR (OLD.AprobacionMinistro <> NEW.AprobacionMinistro) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'SolicitudInicio', NEW.idSolicitudInicio,
			CONCAT('Resolución del Ministro: ', CASE WHEN NEW.AprobacionMinistro = 1 THEN 'APROBADA' ELSE 'RECHAZADA' END,
				IF(NEW.AprobacionMinistro = 0 AND NEW.MotivoRechazo IS NOT NULL, CONCAT(' - Motivo: ', NEW.MotivoRechazo), '')),
			@usuario_ip);
    -- 5. Solicitud cerrada sin pasar por el Ministro (ej: "Rechazado por Subsidio" o por falta de formulario)
    ELSEIF (OLD.MensajeResolucionFinal IS NULL AND NEW.MensajeResolucionFinal IS NOT NULL) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'SolicitudInicio', NEW.idSolicitudInicio,
			CONCAT('Solicitud finalizada: ', NEW.MensajeResolucionFinal),
			@usuario_ip);
    END IF;
END;
//
DELIMITER ;
