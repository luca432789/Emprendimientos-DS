-- ------------------------------------------------------------------------------------------------------------------------
-- ACTUALIZACIÓN para bases YA CREADAS: Facturas de Ley del emprendedor (09/11/2026)
-- Columnas nuevas en Subsidio y en Credito (las mismas en las dos tablas):
--  - FechaEntregaFacturas: día en que el emprendedor envió sus facturas a revisar (FacturasEntregadas pasa a 1).
--  - MotivoObservacionFacturas: lo que escribe el empleado si no valida las facturas (FacturasEntregadas vuelve a 0
--      y el emprendedor puede corregirlas y volver a enviarlas).
--  - idEmpleadoFacturas: empleado que validó u observó las facturas.
--  - idEmpleadoPuestaMarcha: empleado que acreditó (o no) la puesta en marcha.
--  idEmpleadoRevisor sigue siendo el empleado que aprobó o rechazó el formulario.
--  Las facturas se guardan en la carpeta PathDirectorioFacturas (ya existía): se crea con la primera que sube el emprendedor.
--  Las Estadísticas siguen funcionando igual (no usan estas columnas).
--
-- Ejecutar UNA vez con el usuario root (MySQL Workbench, archivo completo con el rayo).
-- Se puede volver a ejecutar sin problema: solo agrega lo que falta.
-- No hacen falta permisos nuevos para ministerio_api (ya tiene UPDATE en Subsidio y Credito).
-- Para una base nueva no hace falta: ya está en Tablas.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- 1. Subsidio
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subsidio' AND COLUMN_NAME = 'FechaEntregaFacturas');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Subsidio ADD COLUMN FechaEntregaFacturas date null AFTER FacturasEntregadas',
    'SELECT ''La columna Subsidio.FechaEntregaFacturas ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subsidio' AND COLUMN_NAME = 'MotivoObservacionFacturas');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Subsidio ADD COLUMN MotivoObservacionFacturas varchar(512) null AFTER FechaFacturasValidadas',
    'SELECT ''La columna Subsidio.MotivoObservacionFacturas ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subsidio' AND COLUMN_NAME = 'idEmpleadoFacturas');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Subsidio ADD COLUMN idEmpleadoFacturas int null AFTER idEmpleadoRevisor,
        ADD CONSTRAINT fk_Subsidio_EmpleadoFacturas FOREIGN KEY (idEmpleadoFacturas) REFERENCES Empleado (idEmpleado)',
    'SELECT ''La columna Subsidio.idEmpleadoFacturas ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subsidio' AND COLUMN_NAME = 'idEmpleadoPuestaMarcha');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Subsidio ADD COLUMN idEmpleadoPuestaMarcha int null AFTER idEmpleadoFacturas,
        ADD CONSTRAINT fk_Subsidio_EmpleadoPuestaMarcha FOREIGN KEY (idEmpleadoPuestaMarcha) REFERENCES Empleado (idEmpleado)',
    'SELECT ''La columna Subsidio.idEmpleadoPuestaMarcha ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 2. Credito
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Credito' AND COLUMN_NAME = 'FechaEntregaFacturas');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Credito ADD COLUMN FechaEntregaFacturas date null AFTER FacturasEntregadas',
    'SELECT ''La columna Credito.FechaEntregaFacturas ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Credito' AND COLUMN_NAME = 'MotivoObservacionFacturas');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Credito ADD COLUMN MotivoObservacionFacturas varchar(512) null AFTER FechaFacturasValidadas',
    'SELECT ''La columna Credito.MotivoObservacionFacturas ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Credito' AND COLUMN_NAME = 'idEmpleadoFacturas');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Credito ADD COLUMN idEmpleadoFacturas int null AFTER idEmpleadoRevisor,
        ADD CONSTRAINT fk_Credito_EmpleadoFacturas FOREIGN KEY (idEmpleadoFacturas) REFERENCES Empleado (idEmpleado)',
    'SELECT ''La columna Credito.idEmpleadoFacturas ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Credito' AND COLUMN_NAME = 'idEmpleadoPuestaMarcha');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Credito ADD COLUMN idEmpleadoPuestaMarcha int null AFTER idEmpleadoFacturas,
        ADD CONSTRAINT fk_Credito_EmpleadoPuestaMarcha FOREIGN KEY (idEmpleadoPuestaMarcha) REFERENCES Empleado (idEmpleado)',
    'SELECT ''La columna Credito.idEmpleadoPuestaMarcha ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 3. Comprobación: deben aparecer las 4 columnas en cada tabla
SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('Subsidio', 'Credito')
  AND COLUMN_NAME IN ('FechaEntregaFacturas', 'MotivoObservacionFacturas', 'idEmpleadoFacturas', 'idEmpleadoPuestaMarcha')
ORDER BY TABLE_NAME, COLUMN_NAME;
