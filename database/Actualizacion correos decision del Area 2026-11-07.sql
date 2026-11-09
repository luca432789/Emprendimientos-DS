-- ------------------------------------------------------------------------------------------------------------------------
-- ACTUALIZACIÓN para bases YA CREADAS: correos de la decisión del Área sobre la solicitud de inicio (07/11/2026)
-- Al rechazar, el empleado escribe el motivo: se guarda, se envía por correo al emprendedor y la solicitud queda
-- finalizada como "Rechazado por el Área".
--
-- Ejecutar UNA vez con el usuario root (MySQL Workbench, archivo completo con el rayo).
-- Se puede volver a ejecutar sin problema: solo agrega lo que falta.
-- Requiere haber ejecutado antes "Actualizacion revision de subsidios 2026-11-07.sql".
-- Para una base nueva no hace falta: ya está en Tablas.sql y Triggers.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- 1. SolicitudInicio.MotivoRechazo: lo que escribió el empleado del Área al rechazar
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SolicitudInicio' AND COLUMN_NAME = 'MotivoRechazo');
SET @sql = IF(@existe = 0,
    'ALTER TABLE SolicitudInicio ADD COLUMN MotivoRechazo varchar(512) null AFTER AprobacionArea',
    'SELECT ''La columna MotivoRechazo ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 2. Las solicitudes que el Área ya rechazó quedan finalizadas
UPDATE SolicitudInicio
SET MensajeResolucionFinal = 'Rechazado por el Área'
WHERE AprobacionArea = 0 AND MensajeResolucionFinal IS NULL AND idSolicitudInicio > 0;

-- 3. Trigger de auditoría (copiado de Triggers.sql): el dictamen del Área registra el motivo del rechazo
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
			CONCAT('Resolución del Ministro: ', CASE WHEN NEW.AprobacionMinistro = 1 THEN 'APROBADA' ELSE 'RECHAZADA' END),
			@usuario_ip);
    -- 5. Solicitud cerrada sin pasar por el Ministro (ej: "Rechazado por Subsidio")
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
