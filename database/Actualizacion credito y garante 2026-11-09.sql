-- ------------------------------------------------------------------------------------------------------------------------
-- ACTUALIZACIÓN para bases YA CREADAS: formulario de Crédito por expediente y nueva tabla Garante (09/11/2026)
--  - Credito recibe las mismas columnas de revisión que Subsidio (EstadoRevision, ReenvioSolicitado, MontoAnterior,
--    MotivoRechazo y MensajeSolicitudReenvio). MensajeResolucion nunca se usó: pasa a llamarse MotivoRechazo.
--  - Garante deja de guardar una ruta por documento: los 5 documentos van en un solo PDF (PathFormularioGarante)
--    junto con la hoja de datos firmada por el garante. Se agrega su CUIL y "Teléfono" pasa a llamarse Telefono.
--    La tabla nunca se llegó a usar, así que no se pierde ningún dato.
--  - Se recrea el trigger de auditoría de Credito (copiado de Triggers.sql).
--  Las Estadísticas siguen funcionando igual (usan FechaRecibido, FechaResolucion y Aprobado, que no cambian).
--
-- Ejecutar UNA vez con el usuario root (MySQL Workbench, archivo completo con el rayo).
-- Se puede volver a ejecutar sin problema: solo cambia lo que falta.
-- Requiere haber ejecutado antes "Actualizacion limpieza de columnas 2026-11-08.sql".
-- Para una base nueva no hace falta: ya está en Tablas.sql y Triggers.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- Ejecuta el ALTER solo si la columna todavía no existe (o, con existe = 1, solo si todavía existe)
DROP PROCEDURE IF EXISTS cambiar_columna;
DELIMITER //
CREATE PROCEDURE cambiar_columna(IN tabla varchar(64), IN columna varchar(64), IN existe tinyint, IN sentencia text)
BEGIN
    IF (SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tabla AND COLUMN_NAME = columna) = existe THEN
        SET @sql = sentencia;
        PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;
    END IF;
END;
//
DELIMITER ;

-- 1. Credito: columnas de revisión (iguales a las de Subsidio)
CALL cambiar_columna('Credito', 'MensajeResolucion', 1,
    'ALTER TABLE Credito RENAME COLUMN MensajeResolucion TO MotivoRechazo');
CALL cambiar_columna('Credito', 'MotivoRechazo', 0,
    'ALTER TABLE Credito ADD COLUMN MotivoRechazo varchar(512) null AFTER FechaResolucion');
CALL cambiar_columna('Credito', 'MensajeSolicitudReenvio', 0,
    'ALTER TABLE Credito ADD COLUMN MensajeSolicitudReenvio varchar(512) null AFTER MotivoRechazo');
CALL cambiar_columna('Credito', 'MontoAnterior', 0,
    'ALTER TABLE Credito ADD COLUMN MontoAnterior decimal(12, 2) null AFTER monto');
CALL cambiar_columna('Credito', 'EstadoRevision', 0,
    'ALTER TABLE Credito ADD COLUMN EstadoRevision tinyint not null default 0 AFTER FechaRecibido');
CALL cambiar_columna('Credito', 'ReenvioSolicitado', 0,
    'ALTER TABLE Credito ADD COLUMN ReenvioSolicitado boolean not null default False AFTER EstadoRevision');
ALTER TABLE Credito ALTER COLUMN FechaRecibido SET DEFAULT (current_date);

-- 2. Los créditos ya aprobados o rechazados quedan finalizados
UPDATE Credito SET EstadoRevision = 2 WHERE Aprobado IS NOT NULL AND EstadoRevision <> 2 AND idCredito > 0;

-- 3. Solo se finaliza con Aprobado en True o False, y una resolución siempre deja el crédito finalizado
SET @existe = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Credito' AND CONSTRAINT_NAME = 'chk_estado_revision_cred');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Credito ADD CONSTRAINT chk_estado_revision_cred CHECK ((Aprobado IS NULL AND EstadoRevision IN (0, 1)) OR (Aprobado IS NOT NULL AND EstadoRevision = 2))',
    'SELECT ''La restricción chk_estado_revision_cred ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 4. Garante: un solo PDF con la hoja del garante y sus documentos, CUIL y Telefono sin tilde
CALL cambiar_columna('Garante', 'Teléfono', 1,
    'ALTER TABLE Garante RENAME COLUMN `Teléfono` TO Telefono');
CALL cambiar_columna('Garante', 'Cuil', 0,
    'ALTER TABLE Garante ADD COLUMN Cuil varchar(11) not null AFTER DNI');
CALL cambiar_columna('Garante', 'PathFormularioGarante', 0,
    'ALTER TABLE Garante ADD COLUMN PathFormularioGarante varchar(1024) not null AFTER Correo');
CALL cambiar_columna('Garante', 'PathFotocopiaDNIautenticada', 1, 'ALTER TABLE Garante DROP COLUMN PathFotocopiaDNIautenticada');
CALL cambiar_columna('Garante', 'ConstanciaCuil', 1, 'ALTER TABLE Garante DROP COLUMN ConstanciaCuil');
CALL cambiar_columna('Garante', 'PathCertificadoResidencia', 1, 'ALTER TABLE Garante DROP COLUMN PathCertificadoResidencia');
CALL cambiar_columna('Garante', 'PathBoletaImpuesto', 1, 'ALTER TABLE Garante DROP COLUMN PathBoletaImpuesto');
CALL cambiar_columna('Garante', 'PathCopiaResiboSueldo', 1, 'ALTER TABLE Garante DROP COLUMN PathCopiaResiboSueldo');

DROP PROCEDURE IF EXISTS cambiar_columna;

-- 5. Trigger de auditoría de Credito (copiado de Triggers.sql)
DROP TRIGGER IF EXISTS tg_auditoria_Credito_update;
DELIMITER //
CREATE TRIGGER tg_auditoria_Credito_update
AFTER UPDATE ON Credito
FOR EACH ROW
BEGIN
    -- 1. Resolución del Credito (Aprobado/Rechazado)
    IF (OLD.Aprobado IS NULL AND NEW.Aprobado IS NOT NULL) OR (OLD.Aprobado <> NEW.Aprobado) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Credito', NEW.idCredito,
			CONCAT('Estado del Crédito actualizado a: ', CASE WHEN NEW.Aprobado = 1 THEN 'OTORGADO' ELSE 'RECHAZADO' END,
				' - Revisor ID: ', COALESCE(NEW.idEmpleadoRevisor, 'N/C'),
				IF(NEW.Aprobado = 0 AND NEW.MotivoRechazo IS NOT NULL, CONCAT(' - Motivo: ', NEW.MotivoRechazo), '')),
			@usuario_ip);
    END IF;

    -- 2. Rendición de Cuentas (Entrega y validación de facturas)
    IF (OLD.FacturasEntregadas IS NULL AND NEW.FacturasEntregadas IS NOT NULL) OR (OLD.FacturasEntregadas <> NEW.FacturasEntregadas) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Credito', NEW.idCredito,
			CONCAT('Rendición de facturas: ', CASE WHEN NEW.FacturasEntregadas = 1 THEN 'Entregadas y en revisión' ELSE 'Sin entregar/Retiradas' END),
            @usuario_ip);
    END IF;

    -- 3. Acreditación de Puesta en Marcha (El inspector fue a ver si el emprendimiento funciona)
    IF (OLD.PuestaMarchaAcreditada IS NULL AND NEW.PuestaMarchaAcreditada IS NOT NULL) OR (OLD.PuestaMarchaAcreditada <> NEW.PuestaMarchaAcreditada) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Credito', NEW.idCredito,
			CONCAT('Verificación de campo: Puesta en marcha ', CASE WHEN NEW.PuestaMarchaAcreditada = 1 THEN 'ACREDITADA POSITIVA' ELSE 'NO ACREDITADA' END),
            @usuario_ip);
    END IF;

    -- 4. Reenvío del formulario (el emprendedor lo vuelve a completar porque el Área se lo pidió)
    IF (OLD.PathFormularioCredito <> NEW.PathFormularioCredito) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Credito', NEW.idCredito,
			CONCAT('Formulario de Crédito reenviado para Solicitud ID: ', NEW.idSolicitudInicio, '. Monto solicitado: $', NEW.monto,
				' (antes $', OLD.monto, '). Ubicacion del formulario: ', NEW.PathFormularioCredito),
			@usuario_ip);
    -- 5. SEGURO DE INTEGRIDAD: Si se cambió el monto sin reenviar el formulario
    ELSEIF (OLD.monto <> NEW.monto) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Credito', NEW.idCredito,
			CONCAT('¡ALERTA DE CONTROL! Alteración de valor económico. Monto anterior: $', OLD.monto, ' -> Nuevo Monto: $', NEW.monto),
			@usuario_ip);
    END IF;

    -- 6. Un empleado del Área comenzó la revisión (pasa a "En Revisión")
    IF (OLD.EstadoRevision = 0 AND NEW.EstadoRevision = 1) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Credito', NEW.idCredito,
			CONCAT('Revisión del Crédito iniciada para Solicitud ID: ', NEW.idSolicitudInicio),
			@usuario_ip);
    END IF;

    -- 7. El Área le pidió al emprendedor que reenvíe el formulario
    IF (OLD.ReenvioSolicitado = 0 AND NEW.ReenvioSolicitado = 1) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Credito', NEW.idCredito,
			CONCAT('Se solicitó al emprendedor el reenvío del formulario de Crédito: ', COALESCE(NEW.MensajeSolicitudReenvio, '')),
			@usuario_ip);
    END IF;
END;
//
DELIMITER ;
