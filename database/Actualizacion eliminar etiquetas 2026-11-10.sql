-- ------------------------------------------------------------------------------------------------------------------------
-- ACTUALIZACIÓN para bases YA CREADAS: se eliminan las Etiquetas de Publicaciones (10/11/2026)
--  - No se van a usar: el filtro de Publicaciones (rubro y búsqueda) ya cumple esa función.
--  - Se borran las tablas Publicacion_Etiqueta y Etiqueta (sus triggers de auditoría se borran con la tabla)
--    y los permisos que tenía sobre ellas el usuario de la aplicación.
--  - Los registros viejos de la Auditoría sobre etiquetas se conservan.
--
-- Ejecutar UNA vez con el usuario root (MySQL Workbench, archivo completo con el rayo).
-- Se puede volver a ejecutar sin problema.
-- Para una base nueva no hace falta: ya no están en Tablas.sql, Triggers.sql ni Usuario Conexion.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- 1. Permisos del usuario de la aplicación (IF EXISTS: no falla si ya se quitaron)
REVOKE IF EXISTS INSERT, DELETE ON ProyectoEmprendimientos2026.Publicacion_Etiqueta FROM 'ministerio_api'@'localhost' IGNORE UNKNOWN USER;
REVOKE IF EXISTS INSERT, UPDATE ON ProyectoEmprendimientos2026.Etiqueta FROM 'ministerio_api'@'localhost' IGNORE UNKNOWN USER;
FLUSH PRIVILEGES;

-- 2. Tablas (primero la intermedia, que referencia a Etiqueta)
DROP TABLE IF EXISTS Publicacion_Etiqueta;
DROP TABLE IF EXISTS Etiqueta;

-- Comprobación: no debe aparecer ninguna de las dos tablas
SELECT TABLE_NAME FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('Etiqueta', 'Publicacion_Etiqueta');
