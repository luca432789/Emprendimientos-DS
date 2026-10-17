-- ------------------------------------------------------------------------------------------------------------------------
-- NOTIFICACIONES VISTAS (campanita del navbar)
-- Guarda qué notificaciones ya vio cada usuario, para que no le vuelvan a aparecer como nuevas
-- aunque entre desde otra computadora o navegador.
-- Ejecutar con el usuario root en una base ya creada. Para una base nueva ya está incluido en
-- Tablas.sql y Usuario Conexion.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- NotificacionVista (idUsuario (PK, FK), Clave (PK), FechaVista)
create table if not exists NotificacionVista (
idUsuario int not null,
Clave varchar(150) not null,            -- identifica la notificación (ej: pub-2-0-2026-10-17-votn1f)
FechaVista timestamp not null default current_timestamp,
primary key (idUsuario, Clave),
constraint fk_NotificacionVista_Usuario
	foreign key (idUsuario) references Usuario(idUsuario)
);

-- PERMISOS DEL BACKEND (solo agregar: marcar como vista; la lectura ya está cubierta por el SELECT general)
GRANT INSERT ON ProyectoEmprendimientos2026.NotificacionVista TO 'ministerio_api'@'localhost';
FLUSH PRIVILEGES;
