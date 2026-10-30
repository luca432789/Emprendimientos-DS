-- ------------------------------------------------------------------------------------------------------------------------
-- ELIMINAR NOTICIAS (botón "Eliminar" en la pestaña Noticias, para usuarios con permiso de Noticiero)
-- Además de ocultar, una noticia se puede borrar definitivamente junto con su imagen.
-- El trigger deja en Auditoria el título de la noticia borrada.
--
-- Ejecutar UNA vez con el usuario root en una base ya creada (se puede volver a ejecutar sin problema).
-- Para una base nueva ya está incluido en Triggers.sql y Usuario Conexion.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- 1. Trigger de auditoría: guarda el título y si estaba visible u oculta
DROP TRIGGER IF EXISTS tg_auditoria_Noticia_delete;
DELIMITER //
CREATE TRIGGER tg_auditoria_Noticia_delete
AFTER DELETE ON Noticia
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
        @usuario_id, 'DELETE', 'Noticia', OLD.idNoticia,
        CONCAT('Noticia eliminada: "', OLD.Titulo, '"',
            CASE WHEN OLD.Visible THEN ' (estaba visible)' ELSE ' (estaba oculta)' END,
            CASE WHEN OLD.ImagenUrl IS NOT NULL THEN ' - se borró también su imagen' ELSE '' END),
        @usuario_ip);
END;
//
DELIMITER ;

-- 2. Permiso del usuario de la API para borrar noticias
GRANT DELETE ON ProyectoEmprendimientos2026.Noticia TO 'ministerio_api'@'localhost';
FLUSH PRIVILEGES;

SELECT 'Eliminar noticias instalado' AS resultado;
