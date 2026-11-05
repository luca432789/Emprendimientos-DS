-- ------------------------------------------------------------------------------------------------------------------------
-- ACTUALIZACIÓN para bases YA CREADAS: formulario de Subsidio vinculado a la solicitud de inicio (05/11/2026)
-- "El emprendedor llena el subsidio con su Nº de expediente, correo y DNI; mientras no se resuelva, puede reenviarlo"
--
-- Ejecutar UNA vez con el usuario root (MySQL Workbench, archivo completo con el rayo).
-- Se puede volver a ejecutar sin problema: solo agrega lo que falta.
-- Para una base nueva no hace falta: ya está en Tablas.sql y Triggers.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- 1. Subsidio.EstadoRevision: 0 = Sin revisar, 1 = En proceso, 2 = Finalizado
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subsidio' AND COLUMN_NAME = 'EstadoRevision');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Subsidio ADD COLUMN EstadoRevision tinyint not null default 0 AFTER FechaRecibido',
    'SELECT ''La columna EstadoRevision ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 2. Los subsidios ya aprobados o rechazados quedan finalizados
UPDATE Subsidio SET EstadoRevision = 2 WHERE Aprobado IS NOT NULL AND idSubsidio > 0;

-- 3. Solo se finaliza con Aprobado en True o False, y una resolución siempre deja el subsidio finalizado
--    (mientras no esté finalizado, el emprendedor puede reenviar el formulario y se reemplaza el anterior)
SET @existe = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subsidio' AND CONSTRAINT_NAME = 'chk_estado_revision_sub');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Subsidio ADD CONSTRAINT chk_estado_revision_sub CHECK ((Aprobado IS NULL AND EstadoRevision IN (0, 1)) OR (Aprobado IS NOT NULL AND EstadoRevision = 2))',
    'SELECT ''La restricción chk_estado_revision_sub ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 4. Trigger de auditoría (copiado de Triggers.sql): registra el reenvío del formulario y,
--    en ese caso, el cambio de monto no se marca como alteración sospechosa
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
			CONCAT('Estado del Subsidio actualizado a: ', CASE WHEN NEW.Aprobado = 1 THEN 'OTORGADO' ELSE 'RECHAZADO' END,
				' - Revisor/Ministro ID: ', COALESCE(NEW.idEmpleadoRevisor, 'N/C')),
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

    -- 4. Reenvío del formulario (el emprendedor lo vuelve a completar antes de la resolución)
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
    
END;
//
DELIMITER ;
