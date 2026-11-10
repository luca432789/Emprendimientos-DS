-- ------------------------------------------------------------------------------------------------------------------------
-- ACTUALIZACIÓN para bases YA CREADAS: el reenvío del crédito actualiza el garante en lugar de agregar otro (09/11/2026)
--  - La tabla Garante deja de ser inmutable para el UPDATE: cada crédito tiene un solo garante y el reenvío del formulario
--    (completo o solo la parte del garante) actualiza esa fila: sus datos, si los corrigieron, y el PDF del garante.
--  - Se recrea el trigger de UPDATE de Garante: antes rechazaba todo cambio; ahora registra en la auditoría qué cambió
--    y sigue sin permitir pasar el garante a otro crédito. El DELETE sigue prohibido.
--  - El usuario de la aplicación recibe permiso de UPDATE solo en las columnas de datos y del PDF (no en idCredito).
--  Los créditos que ya tienen varias filas de Garante (envíos anteriores) las conservan: vale la última y es la que se
--  actualiza en el próximo reenvío.
--
-- Ejecutar UNA vez con el usuario root (MySQL Workbench, archivo completo con el rayo).
-- Se puede volver a ejecutar sin problema.
-- Para una base nueva no hace falta: ya está en Triggers.sql y Usuario Conexion.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- 1. Permiso de UPDATE para la aplicación (solo estas columnas)
GRANT UPDATE (NombreCompleto, DNI, Cuil, Telefono, Correo, PathFormularioGarante)
    ON ProyectoEmprendimientos2026.Garante TO 'ministerio_api'@'localhost';

-- 2. Trigger de auditoría del UPDATE de Garante
DROP TRIGGER IF EXISTS tg_auditoria_Garante_update;
-- Trigger Update_Auditoria_Garante
-- El crédito tiene un solo garante: el reenvío del formulario actualiza su fila (datos y documento). Se registra qué cambió.
-- No se puede pasar el garante a otro crédito.
DELIMITER //
CREATE TRIGGER tg_auditoria_Garante_update
BEFORE UPDATE ON Garante
FOR EACH ROW
BEGIN
    IF NOT (OLD.idCredito <=> NEW.idCredito) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error de Seguridad: El garante no se puede pasar a otro crédito.';
    END IF;

    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
        @usuario_id, 'UPDATE', 'Garante', NEW.idGarante,
        CONCAT('Garante del Crédito ID: ', NEW.idCredito, ' actualizado por el reenvío del formulario.',
            IF(OLD.NombreCompleto <=> NEW.NombreCompleto, '', CONCAT(' Nombre: ', OLD.NombreCompleto, ' -> ', NEW.NombreCompleto, '.')),
            IF(OLD.DNI <=> NEW.DNI, '', CONCAT(' DNI: ', OLD.DNI, ' -> ', NEW.DNI, '.')),
            IF(OLD.Cuil <=> NEW.Cuil, '', CONCAT(' CUIL: ', OLD.Cuil, ' -> ', NEW.Cuil, '.')),
            IF(OLD.Telefono <=> NEW.Telefono, '', CONCAT(' Teléfono: ', OLD.Telefono, ' -> ', NEW.Telefono, '.')),
            IF(OLD.Correo <=> NEW.Correo, '', CONCAT(' Correo: ', OLD.Correo, ' -> ', NEW.Correo, '.')),
            IF(OLD.NombreCompleto <=> NEW.NombreCompleto AND OLD.DNI <=> NEW.DNI AND OLD.Cuil <=> NEW.Cuil
               AND OLD.Telefono <=> NEW.Telefono AND OLD.Correo <=> NEW.Correo, ' Mismos datos: solo se reemplazó su documento.', ''),
            ' Ubicación del documento: ', NEW.PathFormularioGarante),
        @usuario_ip
    );
END;
//
DELIMITER ;

-- Comprobación: debe aparecer el permiso de UPDATE sobre Garante
SHOW GRANTS FOR 'ministerio_api'@'localhost';
