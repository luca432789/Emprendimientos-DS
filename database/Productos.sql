-- ------------------------------------------------------------------------------------------------------------------------
-- PRODUCTOS DEL EMPRENDIMIENTO (pestaña "Productos" del perfil del emprendedor)
-- Ejecutar con el usuario root en una base ya creada. Para una base nueva ya está incluido en
-- Tablas.sql, Triggers.sql y Usuario Conexion.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- Producto (idProducto (PK), idEmprendimiento (FK), Nombre, Precio, Descripcion, PathFoto, Activo (Si-No), FechaAlta)
create table if not exists Producto (
idProducto int auto_increment primary key,
idEmprendimiento int not null,
Nombre varchar(100) not null,
Precio decimal(12, 2) null,             -- null = "Consultar precio"
Descripcion varchar(500) null,
PathFoto varchar(1024) null,            -- ruta web de la foto (ej: /uploads/productos/1/producto-3-xxxx.jpg)
Activo boolean not null default true,   -- false = oculto en el perfil público (la API no borra registros)
FechaAlta date not null default (current_date),
constraint fk_Producto_Emprendimiento
	foreign key (idEmprendimiento) references Emprendimiento(idEmprendimiento)
);

-- TRIGGERS DE PRODUCTO - AUDITORIA ----------------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS tg_auditoria_Producto_insert;
DELIMITER //
CREATE TRIGGER tg_auditoria_Producto_insert
AFTER INSERT ON Producto
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
        @usuario_id, 'INSERT', 'Producto', NEW.idProducto,
        CONCAT('Nuevo producto en Emprendimiento ID: ', NEW.idEmprendimiento, '. Producto: "', NEW.Nombre, '"'),
        @usuario_ip);
END;
//
DELIMITER ;

DROP TRIGGER IF EXISTS tg_auditoria_Producto_update;
DELIMITER //
CREATE TRIGGER tg_auditoria_Producto_update
AFTER UPDATE ON Producto
FOR EACH ROW
BEGIN
    IF OLD.Activo <> NEW.Activo THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
            @usuario_id, 'UPDATE', 'Producto', NEW.idProducto,
            CONCAT('Producto "', NEW.Nombre, '" ', CASE WHEN NEW.Activo THEN 'visible nuevamente' ELSE 'ocultado' END),
            @usuario_ip);
    ELSE
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
            @usuario_id, 'UPDATE', 'Producto', NEW.idProducto,
            CONCAT('Producto editado: "', NEW.Nombre, '"'),
            @usuario_ip);
    END IF;
END;
//
DELIMITER ;

-- PERMISOS DEL BACKEND ------------------------------------------------------------------------------------------------------
GRANT INSERT, UPDATE ON ProyectoEmprendimientos2026.Producto TO 'ministerio_api'@'localhost';
FLUSH PRIVILEGES;
