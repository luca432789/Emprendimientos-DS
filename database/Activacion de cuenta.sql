-- ------------------------------------------------------------------------------------------------------------------------
-- ENLACES PARA CREAR CONTRASEÑA (activación de la cuenta del emprendedor)
-- Cuando el Ministro aprueba un Formulario de Inicio (o se registra un emprendimiento histórico) se crea la cuenta del
-- emprendedor sin contraseña usable y se le envía por correo un enlace único para que cree la suya.
-- Acá se guarda ese enlace: de qué usuario es, hasta cuándo vale y si ya se usó.
-- Ejecutar con el usuario root en una base ya creada. Para una base nueva ya está incluido en
-- Tablas.sql y Usuario Conexion.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- EnlaceContrasena (idEnlace (PK), idUsuario (FK), TokenHash, Vence, Usado, FechaCreacion)
create table if not exists EnlaceContrasena (
idEnlace int auto_increment primary key,
idUsuario int not null,
TokenHash char(64) not null unique,     -- SHA-256 del código del enlace: el código real solo viaja en el correo
Vence datetime not null,                -- después de esta fecha el enlace ya no sirve
Usado boolean not null default false,   -- cada enlace sirve una sola vez
FechaCreacion timestamp not null default current_timestamp,
constraint fk_EnlaceContrasena_Usuario
	foreign key (idUsuario) references Usuario(idUsuario)
);

-- PERMISOS DEL BACKEND (crear enlaces y marcarlos como usados; la lectura ya está cubierta por el SELECT general)
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.EnlaceContrasena TO 'ministerio_api'@'localhost';
FLUSH PRIVILEGES;
