-- ------------------------------------------------------------------------------------------------------------------------
-- ACTUALIZACIÓN para bases YA CREADAS: cambios de la rama desarrollo-panel (Luca, 22/10/2026)
-- "Creación automática de emprendimientos desde la solicitud de inicio y carga histórica"
--
-- Ejecutar UNA vez con el usuario root (MySQL Workbench, archivo completo con el rayo).
-- Se puede volver a ejecutar sin problema: solo agrega lo que falta.
-- Para una base nueva no hace falta: ya está en Tablas.sql y Triggers.sql.
-- Requiere haber ejecutado antes "Actualizacion desarrollo-panel 2026-10-20.sql".
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- 1. SolicitudInicio.CargaHistorica: emprendimientos antiguos cargados directo por un empleado
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SolicitudInicio' AND COLUMN_NAME = 'CargaHistorica');
SET @sql = IF(@existe = 0,
    'ALTER TABLE SolicitudInicio ADD COLUMN CargaHistorica boolean not null default False AFTER FechaResolucionMin',
    'SELECT ''La columna CargaHistorica ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 2. DatosSolicitudInicio: nombre, localidad y actividad principal del emprendimiento
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DatosSolicitudInicio' AND COLUMN_NAME = 'EmprendimientoNombre');
SET @sql = IF(@existe = 0,
    'ALTER TABLE DatosSolicitudInicio ADD COLUMN EmprendimientoNombre varchar(50) not null default '''' AFTER PersonaCorreo, ADD COLUMN EmprendimientoLocalidad varchar(40) not null default '''' AFTER EmprendimientoDepto, ADD COLUMN EmprendimientoActPrincipal varchar(400) not null default '''' AFTER EmprendimientoLocalidad',
    'SELECT ''Las columnas del emprendimiento ya existen'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 3. Las solicitudes cargadas antes de este cambio no tienen esos datos: se completan con lo que ya existe.
--    El nombre queda provisorio (el rubro) hasta que el Área lo corrija.
--    Va antes del paso 4 porque el trigger nuevo bloquea cambiar estas columnas.
UPDATE DatosSolicitudInicio
SET EmprendimientoNombre = IF(EmprendimientoNombre = '', LEFT(EmprendimientoRubro, 50), EmprendimientoNombre),
    EmprendimientoLocalidad = IF(EmprendimientoLocalidad = '', LEFT(PersonaLocalidad, 40), EmprendimientoLocalidad),
    EmprendimientoActPrincipal = IF(EmprendimientoActPrincipal = '', LEFT(EmprendimientoRubro, 400), EmprendimientoActPrincipal)
WHERE idDatosSolicitudInicio > 0
  AND (EmprendimientoNombre = '' OR EmprendimientoLocalidad = '' OR EmprendimientoActPrincipal = '');

-- 4. Se quitan los valores por defecto para que quede igual que en Tablas.sql
ALTER TABLE DatosSolicitudInicio
    ALTER COLUMN EmprendimientoNombre DROP DEFAULT,
    ALTER COLUMN EmprendimientoLocalidad DROP DEFAULT,
    ALTER COLUMN EmprendimientoActPrincipal DROP DEFAULT;

-- 5. Trigger (copiado de Triggers.sql): DatosSolicitudInicio sigue permitiendo cambiar solo las coordenadas,
--    ahora contemplando las columnas nuevas
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
        OLD.EmprendimientoNombre <=> NEW.EmprendimientoNombre AND
        OLD.EmprendimientoCalle <=> NEW.EmprendimientoCalle AND
        OLD.EmprendimientoNroCalle <=> NEW.EmprendimientoNroCalle AND
        OLD.EmprendimientoBarrio <=> NEW.EmprendimientoBarrio AND
        OLD.EmprendimientoDepto <=> NEW.EmprendimientoDepto AND
        OLD.EmprendimientoLocalidad <=> NEW.EmprendimientoLocalidad AND
        OLD.EmprendimientoActPrincipal <=> NEW.EmprendimientoActPrincipal AND
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

SELECT 'Actualización 2026-10-22 aplicada' AS resultado;
