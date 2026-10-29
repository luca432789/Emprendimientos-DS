-- ------------------------------------------------------------------------------------------------------------------------
-- NOTICIAS (pestaña "Noticias" del menú)
-- Las publican los usuarios "Empleado de Area" o "Administrador" que tengan el permiso Noticiero.
-- El autor puede editar su noticia solo durante la primera hora; después solo se puede ocultar o mostrar.
--
-- Ejecutar UNA vez con el usuario root en una base ya creada (se puede volver a ejecutar sin problema).
-- Para una base nueva ya está incluido en Tablas.sql, Triggers.sql y Usuario Conexion.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- 1. Usuario.Noticiero: permiso para crear y editar noticias (lo otorga un Administrador)
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'Noticiero');
SET @sql = IF(@existe = 0,
    'ALTER TABLE Usuario ADD COLUMN Noticiero boolean not null default False AFTER Activa',
    'SELECT ''La columna Noticiero ya existe'' AS aviso');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 2. Noticia (idNoticia (PK), Titulo, Contenido, ImagenUrl, Visible (Si-No), idAutor (FK), FechaCreacion, FechaEdicion)
create table if not exists Noticia (
idNoticia int auto_increment primary key,
Titulo varchar(255) not null,
Contenido text not null,
ImagenUrl varchar(255) null,            -- ruta web de la imagen (ej: /uploads/NoticiasImagen/noticia-1729000000000-1.jpg)
Visible boolean not null default True,  -- false = oculta en la página pública (ej: noticias muy viejas). La API no borra registros
idAutor int not null,                   -- usuario que la publicó
FechaCreacion timestamp not null default current_timestamp,
FechaEdicion timestamp null,            -- la carga el trigger cuando se edita el título, contenido o imagen
constraint fk_Noticia_Autor
	foreign key (idAutor) references Usuario(idUsuario)
);

-- 3. Trigger de Usuario (copiado de Triggers.sql): ahora también registra el cambio del permiso Noticiero
DROP TRIGGER IF EXISTS tg_auditoria_usuario_update;
DELIMITER //
CREATE TRIGGER tg_auditoria_usuario_update
AFTER UPDATE ON Usuario
FOR EACH ROW
BEGIN
    -- 1. Verificamos si cambió el estado de activación (Baja/Alta lógica)
    IF OLD.Activa <> NEW.Activa THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Usuario', NEW.idUsuario,
			CONCAT('Cambio de estado de cuenta para ', NEW.Correo, ': ',
				CASE WHEN NEW.Activa = 1 THEN 'Cuenta Activada' ELSE 'Cuenta Suspendida/Desactivada' END),
			@usuario_ip);
    END IF;

    -- 2. Verificamos si se le cambió el Tipo de Usuario (Permisos)
    IF OLD.TipoUsuario <> NEW.TipoUsuario THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
            @usuario_id, 'UPDATE', 'Usuario', NEW.idUsuario,
            CONCAT('Cambio de Rol para ', NEW.Correo, ': ', ' de ', OLD.TipoUsuario, ' a ', NEW.TipoUsuario),
            @usuario_ip);
    END IF;

    -- 3. Verificamos si cambió el correo de acceso
    IF OLD.Correo <> NEW.Correo THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Usuario', NEW.idUsuario,
			CONCAT('Cambio de correo de inicio de sesión: ', OLD.Correo, ' -> ', NEW.Correo),
			@usuario_ip);
    END IF;

    -- 4. Verificamos si cambió la contraseña de acceso
    IF OLD.Contraseña <> NEW.Contraseña THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
            @usuario_id, 'UPDATE', 'Usuario', NEW.idUsuario,
            CONCAT('ALERTA DE SEGURIDAD: El usuario ', NEW.Correo, ' modificó su contraseña de acceso.'),
            @usuario_ip);
    END IF;

    -- 5. Verificamos si cambió el permiso para publicar noticias
    IF OLD.Noticiero <> NEW.Noticiero THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
            @usuario_id, 'UPDATE', 'Usuario', NEW.idUsuario,
            CONCAT('Permiso de Noticiero para ', NEW.Correo, ': ', CASE WHEN NEW.Noticiero = 1 THEN 'Otorgado' ELSE 'Quitado' END),
            @usuario_ip);
    END IF;
END;
//
DELIMITER ;

-- 4. TRIGGERS DE NOTICIA - SEGURIDAD Y AUDITORIA -------------------------------------------------------------------------
-- Solo puede publicar un usuario activo, Empleado de Area o Administrador, con el permiso Noticiero
DROP TRIGGER IF EXISTS tg_Noticia_autor_insert;
DELIMITER //
CREATE TRIGGER tg_Noticia_autor_insert
BEFORE INSERT ON Noticia
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM Usuario
        WHERE idUsuario = NEW.idAutor AND Activa = 1 AND Noticiero = 1
          AND TipoUsuario IN ('Empleado de Area', 'Administrador')
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error de Seguridad: El usuario no tiene permiso de Noticiero.';
    END IF;
END;
//
DELIMITER ;

-- El título, contenido e imagen solo se pueden cambiar durante la primera hora. Visible se puede cambiar siempre.
DROP TRIGGER IF EXISTS tg_Noticia_edicion_update;
DELIMITER //
CREATE TRIGGER tg_Noticia_edicion_update
BEFORE UPDATE ON Noticia
FOR EACH ROW
BEGIN
    IF NOT (OLD.idAutor <=> NEW.idAutor AND OLD.FechaCreacion <=> NEW.FechaCreacion) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error de Seguridad: No se puede cambiar el autor ni la fecha de una noticia.';
    END IF;

    IF NOT (OLD.Titulo <=> NEW.Titulo AND OLD.Contenido <=> NEW.Contenido AND OLD.ImagenUrl <=> NEW.ImagenUrl) THEN
        IF NOW() > OLD.FechaCreacion + INTERVAL 1 HOUR THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La noticia solo se puede editar durante la primera hora desde su creación.';
        END IF;
        SET NEW.FechaEdicion = NOW();
    END IF;
END;
//
DELIMITER ;

DROP TRIGGER IF EXISTS tg_auditoria_Noticia_insert;
DELIMITER //
CREATE TRIGGER tg_auditoria_Noticia_insert
AFTER INSERT ON Noticia
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
        @usuario_id, 'INSERT', 'Noticia', NEW.idNoticia,
        CONCAT('Nueva noticia publicada: "', NEW.Titulo, '"', CASE WHEN NEW.ImagenUrl IS NOT NULL THEN ' (con imagen)' ELSE '' END),
        @usuario_ip);
END;
//
DELIMITER ;

DROP TRIGGER IF EXISTS tg_auditoria_Noticia_update;
DELIMITER //
CREATE TRIGGER tg_auditoria_Noticia_update
AFTER UPDATE ON Noticia
FOR EACH ROW
BEGIN
    IF OLD.Visible <> NEW.Visible THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
            @usuario_id, 'UPDATE', 'Noticia', NEW.idNoticia,
            CONCAT('Noticia "', NEW.Titulo, '" ', CASE WHEN NEW.Visible THEN 'visible nuevamente' ELSE 'ocultada' END),
            @usuario_ip);
    END IF;

    IF NOT (OLD.Titulo <=> NEW.Titulo AND OLD.Contenido <=> NEW.Contenido AND OLD.ImagenUrl <=> NEW.ImagenUrl) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
            @usuario_id, 'UPDATE', 'Noticia', NEW.idNoticia,
            CONCAT('Noticia editada: "', NEW.Titulo, '"',
                CASE WHEN OLD.Titulo <> NEW.Titulo THEN CONCAT(' (título anterior: "', OLD.Titulo, '")') ELSE '' END,
                CASE WHEN NOT (OLD.ImagenUrl <=> NEW.ImagenUrl) THEN ' - cambió la imagen' ELSE '' END),
            @usuario_ip);
    END IF;
END;
//
DELIMITER ;

-- 5. Permisos del usuario de la API (la API no borra noticias: las oculta)
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Noticia TO 'ministerio_api'@'localhost';
FLUSH PRIVILEGES;

SELECT 'Noticias instaladas' AS resultado;
