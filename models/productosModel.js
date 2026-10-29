import { pool } from '../config/db.js';
import { ejecutarConAuditoria } from './publicacionesModel.js';

// Productos por emprendimiento, contando también los ocultos (la API no borra productos:
// para cargar uno distinto se edita uno existente)
export const MAXIMO_PRODUCTOS = 4;

// Productos de un emprendimiento. soloActivos = true para el perfil público.
export const modelProductosDeEmprendimiento = async (idEmprendimiento, soloActivos) => {
    const [filas] = await pool.query(
        `SELECT idProducto, Nombre, Precio, Descripcion, PathFoto, Activo, FechaAlta
         FROM Producto
         WHERE idEmprendimiento = ? ${soloActivos ? 'AND Activo = 1' : ''}
         ORDER BY Activo DESC, idProducto DESC;`,
        [idEmprendimiento]
    );
    return filas.map((p) => ({ ...p, Activo: Boolean(p.Activo), Precio: p.Precio === null ? null : Number(p.Precio) }));
};

// Producto solo si pertenece al emprendimiento
export const modelProductoPropio = async (idProducto, idEmprendimiento) => {
    const [filas] = await pool.query(
        'SELECT idProducto, PathFoto FROM Producto WHERE idProducto = ? AND idEmprendimiento = ?;',
        [idProducto, idEmprendimiento]
    );
    return filas[0];
};

export const modelContarProductos = async (idEmprendimiento) => {
    const [filas] = await pool.query('SELECT COUNT(*) AS total FROM Producto WHERE idEmprendimiento = ?;', [idEmprendimiento]);
    return Number(filas[0].total);
};

// Alta (la foto ya está guardada; pathFoto puede ser null). Devuelve null si ya llegó al máximo.
export const modelCrearProducto = async (idEmprendimiento, datos, pathFoto, datosAuditoria) => {
    return ejecutarConAuditoria(datosAuditoria, async (conexion) => {
        // FOR UPDATE bloquea los productos del emprendimiento para que dos altas a la vez no pasen el límite
        const [existentes] = await conexion.query(
            'SELECT idProducto FROM Producto WHERE idEmprendimiento = ? FOR UPDATE;',
            [idEmprendimiento]
        );
        if (existentes.length >= MAXIMO_PRODUCTOS) return null;

        const [resultado] = await conexion.query(
            'INSERT INTO Producto (idEmprendimiento, Nombre, Precio, Descripcion, PathFoto) VALUES (?, ?, ?, ?, ?);',
            [idEmprendimiento, datos.nombre, datos.precio, datos.descripcion, pathFoto]
        );
        return resultado.insertId;
    });
};

export const modelEditarProducto = async (idProducto, idEmprendimiento, datos, pathFoto, datosAuditoria) => {
    return ejecutarConAuditoria(datosAuditoria, async (conexion) => {
        const [resultado] = await conexion.query(
            `UPDATE Producto SET Nombre = ?, Precio = ?, Descripcion = ?, PathFoto = ?
             WHERE idProducto = ? AND idEmprendimiento = ?;`,
            [datos.nombre, datos.precio, datos.descripcion, pathFoto, idProducto, idEmprendimiento]
        );
        return resultado.affectedRows;
    });
};

// Mostrar u ocultar (la API no tiene permiso de DELETE)
export const modelCambiarEstadoProducto = async (idProducto, idEmprendimiento, activo, datosAuditoria) => {
    return ejecutarConAuditoria(datosAuditoria, async (conexion) => {
        const [resultado] = await conexion.query(
            'UPDATE Producto SET Activo = ? WHERE idProducto = ? AND idEmprendimiento = ?;',
            [activo, idProducto, idEmprendimiento]
        );
        return resultado.affectedRows;
    });
};
