import { pool } from '../config/db.js';

const construirCondicionesAuditoria = (filtros) => {
    const condiciones = [];
    const parametros = [];

    if (filtros.desde) {
        condiciones.push('Fecha_Hora >= ?');
        parametros.push(`${filtros.desde} 00:00:00`);
    }
    if (filtros.hastaExclusiva) {
        condiciones.push('Fecha_Hora < ?');
        parametros.push(`${filtros.hastaExclusiva} 00:00:00`);
    }
    if (filtros.tipoUsuario) {
        condiciones.push('idUsuario IN (SELECT idUsuario FROM Usuario WHERE TipoUsuario = ?)');
        parametros.push(filtros.tipoUsuario);
    }
    if (filtros.idUsuario) {
        condiciones.push('idUsuario = ?');
        parametros.push(filtros.idUsuario);
    }
    if (filtros.accion) {
        condiciones.push('Accion = ?');
        parametros.push(filtros.accion);
    }

    return {
        sql: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '',
        parametros
    };
};

export const ModelContarRegistrosAuditoria = async (filtros = {}) => {
    const condiciones = construirCondicionesAuditoria(filtros);
    const [filas] = await pool.query(
        `SELECT COUNT(*) AS total FROM Auditoria ${condiciones.sql}`,
        condiciones.parametros
    );
    return Number(filas[0].total);
};

export const ModelListarAuditoria = async (limite, offset, filtros = {}) => {
    const condiciones = construirCondicionesAuditoria(filtros);
    const [filas] = await pool.query(
        `SELECT
            idLog,
            idUsuario,
            Accion,
            Tabla_Afectada,
            idRegistroAfectado,
            Detalle,
            Fecha_Hora
         FROM Auditoria
         ${condiciones.sql}
         ORDER BY Fecha_Hora DESC, idLog DESC
         LIMIT ? OFFSET ?`,
        [...condiciones.parametros, limite, offset]
    );

    return filas;
};

export const ModelListarAccionesAuditoria = async () => {
    const [filas] = await pool.query(
        'SELECT DISTINCT Accion FROM Auditoria ORDER BY Accion'
    );
    return filas.map(fila => fila.Accion);
};

export const ModelBuscarUsuariosAuditoria = async (tipoUsuario, busqueda) => {
    const termino = `%${busqueda}%`;
    const [filas] = await pool.query(
        `SELECT
            u.idUsuario,
            u.TipoUsuario,
            u.Correo,
            COALESCE(
                NULLIF(CONCAT_WS(' ', e.Nombre, e.Apellido), ''),
                NULLIF(CONCAT_WS(' ', empr.Nombre, empr.Apellido), ''),
                u.Correo
            ) AS Nombre
         FROM Usuario u
         LEFT JOIN Empleado e ON e.idEmpleado = u.idEmpleado
         LEFT JOIN Emprendedor empr ON empr.idEmprendedor = u.idEmprendedor
         WHERE u.TipoUsuario = ?
           AND (
                u.Correo LIKE ?
                OR e.Nombre LIKE ?
                OR e.Apellido LIKE ?
                OR empr.Nombre LIKE ?
                OR empr.Apellido LIKE ?
                OR CONCAT_WS(' ', e.Nombre, e.Apellido) LIKE ?
                OR CONCAT_WS(' ', empr.Nombre, empr.Apellido) LIKE ?
           )
         ORDER BY Nombre, u.Correo
         LIMIT 50`,
        [tipoUsuario, termino, termino, termino, termino, termino, termino, termino]
    );

    return filas;
};