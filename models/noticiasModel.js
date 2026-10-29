import { pool } from '../config/db.js';
import { ejecutarConAuditoria } from './publicacionesModel.js';

// Roles que pueden tener el permiso Noticiero (mismo control que el trigger tg_Noticia_autor_insert)
export const ROLES_NOTICIERO = ['Empleado de Area', 'Administrador'];

// Se consulta en la base y no en el token: el administrador puede quitar el permiso en cualquier momento
export const modelEsNoticiero = async (idUsuario) => {
    const [filas] = await pool.query(
        'SELECT 1 FROM Usuario WHERE idUsuario = ? AND Activa = 1 AND Noticiero = 1 AND TipoUsuario IN (?);',
        [idUsuario, ROLES_NOTICIERO]
    );
    return filas.length > 0;
};

// SegundosEdicion: lo que le queda al autor para editar (0 = ya pasó la hora). Se calcula en MySQL
// para usar el mismo reloj que el trigger tg_Noticia_edicion_update.
const COLUMNAS_NOTICIA = `
    n.idNoticia, n.Titulo, n.Contenido, n.ImagenUrl, n.Visible, n.idAutor, n.FechaCreacion, n.FechaEdicion,
    COALESCE(NULLIF(TRIM(CONCAT_WS(' ', e.Nombre, e.Apellido)), ''), 'Ministerio de Desarrollo Social') AS Autor,
    GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), n.FechaCreacion + INTERVAL 1 HOUR)) AS SegundosEdicion`;

const normalizarNoticia = (n) => ({ ...n, Visible: Boolean(n.Visible), SegundosEdicion: Number(n.SegundosEdicion) });

// soloVisibles = true para el público (los noticieros ven también las ocultas)
export const modelContarNoticias = async (soloVisibles) => {
    const [filas] = await pool.query(`SELECT COUNT(*) AS total FROM Noticia ${soloVisibles ? 'WHERE Visible = 1' : ''};`);
    return Number(filas[0].total);
};

// Columna de la derecha: solo título y fecha, de la más nueva a la más vieja (el contenido se pide de a una)
export const modelListarNoticias = async (soloVisibles, limite, offset) => {
    const [filas] = await pool.query(
        `SELECT idNoticia, Titulo, Visible, FechaCreacion
         FROM Noticia
         ${soloVisibles ? 'WHERE Visible = 1' : ''}
         ORDER BY FechaCreacion DESC, idNoticia DESC
         LIMIT ? OFFSET ?;`,
        [limite, offset]
    );
    return filas.map((n) => ({ ...n, Visible: Boolean(n.Visible) }));
};

export const modelObtenerNoticia = async (idNoticia) => {
    const [filas] = await pool.query(
        `SELECT ${COLUMNAS_NOTICIA}
         FROM Noticia n
         INNER JOIN Usuario u ON u.idUsuario = n.idAutor
         LEFT JOIN Empleado e ON e.idEmpleado = u.idEmpleado
         WHERE n.idNoticia = ?;`,
        [idNoticia]
    );
    return filas[0] ? normalizarNoticia(filas[0]) : null;
};

// Alta (la imagen ya está guardada; imagenUrl puede ser null)
export const modelCrearNoticia = async (idAutor, datos, imagenUrl, datosAuditoria) => {
    return ejecutarConAuditoria(datosAuditoria, async (conexion) => {
        const [resultado] = await conexion.query(
            'INSERT INTO Noticia (Titulo, Contenido, ImagenUrl, Visible, idAutor) VALUES (?, ?, ?, 1, ?);',
            [datos.titulo, datos.contenido, imagenUrl, idAutor]
        );
        return resultado.insertId;
    });
};

// Solo el autor y dentro de la primera hora (el trigger también lo controla y carga FechaEdicion)
export const modelEditarNoticia = async (idNoticia, idAutor, datos, imagenUrl, datosAuditoria) => {
    return ejecutarConAuditoria(datosAuditoria, async (conexion) => {
        const [resultado] = await conexion.query(
            `UPDATE Noticia SET Titulo = ?, Contenido = ?, ImagenUrl = ?
             WHERE idNoticia = ? AND idAutor = ? AND NOW() <= FechaCreacion + INTERVAL 1 HOUR;`,
            [datos.titulo, datos.contenido, imagenUrl, idNoticia, idAutor]
        );
        return resultado.affectedRows;
    });
};

// Ocultar o mostrar (la API no tiene permiso de DELETE)
export const modelCambiarVisibilidadNoticia = async (idNoticia, visible, datosAuditoria) => {
    return ejecutarConAuditoria(datosAuditoria, async (conexion) => {
        const [resultado] = await conexion.query(
            'UPDATE Noticia SET Visible = ? WHERE idNoticia = ?;',
            [visible, idNoticia]
        );
        return resultado.affectedRows;
    });
};
