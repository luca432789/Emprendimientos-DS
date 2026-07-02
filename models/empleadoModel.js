import { pool } from '../config/db.js';

// Recupera los empleados activos de un cargo específico junto con su idUsuario
export const ModelObtenerEmpleadosPorCargo = async (idUsuarioLogueado) => {
    const querySQL = `
        SELECT u.idUsuario, e.Nombre, e.Apellido 
        FROM Empleado e
        INNER JOIN Usuario u ON e.idEmpleado = u.idEmpleado
        WHERE e.Activo = 1 
          AND u.idUsuario != ? -- Excluye al usuario activo
          AND e.Cargo = (
              SELECT CASE 
                  WHEN emp_actual.Cargo = 'Técnico' THEN 'Social'
                  WHEN emp_actual.Cargo = 'Social' THEN 'Técnico'
                  ELSE 'Ninguno'
              END
              FROM Usuario usr_actual
              INNER JOIN Empleado emp_actual ON usr_actual.idEmpleado = emp_actual.idEmpleado
              WHERE usr_actual.idUsuario = ?
          );
    `;
    // Pasamos el idUsuarioLogueado para el filtro y para la subconsulta de cargo
    const [filas] = await pool.query(querySQL, [idUsuarioLogueado, idUsuarioLogueado]);
    return filas;
};