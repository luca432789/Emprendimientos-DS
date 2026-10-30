-- ------------------------------------------------------------------------------------------------------------------------
-- ELIMINAR PUBLICACIONES (botón "Eliminar" en la pestaña Publicaciones del emprendedor)
-- El emprendedor puede borrar una de sus publicaciones (la versión aprobada y la que esté en revisión),
-- así libera el lugar para crear otra. El trigger deja en Auditoria qué se borró.
--
-- Ejecutar UNA vez con el usuario root en una base ya creada (se puede volver a ejecutar sin problema).
-- Para una base nueva ya está incluido en Triggers.sql y Usuario Conexion.sql.
-- ------------------------------------------------------------------------------------------------------------------------
use ProyectoEmprendimientos2026;

-- 1. Trigger de auditoría: guarda el título y el estado de la publicación borrada
DROP TRIGGER IF EXISTS tg_auditoria_publicacion_delete;
DELIMITER //
CREATE TRIGGER tg_auditoria_publicacion_delete
AFTER DELETE ON Publicacion
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
        @usuario_id, 'DELETE', 'Publicacion', OLD.idPublicacion,
        CONCAT('El emprendedor eliminó una publicación del Emprendimiento ID: ', OLD.idEmprendimiento,
            '. Título: "', COALESCE(OLD.TituloActual, OLD.TituloPendiente, 'Sin título'), '"',
            CASE WHEN OLD.TituloActual IS NOT NULL THEN ' (estaba visible en la web pública)' ELSE ' (no estaba aprobada)' END),
        @usuario_ip);
END;
//
DELIMITER ;

-- 2. Permiso del usuario de la API para borrar publicaciones (las etiquetas se borran solas: on delete cascade)
GRANT DELETE ON ProyectoEmprendimientos2026.Publicacion TO 'ministerio_api'@'localhost';
FLUSH PRIVILEGES;

SELECT 'Eliminar publicaciones instalado' AS resultado;
