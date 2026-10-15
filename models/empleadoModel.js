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

export const ModelActualizarEmpleadoAdministracion = async (idEmpleado, datosEmpleado, datosAuditoria) => {
    const conexion = await pool.getConnection();
    const tipoUsuarioPorCargo = {
        'Mesa de Entrada': 'Empleado de Mesa',
        'Técnico': 'Empleado de Area',
        'Social': 'Empleado de Area',
        'Administrador': 'Administrador'
    };

    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?;', [datosAuditoria.idUsuario]);
        await conexion.query('SET @usuario_ip = ?;', [datosAuditoria.ipCliente]);

        const [filas] = await conexion.query(
            `SELECT e.idEmpleado, e.Activo, e.Cargo, u.idUsuario, u.TipoUsuario, u.Activa AS UsuarioActivo
             FROM Empleado e
             LEFT JOIN Usuario u ON u.idEmpleado = e.idEmpleado
             WHERE e.idEmpleado = ?
             FOR UPDATE`,
            [idEmpleado]
        );

        if (filas.length === 0) {
            const error = new Error('No se encontró el empleado seleccionado.');
            error.code = 'EMPLOYEE_NOT_FOUND';
            throw error;
        }
        if (filas.length > 1) {
            const error = new Error('El empleado tiene más de una cuenta web asociada; se requiere revisar el vínculo antes de modificarlo.');
            error.code = 'MULTIPLE_USER_ACCOUNTS';
            throw error;
        }

        const actual = filas[0];
        const tipoUsuarioNuevo = tipoUsuarioPorCargo[datosEmpleado.cargo];

        await conexion.query(
            `UPDATE Empleado
             SET Nombre = ?, Apellido = ?, DNI = ?, Domicilio = ?, Teléfono = ?, Correo = ?, Cargo = ?, Activo = ?
             WHERE idEmpleado = ?`,
            [
                datosEmpleado.nombre,
                datosEmpleado.apellido,
                datosEmpleado.dni,
                datosEmpleado.domicilio,
                datosEmpleado.telefono,
                datosEmpleado.correo,
                datosEmpleado.cargo,
                datosEmpleado.activo,
                idEmpleado
            ]
        );

        if (actual.idUsuario) {
            await conexion.query(
                'UPDATE Usuario SET Correo = ?, TipoUsuario = ? WHERE idUsuario = ?',
                [datosEmpleado.correo, tipoUsuarioNuevo, actual.idUsuario]
            );

            const fueReactivado = Number(actual.Activo) === 0 && datosEmpleado.activo === 1;
            const nuevoEstadoUsuario = datosEmpleado.activo === 0 || fueReactivado
                ? 0
                : Number(actual.UsuarioActivo);
            if (Number(actual.UsuarioActivo) !== nuevoEstadoUsuario) {
                await conexion.query(
                    'UPDATE Usuario SET Activa = ? WHERE idUsuario = ?',
                    [nuevoEstadoUsuario, actual.idUsuario]
                );
            }
        }

        await conexion.commit();
        return { tipoUsuarioNuevo, cuentaWebActualizada: Boolean(actual.idUsuario) };
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

const construirFiltrosEmpleados = (filtros) => {
    const condiciones = [];
    const parametros = [];

    if (filtros.cargo) {
        condiciones.push('e.Cargo = ?');
        parametros.push(filtros.cargo);
    }
    if (filtros.activo !== null) {
        condiciones.push('e.Activo = ?');
        parametros.push(filtros.activo);
    }
    if (filtros.tipoCuenta === 'Sin cuenta') {
        condiciones.push('u.idUsuario IS NULL');
    } else if (filtros.tipoCuenta) {
        condiciones.push('u.TipoUsuario = ?');
        parametros.push(filtros.tipoCuenta);
    }
    if (filtros.buscar) {
        const termino = `%${filtros.buscar}%`;
        condiciones.push(`(
            e.Nombre LIKE ?
            OR e.Apellido LIKE ?
            OR CONCAT_WS(' ', e.Nombre, e.Apellido) LIKE ?
            OR e.Correo LIKE ?
        )`);
        parametros.push(termino, termino, termino, termino);
    }
    if (filtros.dni) {
        condiciones.push('e.DNI LIKE ?');
        parametros.push(`%${filtros.dni}%`);
    }

    return {
        sql: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '',
        parametros
    };
};

const fromEmpleadosAdministracion = `
    FROM Empleado e
    LEFT JOIN Usuario u ON u.idEmpleado = e.idEmpleado
`;

export const ModelContarEmpleadosAdministracion = async (filtros = {}) => {
    const condiciones = construirFiltrosEmpleados(filtros);
    const [filas] = await pool.query(
        `SELECT COUNT(DISTINCT e.idEmpleado) AS total
         ${fromEmpleadosAdministracion}
         ${condiciones.sql}`,
        condiciones.parametros
    );

    return Number(filas[0].total);
};

export const ModelListarEmpleadosAdministracion = async (filtros = {}, limite = 10, offset = 0) => {
    const condiciones = construirFiltrosEmpleados(filtros);
    const orden = filtros.orden === 'desc' ? 'DESC' : 'ASC';
    const [filas] = await pool.query(
        `SELECT
            e.idEmpleado,
            e.Nombre,
            e.Apellido,
            e.DNI,
            e.Domicilio,
            e.Teléfono AS Telefono,
            e.Correo,
            e.Cargo,
            e.Activo,
            GROUP_CONCAT(DISTINCT u.TipoUsuario ORDER BY u.TipoUsuario SEPARATOR ', ') AS TipoUsuarioWeb,
            MAX(u.Activa) AS UsuarioActivo
         ${fromEmpleadosAdministracion}
         ${condiciones.sql}
         GROUP BY e.idEmpleado, e.Nombre, e.Apellido, e.DNI, e.Domicilio, e.Teléfono, e.Correo, e.Cargo, e.Activo
         ORDER BY LOWER(e.Nombre) ${orden}, LOWER(e.Apellido) ASC, e.idEmpleado ASC
         LIMIT ? OFFSET ?`,
        [...condiciones.parametros, limite, offset]
    );

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