-- ------------------------------------------------------------------------------------------------------------------------
-- ACTUALIZACIÓN para bases YA CREADAS: revisión de los formularios de Subsidio por el Área (07/11/2026)
-- "Comenzar revisión", "Solicitar reenvío/datos" y "Tomar decisión" (aprobar / rechazar) en el panel del Área,
-- y la resolución final de la solicitud de inicio (rechazada por el subsidio o resuelta por el Ministro).
--
-- Ejecutar UNA vez con el usuario root (MySQL Workbench, archivo completo con el rayo).
-- Se puede volver a ejecutar sin problema: solo agrega lo que falta.
-- Requiere haber ejecutado antes "Actualizacion subsidio por expediente 2026-11-05.sql".
-- Para una base nueva no hace falta: ya está en Tablas.sql y Triggers.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- 1. Subsidio.MensajeResolucion pasa a ser MensajeSolicitudReenvio (lo que el Área le pide al emprendedor que corrija).
--    Si ya se renombró a mano (también con el nombre "MensajeSolcitudReenvio"), solo se corrige el nombre.
SET @columna = (SELECT COLUMN_NAME FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subsidio'
                  AND COLUMN_NAME IN ('MensajeResolucion', 'MensajeSolcitudReenvio') LIMIT 1);
SET @sql = IF(@columna IS NOT NULL,
    CONCAT('ALTER TABLE Subsidio RENAME COLUMN ', @columna, ' TO MensajeSolicitudReenvio'),
    'SELECT ''La columna MensajeSolicitudReenvio ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 2. Subsidio.ReenvioSolicitado: el emprendedor solo puede reenviar el formulario cuando el Área se lo pidió
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subsidio' AND COLUMN_NAME = 'ReenvioSolicitado');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Subsidio ADD COLUMN ReenvioSolicitado boolean not null default False AFTER EstadoRevision',
    'SELECT ''La columna ReenvioSolicitado ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 3. Subsidio.MontoAnterior: monto del envío anterior cuando el reenvío trae un monto distinto
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subsidio' AND COLUMN_NAME = 'MontoAnterior');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Subsidio ADD COLUMN MontoAnterior decimal(12, 2) null AFTER monto',
    'SELECT ''La columna MontoAnterior ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 4. Subsidio.MotivoRechazo: lo que escribe el empleado al rechazar (también va en el correo al emprendedor)
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subsidio' AND COLUMN_NAME = 'MotivoRechazo');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Subsidio ADD COLUMN MotivoRechazo varchar(512) null AFTER FechaResolucion',
    'SELECT ''La columna MotivoRechazo ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 5. SolicitudInicio.MensajeResolucionFinal: cómo terminó la solicitud
--    ("Rechazado por Subsidio", "Emprendimiento Aprobado por ministro", "Emprendimiento Rechazado por ministro")
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SolicitudInicio' AND COLUMN_NAME = 'MensajeResolucionFinal');
SET @sql = IF(@existe = 0,
    'ALTER TABLE SolicitudInicio ADD COLUMN MensajeResolucionFinal varchar(100) null AFTER FechaResolucionMin',
    'SELECT ''La columna MensajeResolucionFinal ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 6. Las solicitudes que el Ministro ya resolvió (incluidas las de carga histórica) reciben su mensaje final
UPDATE SolicitudInicio
SET MensajeResolucionFinal = IF(AprobacionMinistro = 1, 'Emprendimiento Aprobado por ministro', 'Emprendimiento Rechazado por ministro')
WHERE AprobacionMinistro IS NOT NULL AND MensajeResolucionFinal IS NULL AND idSolicitudInicio > 0;

-- 7. Triggers de auditoría (copiados de Triggers.sql)
DROP TRIGGER IF EXISTS tg_auditoria_subsidio_update;
DELIMITER //
CREATE TRIGGER tg_auditoria_subsidio_update
AFTER UPDATE ON Subsidio
FOR EACH ROW
BEGIN
    -- 1. Resolución del Subsidio (Aprobado/Rechazado)
    IF (OLD.Aprobado IS NULL AND NEW.Aprobado IS NOT NULL) OR (OLD.Aprobado <> NEW.Aprobado) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Subsidio', NEW.idSubsidio,
			CONCAT('Estado del Subsidio actualizado a: ', CASE WHEN NEW.Aprobado = 1 THEN 'APROBADO' ELSE 'RECHAZADO' END,
				' - Revisor ID: ', COALESCE(NEW.idEmpleadoRevisor, 'N/C'),
				IF(NEW.Aprobado = 0 AND NEW.MotivoRechazo IS NOT NULL, CONCAT(' - Motivo: ', NEW.MotivoRechazo), '')),
			@usuario_ip);
    END IF;

    -- 2. Rendición de Cuentas (Entrega y validación de facturas)
    IF (OLD.FacturasEntregadas IS NULL AND NEW.FacturasEntregadas IS NOT NULL) OR (OLD.FacturasEntregadas <> NEW.FacturasEntregadas) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Subsidio', NEW.idSubsidio,
			CONCAT('Rendición de facturas: ', CASE WHEN NEW.FacturasEntregadas = 1 THEN 'Entregadas y en revisión' ELSE 'Sin entregar/Retiradas' END),
            @usuario_ip);
    END IF;

    -- 3. Acreditación de Puesta en Marcha (El inspector fue a ver si el emprendimiento funciona)
    IF (OLD.PuestaMarchaAcreditada IS NULL AND NEW.PuestaMarchaAcreditada IS NOT NULL) OR (OLD.PuestaMarchaAcreditada <> NEW.PuestaMarchaAcreditada) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Subsidio', NEW.idSubsidio,
			CONCAT('Verificación de campo: Puesta en marcha ', CASE WHEN NEW.PuestaMarchaAcreditada = 1 THEN 'ACREDITADA POSITIVA' ELSE 'NO ACREDITADA' END),
            @usuario_ip);
    END IF;

    -- 4. Reenvío del formulario (el emprendedor lo vuelve a completar porque el Área se lo pidió)
    IF (OLD.PathFormularioSub <> NEW.PathFormularioSub) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Subsidio', NEW.idSubsidio,
			CONCAT('Formulario de Subsidio reenviado para Solicitud ID: ', NEW.idSolicitudInicio, '. Monto solicitado: $', NEW.monto,
				' (antes $', OLD.monto, '). Ubicacion del formulario: ', NEW.PathFormularioSub),
			@usuario_ip);
    -- 5. SEGURO DE INTEGRIDAD: Si se cambió el monto sin reenviar el formulario
    ELSEIF (OLD.monto <> NEW.monto) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Subsidio', NEW.idSubsidio,
			CONCAT('¡ALERTA DE CONTROL! Alteración de valor económico. Monto anterior: $', OLD.monto, ' -> Nuevo Monto: $', NEW.monto),
			@usuario_ip);
    END IF;

    -- 6. Un empleado del Área comenzó la revisión (pasa a "En Revisión")
    IF (OLD.EstadoRevision = 0 AND NEW.EstadoRevision = 1) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Subsidio', NEW.idSubsidio,
			CONCAT('Revisión del Subsidio iniciada para Solicitud ID: ', NEW.idSolicitudInicio),
			@usuario_ip);
    END IF;

    -- 7. El Área le pidió al emprendedor que reenvíe el formulario
    IF (OLD.ReenvioSolicitado = 0 AND NEW.ReenvioSolicitado = 1) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Subsidio', NEW.idSubsidio,
			CONCAT('Se solicitó al emprendedor el reenvío del formulario de Subsidio: ', COALESCE(NEW.MensajeSolicitudReenvio, '')),
			@usuario_ip);
    END IF;
END;
//
DELIMITER ;

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
