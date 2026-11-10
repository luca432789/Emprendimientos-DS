use ProyectoEmprendimientos2026;

-- DROP USER 'ministerio_api'@'localhost';

-- Crear un usuario exclusivo para el Backend de Node.js
CREATE USER IF NOT EXISTS 'ministerio_api'@'localhost' IDENTIFIED BY 'nodejs123!';

-- Show grants for ministerio_api@localhost; -- muestra los permisos que posee el usuario

-- Concedemos los permisos de Select para todas las tablas
GRANT SELECT ON ProyectoEmprendimientos2026.* TO 'ministerio_api'@'localhost';

-- tablas que cumplen permisos de insert y update: Empleado, SolicitudInicio, Rubro, Emprendimiento, Emprendedor, Usuario, Publicacion, Subsidio, Credito, Producto, EnlaceContrasena, Noticia.
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Empleado TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.SolicitudInicio TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Rubro TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Emprendimiento TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Emprendedor TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Usuario TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE, DELETE ON ProyectoEmprendimientos2026.Publicacion TO 'ministerio_api'@'localhost'; -- DELETE: el emprendedor puede eliminar sus publicaciones
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Subsidio TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Credito TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Producto TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.EnlaceContrasena TO 'ministerio_api'@'localhost';
GRANT INSERT, UPDATE, DELETE ON ProyectoEmprendimientos2026.Noticia TO 'ministerio_api'@'localhost'; -- DELETE: los noticieros pueden eliminar una noticia (u ocultarla con Visible)

-- tablas que cumplen permisos de insert: DatosSolicitudInicio (update coordenadas), Auditoria, Expediente, Garante
GRANT INSERT ON ProyectoEmprendimientos2026.DatosSolicitudInicio TO 'ministerio_api'@'localhost';
GRANT UPDATE (EmprendimientoLatitud, EmprendimientoLongitud) ON ProyectoEmprendimientos2026.DatosSolicitudInicio TO 'ministerio_api'@'localhost';
GRANT INSERT ON ProyectoEmprendimientos2026.Auditoria TO 'ministerio_api'@'localhost';
GRANT INSERT ON ProyectoEmprendimientos2026.Expediente TO 'ministerio_api'@'localhost';
GRANT INSERT ON ProyectoEmprendimientos2026.Garante TO 'ministerio_api'@'localhost';
-- Garante: el reenvío del crédito actualiza sus datos y su PDF (no idCredito)
GRANT UPDATE (NombreCompleto, DNI, Cuil, Telefono, Correo, PathFormularioGarante) ON ProyectoEmprendimientos2026.Garante TO 'ministerio_api'@'localhost';
GRANT INSERT ON ProyectoEmprendimientos2026.NotificacionVista TO 'ministerio_api'@'localhost';

-- Aplicar los cambios. No hace falta ejecutar la siguiente linea si acabas de crear el usuario y sus permisos
FLUSH PRIVILEGES;

