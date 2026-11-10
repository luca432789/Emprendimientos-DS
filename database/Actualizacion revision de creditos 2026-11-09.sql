-- ------------------------------------------------------------------------------------------------------------------------
-- ACTUALIZACIÓN para bases YA CREADAS: revisión del Crédito por el Área (09/11/2026)
--  - Credito.ParteReenvio: qué parte del formulario se le pidió reenviar al emprendedor
--      'Completo': todo el formulario (hojas 1 a 7, presupuestos y documentos del garante)
--      'Titular' : solo las hojas 1 a 6 y los presupuestos (se conserva lo del garante)
--      'Garante' : solo la hoja 7 y los documentos del garante (se conserva lo del titular)
--    Queda guardada con el último pedido, igual que MensajeSolicitudReenvio.
--  - Se recrea el trigger de auditoría de Credito (copiado de Triggers.sql): ahora dice qué parte se pidió y se reenvió.
--  - Al rechazar el crédito, la solicitud de inicio queda finalizada como "Rechazado por Crédito" (no cambia la base).
--  Las Estadísticas siguen funcionando igual (no usan esta columna).
--
-- Ejecutar UNA vez con el usuario root (MySQL Workbench, archivo completo con el rayo).
-- Se puede volver a ejecutar sin problema: solo cambia lo que falta.
-- Requiere haber ejecutado antes "Actualizacion credito y garante 2026-11-09.sql".
-- Para una base nueva no hace falta: ya está en Tablas.sql y Triggers.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- 1. Credito.ParteReenvio (solo si todavía no existe)
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Credito' AND COLUMN_NAME = 'ParteReenvio');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Credito ADD COLUMN ParteReenvio enum(''Completo'', ''Titular'', ''Garante'') null AFTER ReenvioSolicitado',
    'SELECT ''La columna ParteReenvio ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 2. Los pedidos de reenvío que ya estaban hechos eran del formulario completo
UPDATE Credito SET ParteReenvio = 'Completo' WHERE MensajeSolicitudReenvio IS NOT NULL AND ParteReenvio IS NULL AND idCredito > 0;

-- 3. Trigger de auditoría de Credito
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
			CONCAT('Formulario de Crédito reenviado para Solicitud ID: ', NEW.idSolicitudInicio,
				' (parte reenviada: ', COALESCE(NEW.ParteReenvio, 'Completo'), '). Monto solicitado: $', NEW.monto,
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
			CONCAT('Se solicitó al emprendedor el reenvío del formulario de Crédito (parte: ', COALESCE(NEW.ParteReenvio, 'Completo'), '): ',
				COALESCE(NEW.MensajeSolicitudReenvio, '')),
			@usuario_ip);
    END IF;
END;
//
DELIMITER ;
