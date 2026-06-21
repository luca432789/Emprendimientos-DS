use ProyectoEmprendimientos2026;

-- DROP USER 'ministerio_api'@'localhost';

-- Crear un usuario exclusivo para el Backend de Node.js
CREATE USER 'ministerio_api'@'localhost' IDENTIFIED BY 'nodejs123!';

-- Show grants for ministerio_api@localhost; -- muestra los permisos que posee el usuario

-- Concedemos los permisos de Select para todas las tablas
GRANT SELECT ON ProyectoEmprendimientos2026.* TO 'ministerio_api'@'localhost';

-- tablas que cumplen permisos de insert y update: Empleado, SolicitudInicio, Emprendimiento, Emprendedor, Usuario, Publicacion, Etiqueta, Subsidio, Credito.
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Empleado TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.SolicitudInicio TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Emprendimiento TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Emprendedor TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Usuario TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Publicacion TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Etiqueta TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Subsidio TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Credito TO 'ministerio_api'@'localhost';

-- tablas que cumplen permisos de insert: Auditoria, Expediente, Garante
GRANT INSERT ON ProyectoEmprendimientos2026.Auditoria TO 'ministerio_api'@'localhost';
GRANT INSERT ON ProyectoEmprendimientos2026.Expediente TO 'ministerio_api'@'localhost';
GRANT INSERT ON ProyectoEmprendimientos2026.Garante TO 'ministerio_api'@'localhost';

-- Añadimos permisos especificos para ciertas tablas
GRANT INSERT, DELETE ON ProyectoEmprendimientos2026.Publicacion_Etiqueta TO 'ministerio_api'@'localhost';

-- Aplicar los cambios. No hace falta ejecutar la siguiente linea si acabas de crear el usuario y sus permisos
-- FLUSH PRIVILEGES;

