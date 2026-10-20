-- ------------------------------------------------------------------------------------------------------------------------
-- ACTUALIZACIÓN para bases YA CREADAS: cambios de la rama desarrollo-panel (Luca, 20/10/2026)
-- "Aprobación y rechazo de formularios de Inicio (hasta ministro)"
--
-- Ejecutar UNA vez con el usuario root (MySQL Workbench, archivo completo con el rayo).
-- Se puede volver a ejecutar sin problema: solo agrega lo que falta.
-- Para una base nueva no hace falta: ya está en Tablas.sql, Triggers.sql y Usuario Conexion.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- 1. Coordenadas del emprendimiento en DatosSolicitudInicio (las carga el Área al aprobar la solicitud)
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DatosSolicitudInicio' AND COLUMN_NAME = 'EmprendimientoLatitud');
SET @sql = IF(@existe = 0,
    'ALTER TABLE DatosSolicitudInicio ADD COLUMN EmprendimientoLatitud decimal(12, 10) null AFTER EleccionAyuda, ADD COLUMN EmprendimientoLongitud decimal(13, 10) null AFTER EmprendimientoLatitud',
    'SELECT ''Las columnas de coordenadas ya existen'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 2. Solo se acepta 'Subsidio' o 'Credito' como ayuda elegida
SET @existe = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DatosSolicitudInicio' AND CONSTRAINT_NAME = 'chk_EleccionAyuda');
SET @sql = IF(@existe = 0,
    'ALTER TABLE DatosSolicitudInicio ADD CONSTRAINT chk_EleccionAyuda CHECK (EleccionAyuda IN (''Subsidio'', ''Credito''))',
    'SELECT ''La restricción chk_EleccionAyuda ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 3. Triggers (copiados de Triggers.sql):
--    - DatosSolicitudInicio deja de ser totalmente inmutable: solo permite cambiar las coordenadas
--    - el cambio de coordenadas queda en la auditoría
--    - texto nuevo de la auditoría al enviar los documentos al ministro
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
				' Revisores - Tecnico: ', COALESCE(NEW.idEmpleadoTecRevisor, 'N/C'), ' - Social: ', COALESCE(NEW.idEmpleadoSocRevisor, 'N/C')), 
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
    END IF;
END;
//
DELIMITER ;
DROP TRIGGER IF EXISTS tg_auditoria_DatosSolicitudInicio_update;
DELIMITER //
CREATE TRIGGER tg_auditoria_DatosSolicitudInicio_update
BEFORE UPDATE ON DatosSolicitudInicio
FOR EACH ROW
BEGIN
    IF NOT (
        OLD.PersonaNombre <=> NEW.PersonaNombre AND
        OLD.PersonaApellido <=> NEW.PersonaApellido AND
        OLD.PersonaDNI <=> NEW.PersonaDNI AND
        OLD.PersonaDepartamento <=> NEW.PersonaDepartamento AND
        OLD.PersonaLocalidad <=> NEW.PersonaLocalidad AND
        OLD.PersonaDomicilio <=> NEW.PersonaDomicilio AND
        OLD.PersonaTeléfono <=> NEW.PersonaTeléfono AND
        OLD.PersonaCorreo <=> NEW.PersonaCorreo AND
        OLD.EmprendimientoCalle <=> NEW.EmprendimientoCalle AND
        OLD.EmprendimientoNroCalle <=> NEW.EmprendimientoNroCalle AND
        OLD.EmprendimientoBarrio <=> NEW.EmprendimientoBarrio AND
        OLD.EmprendimientoDepto <=> NEW.EmprendimientoDepto AND
        OLD.EmprendimientoMarcha <=> NEW.EmprendimientoMarcha AND
        OLD.EmprendimientoRubro <=> NEW.EmprendimientoRubro AND
        OLD.EleccionAyuda <=> NEW.EleccionAyuda AND
        OLD.idDatosSolicitudInicio <=> NEW.idDatosSolicitudInicio AND
        OLD.idSolicitudInicio <=> NEW.idSolicitudInicio
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error de Seguridad: Solo se permite actualizar las coordenadas del emprendimiento.';
    END IF;
END;
//
DELIMITER ;
DROP TRIGGER IF EXISTS tg_auditoria_DatosSolicitudInicio_coordinates;
DELIMITER //
CREATE TRIGGER tg_auditoria_DatosSolicitudInicio_coordinates
AFTER UPDATE ON DatosSolicitudInicio
FOR EACH ROW
BEGIN
    IF NOT (OLD.EmprendimientoLatitud <=> NEW.EmprendimientoLatitud)
       OR NOT (OLD.EmprendimientoLongitud <=> NEW.EmprendimientoLongitud) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
            @usuario_id,
            'UPDATE',
            'DatosSolicitudInicio',
            NEW.idDatosSolicitudInicio,
            CONCAT(
                'Coordenadas del emprendimiento para la solicitud ', NEW.idSolicitudInicio,
                ' actualizadas. Latitud: ', COALESCE(CAST(OLD.EmprendimientoLatitud AS CHAR), 'sin dato'),
                ' -> ', COALESCE(CAST(NEW.EmprendimientoLatitud AS CHAR), 'sin dato'),
                '; longitud: ', COALESCE(CAST(OLD.EmprendimientoLongitud AS CHAR), 'sin dato'),
                ' -> ', COALESCE(CAST(NEW.EmprendimientoLongitud AS CHAR), 'sin dato')
            ),
            @usuario_ip
        );
    END IF;
END;
//
DELIMITER ;

-- 4. Permiso para que la API guarde las coordenadas (solo esas dos columnas)
GRANT UPDATE (EmprendimientoLatitud, EmprendimientoLongitud) ON ProyectoEmprendimientos2026.DatosSolicitudInicio TO 'ministerio_api'@'localhost';
FLUSH PRIVILEGES;
