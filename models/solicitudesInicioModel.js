import { pool } from '../config/db.js';

// 1. Buscar las solicitudes iniciales que NO tienen asignado un expediente electrónico todavía
export const ModelObtenerSinExpediente = async () => {
    // Hacemos un LEFT JOIN con Expediente. Si no existe expediente, las columnas de la tabla Expediente vendrán como NULL.
    // También seleccionamos CorreoVal (que identifica al Emprendedor) y la FechaRecibidoMesa según tus campos reales.
    const querySQL = `
        SELECT 
            s.idSolicitudInicio, 
            s.CorreoVal AS Emprendedor, 
            s.FechaRecibidoMesa AS FechaRecibido, 
            s.DireccionPDF 
        FROM SolicitudInicio s
        LEFT JOIN Expediente e ON s.idSolicitudInicio = e.idSolicitudInicio
        WHERE e.NroExpediente IS NULL;
    `;
    const [filas] = await pool.query(querySQL);
    return filas;
};

// 2. Insertar el expediente en su respectiva tabla y activar los Triggers de Auditoría
export const ModelAsignarExpediente = async (idSolicitud, nroExpediente, idUsuario, ipCliente) => {
    await pool.query("SET @usuario_id = ?;", [idUsuario]);
    await pool.query("SET @usuario_ip = ?;", [ipCliente]);

    const querySQL = `
        INSERT INTO Expediente (NroExpediente, idSolicitudInicio, FechaCarga, idEmpleadoCargo)
        VALUES (?, ?, NOW(), ?);
    `;
    
    const [resultado] = await pool.query(querySQL, [nroExpediente, idSolicitud, idUsuario]);
    
    // Para mantener la compatibilidad con el controlador que verifica "affectedRows"
    return resultado;
};

//////////////////////////////////////////////////////////////////////////////////////////////
// MODELO PARA EMPLEADO DE AREA/ADMIN
////////////////////////////////////7/////////////////////////////////////////////////////////
// Recupera solicitudes con expediente que no han finalizado su revisión
export const ModelObtenerSolicitudesParaArea = async () => {
    const querySQL = `
        SELECT s.*, e.NroExpediente, e.FechaCarga
        FROM SolicitudInicio s
        INNER JOIN Expediente e ON s.idSolicitudInicio = e.idSolicitudInicio
        WHERE s.FechaRecibidoArea IS NOT NULL 
          AND (s.idEmpleadoTecRevisor IS NULL OR s.idEmpleadoSocRevisor IS NULL)
        ORDER BY s.FechaRecibidoArea ASC;
    `;
    const [filas] = await pool.query(querySQL);
    return filas;
};
// Recupera los empleados activos de un cargo específico junto con su idUsuario
export const ModelObtenerEmpleadosPorCargo = async (cargo) => {
    const querySQL = `
        SELECT u.idUsuario, e.Nombre, e.Apellido 
        FROM Empleado e
        INNER JOIN Usuario u ON e.idEmpleado = u.idEmpleado
        WHERE e.Cargo = ? AND e.Activo = 1;
    `;
    const [filas] = await pool.query(querySQL, [cargo]);
    return filas;
};