import { pool } from '../config/db.js';

export const ModelRegistrarEmpleado = async (datosEmpleado, datosAuditoria) => {
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?;', [datosAuditoria.idUsuario]);
        await conexion.query('SET @usuario_ip = ?;', [datosAuditoria.ipCliente]);

        const [resultado] = await conexion.query(
            `INSERT INTO Empleado
                (Nombre, Apellido, DNI, Domicilio, Teléfono, Correo, Cargo, Activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                datosEmpleado.nombre,
                datosEmpleado.apellido,
                datosEmpleado.dni,
                datosEmpleado.domicilio,
                datosEmpleado.telefono,
                datosEmpleado.correo,
                datosEmpleado.cargo,
                datosEmpleado.activo
            ]
        );

        await conexion.commit();
        return resultado.insertId;
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

export const ModelListarEmpleadosAdministracion = async () => {
    const [filas] = await pool.query(`
        SELECT
            e.idEmpleado,
            e.Nombre,
            e.Apellido,
            e.DNI,
            e.Domicilio,
            e.Teléfono AS Telefono,
            e.Correo,
            e.Cargo,
            e.Activo,
            u.TipoUsuario AS TipoUsuarioWeb,
            u.Activa AS UsuarioActivo
        FROM Empleado e
        LEFT JOIN Usuario u ON u.idEmpleado = e.idEmpleado
        ORDER BY e.Apellido, e.Nombre
    `);

    return filas;
};

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