import { pool } from '../config/db.js';

// El modelo solo se encarga de tirar la query a la base de datos
export const ModelObtenerEtiquetas = async (filtroEstado, idUsuario, ipCliente) => {
    await pool.query("SET @usuario_id = ?;", [idUsuario]);
    await pool.query("SET @usuario_ip = ?;", [ipCliente]);
    
    let querySQL = 'SELECT * FROM Etiqueta';
    
    if (filtroEstado === 'activas') {
        querySQL += ' WHERE Activa = 1';
    } else if (filtroEstado === 'inactivas') {
        querySQL += ' WHERE Activa = 0';
    }
    
    const [filas] = await pool.query(querySQL);
    return filas; // Devuelve los datos puros al controlador
};