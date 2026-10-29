// etiquetasModel.js

import { pool, consultaConAuditoria } from '../config/db.js';

// El modelo solo se encarga de tirar la query a la base de datos
export const ModelObtenerEtiquetas = async (filtroEstado, idUsuario, ipCliente) => {
    /*await pool.query("SET @usuario_id = ?;", [idUsuario]);
    await pool.query("SET @usuario_ip = ?;", [ipCliente]);*/
    
    let querySQL = 'SELECT * FROM Etiqueta';
    
    if (filtroEstado === 'activas') {
        querySQL += ' WHERE Activa = 1';
    } else if (filtroEstado === 'inactivas') {
        querySQL += ' WHERE Activa = 0';
    }
    
    const [filas] = await pool.query(querySQL);
    return filas; // Devuelve los datos puros al controlador
};

// El modelo ejecuta de forma segura el UPDATE parametrizado contra la tabla Etiqueta
export const ModelActualizarEtiqueta = async (idEtiqueta, nuevoNombre, nuevoEstado, idUsuario, ipCliente) => {
    
    // 🔒 Misma conexión para las variables de sesión y el UPDATE: así el Trigger
    // registra quién modificó el registro y desde qué IP
    const querySQL = `
        UPDATE Etiqueta
        SET Nombre = ?, Activa = ?
        WHERE idEtiqueta = ?;
    `;

    // Retorna metadatos como affectedRows al controlador
    return consultaConAuditoria({ idUsuario, ipCliente }, querySQL, [nuevoNombre, nuevoEstado, idEtiqueta]);
};